import Sale from '../../models/sale.js';
import Inventory from '../../models/inventory.js';
import { Op } from 'sequelize';

class SaleServices {
    async addSale({ productId, userId, quantity, amountPaid, paymentSource, verified, confidenceScore }) {
        const inventoryItem = await Inventory.findByPk(productId);
        if (!inventoryItem) {
            throw new Error('Inventory item not found');
        }
        if (inventoryItem.quantityInStock < quantity) {
            throw new Error('Insufficient inventory');
        }
        
        // Deduct sold quantity from inventory atomically
        await inventoryItem.decrement('quantityInStock', { by: quantity });
        await inventoryItem.reload();

        // Calculate profitMade
        const profitMade = amountPaid - (inventoryItem.costPrice * quantity);

        // Create sale record
        const saleRecord = await Sale.create({
            productId,
            userId,
            quantity,
            amountPaid,
            paymentSource: paymentSource === 'TRANSFER' ? 'SQUADPAY' : 'CASH', // Mapping TRANSFER to SQUADPAY if needed
            verified,
            confidenceScore,
            profitMade,
            status: verified ? 'SUCCESS' : 'PENDING'
        });

        return saleRecord;
    }

    async findSales({ userId, productName, minPrice, maxPrice }) {
        // Filters: userId (UUID), productName (string), minPrice (number), maxPrice (number)
        const where = {};
        if (userId) where.userId = userId;
        if (minPrice !== undefined || maxPrice !== undefined) {
            where.amountPaid = {};
            if (minPrice !== undefined) where.amountPaid[Op.gte] = minPrice;
            if (maxPrice !== undefined) where.amountPaid[Op.lte] = maxPrice;
        }

        const include = [];
        if (productName) {
            include.push({
                model: Inventory,
                where: { productName },
                attributes: ['productName']
            });
        } else {
            include.push({
                model: Inventory,
                attributes: ['productName']
            });
        }

        return await Sale.findAll({
            where,
            include
        });
    }
}

export default new SaleServices();