import Inventory from '../../models/inventory.js';
import { Op } from 'sequelize';

class InventoryService {
    async addItem(item) {
        // item: { productName, quantityInStock, costPrice, sellingPrice }
        const [inventoryItem, created] = await Inventory.findOrCreate({
            where: { productName: item.productName, userId: item.userId },
            defaults: {
                quantityInStock: item.quantityInStock,
                costPrice: item.costPrice,
                sellingPrice: item.sellingPrice,
                userId: item.userId
            }
        });

        if (!created) {
            await inventoryItem.increment('quantityInStock', { by: item.quantityInStock });
            inventoryItem.costPrice = item.costPrice;
            inventoryItem.sellingPrice = item.sellingPrice;
            await inventoryItem.save();
        }

        return inventoryItem;
    }

    async updateItem(itemId, quantity) {
        const inventoryItem = await Inventory.findByPk(itemId);
        if (!inventoryItem) {
            throw new Error('Item not found in inventory');
        }

        const newQuantity = inventoryItem.quantityInStock + quantity;
        if (newQuantity < 0) {
            throw new Error(`Insufficient stock o. You only get ${inventoryItem.quantityInStock} left for ${inventoryItem.productName}.`);
        }

        await inventoryItem.increment('quantityInStock', { by: quantity });
        await inventoryItem.reload();
        return inventoryItem;
    }

    async getInventoryIdByUserIdandName(userId, productName) {
        return await Inventory.findOne({ where: { userId, productName }, attributes: ['id'] });
    }

    async removeItem(itemId, quantity) {
        const inventoryItem = await Inventory.findByPk(itemId);
        if (!inventoryItem) {
            throw new Error('Item not found in inventory');
        }
        if (inventoryItem.quantityInStock < quantity) {
            throw new Error('Insufficient quantity in inventory');
        }
        inventoryItem.quantityInStock -= quantity;
        await inventoryItem.save();
        return inventoryItem;
    }

    async getInventoryByUserId(userId) {
        return await Inventory.findAll({
            where: { userId },
            attributes: ['id', 'productName', 'quantityInStock', 'costPrice', 'sellingPrice']
        });
    }

    async getProductByName(userId, productName) {
        return await Inventory.findOne({
            where: { 
                userId, 
                productName: { [Op.iLike]: `%${productName}%` } 
            }
        });
    }
}

export default new InventoryService();