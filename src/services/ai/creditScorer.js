import Sale from '../../models/sale.js';
import Inventory from '../../models/inventory.js';
import activityHistory from '../../models/activityHistory.js';
import { Op } from 'sequelize';

class CreditScorer {
    /**
     * Calculate credit score for a user (300-850)
     * Weights:
     * - Verified Inflow (45%)
     * - Inventory Turnover (25%)
     * - Discipline (20%)
     * - Data Integrity (10%)
     */
    async calculateScore(userId) {
        const [verifiedInflow, inventoryTurnover, discipline, dataIntegrity] = await Promise.all([
            this.getVerifiedInflowScore(userId),
            this.getInventoryTurnoverScore(userId),
            this.getDisciplineScore(userId),
            this.getDataIntegrityScore(userId)
        ]);

        const totalScore = (verifiedInflow * 0.45) + (inventoryTurnover * 0.25) + (discipline * 0.20) + (dataIntegrity * 0.10);
        
        // Map 0-1 score to 300-850
        const creditScore = Math.round(300 + (totalScore * 550));
        return creditScore;
    }

    async getVerifiedInflowScore(userId) {
        const sales = await Sale.findAll({ where: { userId } });
        if (sales.length === 0) return 0.5; // Neutral start

        const totalValue = sales.reduce((acc, s) => acc + s.amountPaid, 0);
        const verifiedValue = sales.filter(s => s.verified).reduce((acc, s) => acc + s.amountPaid, 0);

        return totalValue > 0 ? verifiedValue / totalValue : 0.5;
    }

    async getInventoryTurnoverScore(userId) {
        // Simple turnover: sales volume vs current stock
        const totalSalesVolume = await Sale.sum('quantity', { where: { userId } }) || 0;
        const totalCurrentStock = await Inventory.sum('quantityInStock', { where: { userId } }) || 1;

        const ratio = totalSalesVolume / (totalSalesVolume + totalCurrentStock);
        return Math.min(ratio * 2, 1); // Cap at 1
    }

    async getDisciplineScore(userId) {
        // Consistency: how many days in the last 30 days had activities
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const activities = await activityHistory.findAll({
            where: {
                userId,
                timeStamp: { [Op.gte]: thirtyDaysAgo }
            },
            attributes: ['timeStamp']
        });

        const uniqueDays = new Set(activities.map(a => a.timeStamp.toISOString().split('T')[0])).size;
        return uniqueDays / 30; // 1.0 if recorded every day
    }

    async getDataIntegrityScore(userId) {
        // Ratio of activities that were verified vs total activities
        const total = await activityHistory.count({ where: { userId } });
        if (total === 0) return 0.5;

        const verified = await activityHistory.count({ where: { userId, verified: true } });
        const unresolved = await activityHistory.count({ 
            where: { 
                userId, 
                verified: false,
                phaseTwo_result: {
                    status: 'UNRESOLVED'
                }
            } 
        });

        // Penalize unresolved interactions
        const baseScore = verified / total;
        const penalty = (unresolved / total) * 0.5; // Up to 50% penalty of the integrity portion
        return Math.max(baseScore - penalty, 0);
    }
}

export default new CreditScorer();
