import { detectIntent } from "./intentDetector.js";
import InventoryService from "../dbServices/inventoryService.js";
import SaleService from "../dbServices/saleServices.js";
import ExpenseService from "../dbServices/expenseService.js";
import UserServices from "../dbServices/userServices.js";
import { BehaviouralAnalyzerAndDecisionMaker } from "./conclusionMaker.js";
import creditScorer from "./creditScorer.js";
import Sale from "../../models/sale.js";
import expense from "../../models/expense.js";
import activityHistory from "../../models/activityHistory.js";
import PendingInteraction from "../../models/pendingInteraction.js";

export async function messageProcessor(message, phoneNumber) {
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
    const phaseOneResult = await detectIntent({ text: message, previousContext });

    // Handle State Clearing (Unrelated message)
    if (phaseOneResult.intent === "UNRELATED") {
        await logUnresolvedInteraction(userId, pending);
        await pending.destroy();
        // Recurse to process the new message as fresh
        return await messageProcessor(message, phoneNumber);
    }

    // Handle data request (Phase 1 incomplete)
    if (phaseOneResult.action === "REQUEST_DATA") {
        if (pending) {
            // Update pending state
            await pending.update({
                originalMessage: pending.originalMessage + " | " + message,
                extractedData: phaseOneResult,
                suggestedResponse: phaseOneResult.suggested_response
            });
        } else {
            // Create new pending state
            await PendingInteraction.create({
                userId,
                originalMessage: message,
                intent: phaseOneResult.intent,
                extractedData: phaseOneResult,
                suggestedResponse: phaseOneResult.suggested_response
            });
        }
        return phaseOneResult.suggested_response;
    }

    // If we reached here and had a pending state, it means it's now resolved
    if (pending) {
        await pending.destroy();
    }

    if (phaseOneResult.intent === "GET_HELP") {
        return phaseOneResult.suggested_response;
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
            rawMessages: [message],
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
    }
    // Add more context as needed (e.g., recent sales)
    return context;
}

async function executeWriteOperation(userId, intent, phaseTwo) {
    const data = phaseTwo.finalData;
    switch (intent) {
        case "RECORD_SALE":
            await SaleService.addSale({
                productId: data.productId,
                userId,
                quantity: data.quantitySold,
                amountPaid: data.amountPaid,
                paymentSource: data.paymentSource,
                verified: phaseTwo.verified,
                confidenceScore: phaseTwo.confidenceScore
            });
            break;
        case "UPDATE_STOCK":
            await InventoryService.updateItem(data.productId, data.quantityAdded);
            break;
        case "NEW_PRODUCT":
            await InventoryService.addItem({
                ...data,
                userId
            });
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
            if (phaseOne.action === "RETURN_ENTIRE_INVENTORY") {
                const inventory = await InventoryService.getInventoryByUserId(userId);
                return formatInventoryResponse(inventory);
            }
            break;
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
        default:
            return "I no understand that one yet, but I dey learn.";
    }
}

async function handleRecallEvent(userId, phaseOne) {
    const { type, timeStamp } = phaseOne;
    let data;
    if (type === "sale") {
        data = await SaleService.findSales({ productName: phaseOne.productName });
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