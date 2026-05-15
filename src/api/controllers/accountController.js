import accountService from "../../services/dbServices/virtualAccountServices.js";
import transferService from "../../services/dbServices/transferService.js";
import { createSquadVirtualAccount, lookupAccount, fundTransfer } from "../../services/squad/squadAPI.js";
import { generateCustomerIdentifier } from "../../utils/otpGenerator.js";
import webhookProcessor from "../../services/ai/webhookProcessor.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";

class AccountController {
    async createAccount(req, res) {
        try {
            const userId = req.user.id;
            const {
                first_name,
                last_name,
                middle_name,
                mobile_num,
                dob,
                email,
                bvn,
                gender,
                address,
                beneficiary_account,
                beneficiary_bank_code,
                withdrawal_pin
            } = req.body;
            const customer_identifier = generateCustomerIdentifier();

            // Validate mandatory fields for Squad API and our DB
            const requiredFields = [
                'first_name', 'last_name', 'middle_name', 'mobile_num',
                'dob', 'email', 'bvn', 'gender', 'address', 'beneficiary_account',
                'beneficiary_bank_code', 'withdrawal_pin'
            ];
            const missingFields = requiredFields.filter(field => !req.body[field]);

            if (missingFields.length > 0) {
                return res.status(400).json({
                    message: `Validation Failure, Missing required fields: ${missingFields.join(', ')}`
                });
            }

            // Hash the withdrawal PIN before storing
            const hashedPin = await bcrypt.hash(withdrawal_pin, 10);

            const squadResponse = await createSquadVirtualAccount({
                user_id: userId,
                first_name,
                last_name,
                middle_name,
                mobile_num,
                dob,
                email,
                bvn,
                gender,
                address,
                customer_identifier,
                beneficiary_account
            });

            // Store the virtual account info in the database
            const dbAccount = await accountService.createAccount({
                userId,
                accountId: squadResponse.customer_identifier,
                accountName: `${squadResponse.first_name} ${squadResponse.last_name}`,
                accountNumber: squadResponse.virtual_account_number,
                beneficiary_account,
                beneficiary_bank_code,
                withdrawal_pin: hashedPin,
                bankName: squadResponse.bank || "GTBank",
                balance: 0.00
            });

            res.status(201).json({
                message: "Virtual account created successfully",
                data: dbAccount
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async updateBalance(req, res) {
        try {
            const account = await accountService.updateBalance(req.params.id, req.body.balance);
            res.status(200).json(account);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async updateAccountInfo(req, res) {
        try {
            const account = await accountService.updateAccountInfo(req.params.id, req.body);
            res.status(200).json(account);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async deleteAccount(req, res) {
        try {
            const account = await accountService.deleteAccount(req.params.id);
            res.status(200).json(account);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // ─── Account Lookup (Verify recipient before transfer) ───────────────

    async lookupBankAccount(req, res) {
        try {
            const { bank_code, account_number } = req.body;
            if (!bank_code || !account_number) {
                return res.status(400).json({ message: 'bank_code and account_number are required' });
            }

            const result = await lookupAccount(bank_code, account_number);
            res.status(200).json({
                message: 'Account lookup successful',
                data: result
            });
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    // ─── Withdraw Funds ─────────────────────────────────────────────────

    async withdrawFunds(req, res) {
        try {
            const userId = req.user.id;
            const { amount, withdrawal_pin, bank_code, account_number, account_name, remark } = req.body;

            if (!amount || !withdrawal_pin) {
                return res.status(400).json({ message: 'amount and withdrawal_pin are required' });
            }

            // Fetch user's virtual account
            const account = await accountService.getAccountByUserId(userId);
            if (!account) {
                return res.status(404).json({ message: 'Virtual account not found. Please create one first.' });
            }

            // Verify withdrawal PIN
            const pinMatch = await bcrypt.compare(withdrawal_pin, account.withdrawal_pin);
            if (!pinMatch) {
                return res.status(401).json({ message: 'Invalid withdrawal PIN' });
            }

            // Check sufficient balance
            const currentBalance = parseFloat(account.balance);
            if (currentBalance < parseFloat(amount)) {
                return res.status(400).json({
                    message: `Insufficient balance. Current balance: ₦${currentBalance.toLocaleString()}`
                });
            }

            // Use provided bank details or fall back to stored beneficiary
            const destBankCode = bank_code || account.beneficiary_bank_code;
            const destAccountNumber = account_number || account.beneficiary_account;
            const destAccountName = account_name || account.accountName;

            if (!destBankCode || !destAccountNumber) {
                return res.status(400).json({ message: 'Destination bank details are required (bank_code, account_number)' });
            }

            // Generate unique transaction reference
            const txRef = `WD_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

            // Create pending transfer record
            const transfer = await transferService.createTransfer({
                userId,
                virtualAccountId: account.id,
                amount: parseFloat(amount),
                bank_code: destBankCode,
                account_number: destAccountNumber,
                account_name: destAccountName,
                transaction_reference: txRef,
                remark: remark || `Isiro Withdrawal - ${destAccountName}`,
                status: 'PENDING'
            });

            let balanceDebited = false;
            try {
                // 1. Debit local balance FIRST to reserve the funds
                await accountService.debitAccount(account.id, parseFloat(amount));
                balanceDebited = true;

                // 2. Call Squad Transfer API
                const squadResult = await fundTransfer({
                    transaction_reference: txRef,
                    amount: parseFloat(amount),
                    bank_code: destBankCode,
                    account_number: destAccountNumber,
                    account_name: destAccountName,
                    remark: remark || `Isiro Withdrawal - ${destAccountName}`
                });

                // 3. Keep as PENDING (webhook will finalize)
                await transferService.updateTransferStatus(transfer.id, 'PENDING', squadResult);

                res.status(200).json({
                    message: 'Withdrawal successful',
                    data: {
                        amount: parseFloat(amount),
                        destination: destAccountNumber,
                        reference: txRef,
                        new_balance: currentBalance - parseFloat(amount)
                    }
                });
            } catch (transferError) {
                // If we debited the balance but the API call failed, refund the user
                if (balanceDebited) {
                    await accountService.creditAccount(account.id, parseFloat(amount));
                }
                
                await transferService.updateTransferStatus(transfer.id, 'FAILED', { error: transferError.message });
                res.status(502).json({
                    message: `Transfer failed: ${transferError.message}. Your balance has been restored if it was affected.`
                });
            }
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // ─── Transfer History ───────────────────────────────────────────────

    async getTransferHistory(req, res) {
        try {
            const transfers = await transferService.getTransfersByUserId(req.user.id);
            res.status(200).json({ data: transfers });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // ─── Account Balance ────────────────────────────────────────────────

    async getBalance(req, res) {
        try {
            const account = await accountService.getAccountByUserId(req.user.id);
            if (!account) {
                return res.status(404).json({ message: 'Virtual account not found' });
            }
            res.status(200).json({
                data: {
                    balance: parseFloat(account.balance),
                    accountNumber: account.accountNumber,
                    accountName: account.accountName,
                    bankName: account.bankName
                }
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // ─── Squad Webhook ──────────────────────────────────────────────────

    async squadWebhook(req, res) {
        try {
            const signature = req.headers['x-squad-signature'];
            if (!signature) {
                return res.status(400).json({ response_code: 400, response_description: 'Signature missing' });
            }

            const secretKey = process.env.SQUAD_SECRET_KEY || 'user_sk_sample-secret-key-1';
            const payload = req.body;
            let hash;

            // Handle Version 3 webhook hashing
            if (payload.version === 'v3') {
                const dataToHash = `${payload.transaction_reference}|${payload.virtual_account_number}|${payload.currency}|${payload.principal_amount}|${payload.settled_amount}|${payload.customer_identifier}`;
                hash = crypto.createHmac('sha512', secretKey).update(dataToHash).digest('hex');
            } else {
            // Handle Version 1 & 2 webhook hashing
                if (!req.rawBody) {
                    return res.status(500).json({ response_code: 500, response_description: 'Raw body missing for validation' });
                }
                hash = crypto.createHmac('sha512', secretKey).update(req.rawBody).digest('hex');
            }

            if (hash !== signature) {
                return res.status(401).json({ response_code: 401, response_description: 'Invalid signature' });
            }

            const eventType = payload.Event || payload.event;
            const body = payload.Body || payload;
            const txIndicator = body.transaction_indicator;

            // Valid webhook, process the transaction
            if (txIndicator === 'C' || eventType === 'charge_successful') {
                // Credit: incoming payment (Squad amounts are in Kobo, convert to Naira)
                const amountInKobo = parseFloat(body.settled_amount || body.principal_amount || body.amount);
                const amountInNaira = amountInKobo / 100;

                const vAccountNum = body.virtual_account_number;
                const txRef = body.transaction_reference || payload.TransactionRef;
                
                if (vAccountNum) {
                    await accountService.creditAccountByAccountNumber(vAccountNum, amountInNaira);

                    // Trigger AI-powered sale reconciliation
                    try {
                        await webhookProcessor.processTransaction({
                            squadTransactionRef: txRef,
                            accountNumber: vAccountNum,
                            amount: amountInNaira,
                            memo: body.merchant_amount_description || ''
                        });
                    } catch (reconciliationError) {
                        console.error('Reconciliation error:', reconciliationError.message);
                    }
                }
            } else if (txIndicator === 'D' || eventType === 'transfer.success' || eventType === 'transfer.failed') {
                // Debit: outgoing transfer confirmation
                const txRef = body.transaction_reference || payload.TransactionRef;
                const transfer = await transferService.getTransferByReference(txRef);
                
                if (transfer && transfer.status === 'PENDING') {
                    const newStatus = (eventType === 'transfer.failed') ? 'FAILED' : 'SUCCESS';
                    await transferService.updateTransferStatus(transfer.id, newStatus, payload);
                    
                    // If transfer failed after we debited their balance locally, refund them
                    if (newStatus === 'FAILED') {
                        await accountService.creditAccount(transfer.virtualAccountId, transfer.amount);
                    }
                }
            }

            res.status(200).json({
                response_code: 200,
                transaction_reference: payload.transaction_reference,
                response_description: 'Success'
            });
        } catch (error) {
            console.error('Webhook error:', error.message);
            res.status(500).json({
                response_code: 500,
                transaction_reference: req.body?.transaction_reference,
                response_description: 'System malfunction'
            });
        }
    }
}

export default new AccountController();
