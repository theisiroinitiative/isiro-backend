import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function detectIntent({ text, image, audio, previousContext }) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    let prompt = `
    You are a part of an intelligent business management system for
    the Nigerian informal economy. You can only return JSON as response.
    Expect messages in pidgin and a bit of native words. You must also
    be able to deal with incorrect spellings and texting acronyms.
    Your purpose is to detect the intent of a message. All messages 
    must be categorized into one of the following intents:

    1. 'UPDATE_STOCK' -> message shows the user wants to update stock of an existing product.
    Schema: { "intent": "UPDATE_STOCK", "phase": 1, "productName": [name], "quantityToAdd": [quantity] }
    If info is missing, return action: "REQUEST_DATA" with suggested_response in Pidgin.

    2. 'RECORD_SALE' -> message shows the user wants to record a sale.
    Schema: { "intent": "RECORD_SALE", "phase": 1, "productName": [name], "amountPaid": [amount], "quantity": [quantity], "paymentSource": ["CASH" or "TRANSFER"] }
    If info is missing, return action: "REQUEST_DATA" with suggested_response in Pidgin.

    3. 'RECORD_EXPENSE' -> message shows user wants to record a business expense.
    Schema: { "intent": "RECORD_EXPENSE", "phase": 1, "nameOfExpense": [name], "amount": [amount], "category": ["CAPITAL", "OPERATIONAL", "MISCELLANEOUS", "PERSONAL", "OTHERS"], "description": [desc] }
    If info is missing, return action: "REQUEST_DATA" with suggested_response in Pidgin.

    4. 'RECALL_EVENT' -> message shows user wants to get information about a past event (sale, expense, etc.).
    Schema: { "intent": "RECALL_EVENT", "type": ["sale", "expense", "inventory", "transaction"], "timeStamp": ["today", "yesterday", "specific date", etc.], "productName": [optional], "amount": [optional] }
    If info is missing, return action: "REQUEST_DATA" with suggested_response in Pidgin.

    5. 'NEW_PRODUCT' -> message shows user wants to register a new product.
    Schema: { "intent": "NEW_PRODUCT", "phase": 1, "productName": [name], "costPrice": [cost], "sellingPrice": [selling], "quantityInStock": [quantity] }
    If info is missing, return action: "REQUEST_DATA" with suggested_response in Pidgin.

    6. 'GET_BUSINESS_INFO' -> message shows user wants general business performance info (total sales, profit, etc.).
    Schema: { "intent": "GET_BUSINESS_INFO", "timeStamp": [time frame], "metric": ["sales", "profit", "expenses", "all"] }

    7. 'GET_INVENTORY_STATUS' -> message shows user wants an overview of inventory.
    Schema: { "intent": "GET_INVENTORY_STATUS", "products": [array of names or null for all] }
    If no products specified, return action: "RETURN_ENTIRE_INVENTORY".

    8. 'GET_ANALYSIS' -> message shows user wants in-depth insights (trends, credit score, advice).
    Schema: { "intent": "GET_ANALYSIS", "analyticPoints": [array of points like "credit score", "top products", "growth advice"] }

    9. 'GET_HELP' -> user is asking for help or how to use the system.
    Schema: { "intent": "GET_HELP", "suggested_response": [explanation in Pidgin] }

    --- STATEFULNESS & CONTEXT ---
    If a 'previousContext' is provided, it contains the 'intent' and 'extractedData' from a previous incomplete interaction.
    - Check if the new message provides the missing info for the 'previousContext.intent'.
    - If the previous intent was 'UNMATCHED_WEBHOOK_TRANSACTION' and the user explains what the money is for, convert the intent to 'RECORD_SALE' or 'RECORD_EXPENSE' (usually sale) and use the 'extractedData.amount' and 'extractedData.squadTransactionRef' from the context.
    - If it is related and provides more info, return the merged data with the original intent.
    - If the new message is UNRELATED (e.g., user starts a new topic), return: { "intent": "UNRELATED", "action": "CLEAR_STATE" }.
    `;

    if (text) {
        prompt += `\n\nNew Message: "${text}"`;
    }

    if (previousContext) {
        prompt += `\n\nPrevious Context: ${JSON.stringify(previousContext)}`;
    }

    // Prepare parts for multimodal input
    const parts = [{ text: prompt }];

    // Add image if present (expects base64 string)
    if (image) {
        parts.push({
            inlineData: {
                mimeType: image.mimeType || "image/jpeg",
                data: image.base64 // base64-encoded image string
            }
        });
    }

    // Add audio if present (expects base64 string)
    if (audio) {
        parts.push({
            inlineData: {
                mimeType: audio.mimeType || "audio/mpeg",
                data: audio.base64 // base64-encoded audio string
            }
        });
    }

    const result = await model.generateContent({ contents: [{ parts }] });
    const response = await result.response;
    const textResponse = response.text();

    let parsed;
    try {
        parsed = JSON.parse(textResponse);
    } catch {
        parsed = { raw: textResponse };
    }
    return parsed;
}