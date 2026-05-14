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
        
        // Deduct sold quantity from inventory
        inventoryItem.quantityInStock -= quantity;
        await inventoryItem.save();

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

    async findSales({ productName, minPrice, maxPrice }) {
        // Filters: productName (string), minPrice (number), maxPrice (number)
        const where = {};
        if (minPrice !== undefined || maxPrice !== undefined) {
            where.total = {};
            if (minPrice !== undefined) where.total[Op.gte] = minPrice;
            if (maxPrice !== undefined) where.total[Op.lte] = maxPrice;
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