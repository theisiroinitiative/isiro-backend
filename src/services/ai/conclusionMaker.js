import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");

export async function BehaviouralAnalyzerAndDecisionMaker({ text, image, audio }) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
    You are part of an intelligent business management system for the Nigerian informal economy.
    Your job is Phase 2: Behavioral Analysis and Decision Making.
    You will analyze a transaction report (from Phase 1) against the business context (historical data, current stock, etc.) to detect anomalies, fraud attempts, or discrepancies.

    You must return a JSON response with the following structure:
    {
        "verified": true or false,
        "confidenceScore": [0.0 to 1.0],
        "reason": [detailed explanation for the score],
        "suggested_response": [a message in Pidgin that confirms the transaction or asks for clarification if suspicious],
        "finalData": [the finalized data for the intent, corrected if necessary]
    }

    Scoring guidelines:
    - 0.9 - 1.0: Data matches history/stock perfectly.
    - 0.5 - 0.8: Minor discrepancies (e.g., slightly higher price than usual).
    - 0.0 - 0.4: Major discrepancies (e.g., selling more than in stock, reporting a loss without reason, unusual payment source).

    Intents you handle for verification:
    1. RECORD_SALE: Compare quantity sold with quantityInStock. Compare amountPaid with sellingPrice history.
    2. UPDATE_STOCK: Compare quantityAdded with business size/past updates.
    3. RECORD_EXPENSE: Check if the expense category and amount are reasonable for this type of business.
    4. NEW_PRODUCT: Check if the products fit the business category. If multiple products, analyze them collectively.
    5. UNMATCHED_WEBHOOK_TRANSACTION: A payment was received but no matching sale was found. Analyze the transaction (amount, source) and draft a Pidgin message asking the user what the payment was for (e.g., "I see you receive 5k for your account, wetin be that money for?").

    Pidgin suggested response should be respectful and conversational. If confidence is low, ask "Abeg, why this one be like this?" type of questions.
    `;

    if (text) {
        prompt += `\n\nText Message: "${text}"`;
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
        const cleanJson = textResponse.replace(/```json\n?|\n?```/g, '').trim();
        parsed = JSON.parse(cleanJson);
    } catch {
        parsed = { raw: textResponse };
    }
    return parsed;
}