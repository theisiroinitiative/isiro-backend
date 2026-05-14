import accountService from "../services/virtualAccountServices.js";
import { createSquadVirtualAccount } from "../utils/squadAPI.js";
import crypto from "crypto";

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
                withdrawal_pin
            } = req.body;
            const customer_identifier = generateCustomerIdentifier();

            // Validate mandatory fields for Squad API and our DB
            const requiredFields = [
                'first_name', 'last_name', 'middle_name', 'mobile_num',
                'dob', 'email', 'bvn', 'gender', 'address', 'beneficiary_account'
            ];
            const missingFields = requiredFields.filter(field => !req.body[field]);

            if (missingFields.length > 0) {
                return res.status(400).json({
                    message: `Validation Failure, Missing required fields: ${missingFields.join(', ')}`
                });
            }

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

            // Store the virtual account info in the database according to the schema
            const dbAccount = await accountService.createAccount({
                userId,
                accountId: squadResponse.customer_identifier,
                accountName: `${squadResponse.first_name} ${squadResponse.last_name}`,
                accountNumber: squadResponse.virtual_account_number,
                beneficiary_account: beneficiary_account,
                withdrawal_pin: withdrawal_pin,
                bankName: "GTBank", // Squad virtual accounts are usually domiciled in GTBank
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
                hash = crypto.createHmac('sha512', secretKey).update(JSON.stringify(payload)).digest('hex');
            }

            if (hash !== signature) {
                return res.status(401).json({ response_code: 401, response_description: 'Invalid signature' });
            }

            // Valid webhook, process the transaction
            if (payload.transaction_indicator === 'C') {
                // Determine the amount to credit (settled amount if available, otherwise principal)
                const amount = payload.settled_amount || payload.principal_amount;
                await accountService.creditAccountByAccountNumber(payload.virtual_account_number, amount);
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