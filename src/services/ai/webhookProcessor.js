import Sale from '../../models/sale.js';
import virtualAccount from '../../models/virtual-accounts.js';
import User from '../../models/user.js';
import PendingInteraction from '../../models/pendingInteraction.js';
import { BehaviouralAnalyzerAndDecisionMaker } from './conclusionMaker.js';
import whatsappBotService from '../../whatsapp-agent/whatsappBotService.js';

class WebhookProcessor {
    async processTransaction(transaction) {
        const { squadTransactionRef, accountNumber, amount, memo } = transaction;

        // 1. Search for matching sale
        const sale = await Sale.findOne({ where: { squadTransactionRef } });
        if (sale) {
            await sale.update({
                verified: true,
                confidenceScore: 1.0,
                status: 'SUCCESS'
            });
            console.log(`Sale ${sale.id} verified via webhook.`);
            return;
        }

        // 2. No matching sale found - Link to User
        const account = await virtualAccount.findOne({ 
            where: { accountNumber },
            include: [{ model: User }]
        });

        if (!account || !account.User) {
            console.error(`No user found for account ${accountNumber}`);
            return;
        }

        const user = account.User;
        const userId = user.id;

        // 3. AI Analysis for Unmatched Transaction
        const phaseTwoResult = await BehaviouralAnalyzerAndDecisionMaker({
            text: JSON.stringify({
                intent: "UNMATCHED_WEBHOOK_TRANSACTION",
                transaction: { amount, squadTransactionRef, memo },
                businessInfo: { businessName: user.businessName, category: user.businessCategory }
            })
        });

        // 4. Store as Pending Interaction
        await PendingInteraction.create({
            userId,
            originalMessage: `WEBHOOK_PAYMENT: ${amount} (Ref: ${squadTransactionRef})`,
            intent: "UNMATCHED_WEBHOOK_TRANSACTION",
            extractedData: { amount, squadTransactionRef, memo },
            suggestedResponse: phaseTwoResult.suggested_response
        });

        // 5. Send WhatsApp Message
        const jid = `${user.phoneNumber}@s.whatsapp.net`;
        await whatsappBotService.sendMessage(jid, phaseTwoResult.suggested_response);
        
        console.log(`Unmatched transaction handled for user ${userId}. Message sent.`);
    }
}

export default new WebhookProcessor();
