import { detectIntent } from "./intentDetector.js";
import InventoryService from "../dbServices/inventoryService.js";
import SaleService from "../dbServices/saleServices.js";
import ExpenseService from "../dbServices/expenseService.js";
import UserServices from "../dbServices/userServices.js";
import accountService from "../dbServices/virtualAccountServices.js";
import transferService from "../dbServices/transferService.js";
import { BehaviouralAnalyzerAndDecisionMaker } from "./conclusionMaker.js";
import creditScorer from "./creditScorer.js";
import { fundTransfer } from "../squad/squadAPI.js";
import Sale from "../../models/sale.js";
import expense from "../../models/expense.js";
import activityHistory from "../../models/activityHistory.js";
import PendingInteraction from "../../models/pendingInteraction.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function messageProcessor(message, phoneNumber, _depth = 0) {
    const messageText = typeof message === 'string' ? message : (message.text || '');
    const user = await UserServices.getUserIdByPhone(phoneNumber);
    if (!user) {
        return "You are not a registered user. Please register to use our services.";
    }
    const userId = user.id;

    // Check for Pending Interaction
    const pending = await PendingInteraction.findOne({ where: { userId } });
    let previousContext = null;
    if (pending) {
        previousContext = {
            intent: pending.intent,
            extractedData: pending.extractedData
        };
    }

    // Phase 1: Intent Detection (with context)
    const phaseOneResult = await detectIntent({ text: messageText, image: message.image, audio: message.audio, previousContext });
    console.log('Phase 1 Result:', phaseOneResult);

    // Handle State Clearing (Unrelated message)
    if (phaseOneResult.intent === "UNRELATED") {
        if (pending) {
            await logUnresolvedInteraction(userId, pending);
            await pending.destroy();
        }
        // Guard against infinite recursion
        if (_depth >= 1) {
            return "I no understand that one. Try send your message again.";
        }
        // Recurse to process the new message as fresh
        return await messageProcessor(message, phoneNumber, _depth + 1);
    }

    // Handle data request (Phase 1 incomplete)
    if (phaseOneResult.action === "REQUEST_DATA") {
        if (pending) {
            // Update pending state
            await pending.update({
                originalMessage: pending.originalMessage + " | " + messageText,
                extractedData: phaseOneResult,
                suggestedResponse: phaseOneResult.suggested_response
            });
        } else {
            // Create new pending state
            await PendingInteraction.create({
                userId,
                originalMessage: messageText,
                intent: phaseOneResult.intent,
                extractedData: phaseOneResult,
                suggestedResponse: phaseOneResult.suggested_response
            });
        }
        return phaseOneResult.suggested_response;
    }

    // If we reached here and had a pending state, it means it's now resolved
    // EXCEPT for WITHDRAW_FUNDS which manages its own destruction to allow PIN retries
    if (pending && phaseOneResult.intent !== "WITHDRAW_FUNDS") {
        await pending.destroy();
    }

    if (phaseOneResult.intent === "GET_HELP") {
        return phaseOneResult.suggested_response;
    }

    // Handle WITHDRAW_FUNDS specially (two-phase PIN confirmation)
    if (phaseOneResult.intent === "WITHDRAW_FUNDS") {
        if (!phaseOneResult.withdrawal_pin) {
            if (pending) await pending.destroy(); // Clear old state before starting a new one

            // Phase 1: Have amount, need PIN confirmation
            const account = await accountService.getAccountByUserId(userId);
            if (!account) return "You never set up virtual account. Go register for account first.";

            const amount = parseFloat(phaseOneResult.amount);
            const balance = parseFloat(account.balance);
            if (balance < amount) {
                return `You no get enough money o. Your balance na ₦${balance.toLocaleString()} but you wan withdraw ₦${amount.toLocaleString()}.`;
            }

            // Create pending interaction to wait for PIN
            await PendingInteraction.create({
                userId,
                originalMessage: messageText,
                intent: "WITHDRAW_FUNDS",
                extractedData: { amount },
                suggestedResponse: `You wan withdraw ₦${amount.toLocaleString()} (Balance: ₦${balance.toLocaleString()}). Abeg enter your withdrawal PIN to confirm.`
            });

            return `You wan withdraw ₦${amount.toLocaleString()} from your account (Balance: ₦${balance.toLocaleString()}).\n\nAbeg enter your withdrawal PIN to confirm.`;
        } else {
            // Phase 2: Have both amount and PIN — execute withdrawal
            const resultMsg = await executeWithdrawal(userId, parseFloat(phaseOneResult.amount), phaseOneResult.withdrawal_pin);
            
            if (resultMsg.includes("❌ Wrong PIN")) {
                // Do NOT destroy pending, allow them to try again
                return resultMsg;
            } else {
                if (pending) await pending.destroy();
                return resultMsg;
            }
        }
    }

    // Prepare for Phase 2 if it's a write intent
    const writeIntents = ["RECORD_SALE", "UPDATE_STOCK", "RECORD_EXPENSE", "NEW_PRODUCT"];
    let finalResponse;

    if (writeIntents.includes(phaseOneResult.intent)) {
        // Fetch Context
        const context = await getBusinessContext(userId, phaseOneResult);

        // Phase 2: Anomaly Detection
        const phaseTwoResult = await BehaviouralAnalyzerAndDecisionMaker({
            text: JSON.stringify({ phaseOne: phaseOneResult, context })
        });
        console.log('Phase 2 Result:', phaseTwoResult);

        // Standardize finalData and ensure productId is present
        if (!phaseTwoResult.finalData) {
            phaseTwoResult.finalData = { ...phaseOneResult };
        }
        
        if (context.product && !phaseTwoResult.finalData.productId) {
            phaseTwoResult.finalData.productId = context.product.id;
            console.log('Injected productId from context:', context.product.id);
        }

        // Execute DB Operation
        await executeWriteOperation(userId, phaseOneResult.intent, phaseTwoResult);

        // Log Activity
        await activityHistory.create({
            userId,
            intent: phaseOneResult.intent,
            confidenceScore: phaseTwoResult.confidenceScore,
            verified: phaseTwoResult.verified,
            phaseOne_result: phaseOneResult,
            phaseTwo_result: phaseTwoResult,
            rawMessages: [messageText],
            suggestedResponses: [phaseTwoResult.suggested_response]
        });

        finalResponse = phaseTwoResult.suggested_response;
    } else {
        // Handle Read Intents (RECALL_EVENT, GET_BUSINESS_INFO, etc.)
        finalResponse = await handleReadOperation(userId, phaseOneResult);
    }

    return finalResponse;
}

async function getBusinessContext(userId, phaseOne) {
    const context = {};
    if (phaseOne.productName) {
        context.product = await InventoryService.getProductByName(userId, phaseOne.productName);
        console.log(`Context fetch for "${phaseOne.productName}":`, context.product ? 'FOUND' : 'NOT FOUND');
    }
    // Add more context as needed (e.g., recent sales)
    return context;
}

async function executeWriteOperation(userId, intent, phaseTwo) {
    const data = phaseTwo.finalData;
    console.log(`Executing write operation for intent: ${intent}`, data);

    switch (intent) {
        case "RECORD_SALE":
            await SaleService.addSale({
                productId: data.productId,
                userId,
                quantity: data.quantity || data.quantitySold,
                amountPaid: data.amountPaid || data.amount,
                paymentSource: data.paymentSource,
                verified: phaseTwo.verified,
                confidenceScore: phaseTwo.confidenceScore
            });
            break;
        case "UPDATE_STOCK":
            await InventoryService.updateItem(data.productId, data.quantityToAdd || data.quantityAdded);
            break;
        case "NEW_PRODUCT":
            // Handle both single object and array (for backward compatibility and new multi-product support)
            const products = Array.isArray(data) ? data : (Array.isArray(data.products) ? data.products : (data.productName ? [data] : []));
            for (const product of products) {
                await InventoryService.addItem({
                    ...product,
                    userId
                });
            }
            break;
        case "RECORD_EXPENSE":
            await ExpenseService.createExpense({
                ...data,
                userId,
                verified: phaseTwo.verified,
                confidenceScore: phaseTwo.confidenceScore
            });
            break;
    }
}

async function handleReadOperation(userId, phaseOne) {
    switch (phaseOne.intent) {
        case "GET_INVENTORY_STATUS":
            if (phaseOne.action === "RETURN_ENTIRE_INVENTORY" || !phaseOne.products) {
                const inventory = await InventoryService.getInventoryByUserId(userId);
                return formatInventoryResponse(inventory);
            } else {
                let response = "Here be your products:\n";
                for (const name of phaseOne.products) {
                    const product = await InventoryService.getProductByName(userId, name);
                    if (product) {
                        response += `- ${product.productName}: ${product.quantityInStock} left (₦${product.costPrice} cost)\n`;
                    } else {
                        response += `- ${name}: I no see this product for your inventory\n`;
                    }
                }
                return response;
            }
        case "GET_ANALYSIS":
            if (phaseOne.analyticPoints && phaseOne.analyticPoints.includes("credit score")) {
                const score = await creditScorer.calculateScore(userId);
                return `Your current credit score be ${score}. Keep recording your sales to improve am!`;
            }
            return "I go provide analysis for you soon, just keep recording.";
        case "RECALL_EVENT":
            return await handleRecallEvent(userId, phaseOne);
        case "GET_BUSINESS_INFO":
            return await handleBusinessInfo(userId, phaseOne);
        case "GET_BALANCE": {
            const account = await accountService.getAccountByUserId(userId);
            if (!account) return "You never set up virtual account. Go register for account first.";
            const bal = parseFloat(account.balance);
            return `Your account balance na ₦${bal.toLocaleString()}.\nAccount: ${account.accountNumber} (${account.bankName})`;
        }
        default:
            return "I no understand that one yet, but I dey learn.";
    }
}

async function handleRecallEvent(userId, phaseOne) {
    const { type, timeStamp } = phaseOne;
    let data;
    if (type === "sale") {
        data = await SaleService.findSales({ userId, productName: phaseOne.productName });
    } else if (type === "expense") {
        data = await ExpenseService.getExpensesByUserId(userId);
    }
    
    if (!data || data.length === 0) return `I no see any ${type} for that time.`;
    
    let response = `I see ${data.length} ${type}(s) for you:\n`;
    data.slice(0, 5).forEach(item => {
        if (type === "sale") response += `- Sold ${item.quantity} of ${item.Inventory?.productName || 'product'} for ${item.amountPaid}\n`;
        else response += `- Spent ${item.amount} on ${item.nameOfExpense}\n`;
    });
    return response;
}

async function handleBusinessInfo(userId, phaseOne) {
    const totalSales = await Sale.sum('amountPaid', { where: { userId } }) || 0;
    const totalExpenses = await expense.sum('amount', { where: { userId } }) || 0;
    const profit = totalSales - totalExpenses;
    
    return `Business update for you:\n- Total Sales: ${totalSales}\n- Total Expenses: ${totalExpenses}\n- Profit: ${profit}\n\nYou dey try!`;
}

async function logUnresolvedInteraction(userId, pending) {
    if (!pending) return;
    await activityHistory.create({
        userId,
        intent: pending.intent,
        confidenceScore: 0,
        verified: false,
        phaseOne_result: pending.extractedData,
        phaseTwo_result: { status: "UNRESOLVED", reason: "User started new interaction" },
        rawMessages: [pending.originalMessage],
        suggestedResponses: [pending.suggestedResponse]
    });
}

function formatInventoryResponse(inventory) {
    if (!inventory || inventory.length === 0) return "Your inventory empty, abeg add products.";
    let response = "Here be your inventory:\n";
    inventory.forEach(item => {
        response += `- ${item.productName}: ${item.quantityInStock} left\n`;
    });
    return response;
}

async function executeWithdrawal(userId, amount, pin) {
    const account = await accountService.getAccountByUserId(userId);
    if (!account) return "You never set up virtual account.";

    // Verify withdrawal PIN
    const pinMatch = await bcrypt.compare(pin, account.withdrawal_pin);
    if (!pinMatch) return "❌ Wrong PIN o. Try again abeg.";

    // Double-check balance
    const balance = parseFloat(account.balance);
    if (balance < amount) {
        return `You no get enough money. Your balance na ₦${balance.toLocaleString()}.`;
    }

    // Generate unique transaction reference
    const txRef = `WD_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    // Create pending transfer record
    const transfer = await transferService.createTransfer({
        userId,
        virtualAccountId: account.id,
        amount,
        bank_code: account.beneficiary_bank_code,
        account_number: account.beneficiary_account,
        account_name: account.accountName,
        transaction_reference: txRef,
        remark: `Isiro Withdrawal - ${account.accountName}`,
        status: 'PENDING'
    });

    let balanceDebited = false;
    try {
        // 1. Debit local balance FIRST to reserve the funds
        await accountService.debitAccount(account.id, amount);
        balanceDebited = true;

        // 2. Call Squad Transfer API
        const squadResult = await fundTransfer({
            transaction_reference: txRef,
            amount,
            bank_code: account.beneficiary_bank_code,
            account_number: account.beneficiary_account,
            account_name: account.accountName,
            remark: `Isiro Withdrawal - ${account.accountName}`
        });

        // 3. Keep as PENDING (webhook will finalize)
        await transferService.updateTransferStatus(transfer.id, 'PENDING', squadResult);

        const newBalance = balance - amount;
        return `✅ Withdrawal don go through!\n\n₦${amount.toLocaleString()} don send to ${account.beneficiary_account}.\nYour new balance na ₦${newBalance.toLocaleString()}.`;
    } catch (err) {
        // If we debited but API failed, refund
        if (balanceDebited) {
            await accountService.creditAccount(account.id, amount);
        }
        await transferService.updateTransferStatus(transfer.id, 'FAILED', { error: err.message });
        return `❌ Withdrawal no work: ${err.message}\nYour money still dey your account. Try again later.`;
    }
}