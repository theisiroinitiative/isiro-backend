import { Op } from 'sequelize';
import PendingInteraction from '../models/pendingInteraction.js';
import activityHistory from '../models/activityHistory.js';

export function startCronJobs() {
    console.log('⏳ Initializing background jobs...');

    // Run every 10 minutes
    setInterval(async () => {
        try {
            // Find interactions that haven't been updated in 15 minutes
            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
            
            const expiredInteractions = await PendingInteraction.findAll({
                where: {
                    updatedAt: {
                        [Op.lt]: fifteenMinutesAgo
                    }
                }
            });

            if (expiredInteractions.length > 0) {
                console.log(`🧹 Cleaning up ${expiredInteractions.length} expired pending interactions.`);

                for (const interaction of expiredInteractions) {
                    // Log as UNRESOLVED
                    await activityHistory.create({
                        userId: interaction.userId,
                        intent: interaction.intent,
                        confidenceScore: 0,
                        verified: false,
                        phaseOne_result: interaction.extractedData,
                        phaseTwo_result: { status: "UNRESOLVED", reason: "Interaction timed out by system" },
                        rawMessages: [interaction.originalMessage],
                        suggestedResponses: [interaction.suggestedResponse || ""]
                    });

                    // Silently destroy
                    await interaction.destroy();
                }
            }
        } catch (error) {
            console.error('Error during PendingInteraction cleanup job:', error.message);
        }
    }, 10 * 60 * 1000); // 10 minutes in milliseconds
}
