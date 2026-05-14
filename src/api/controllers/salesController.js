import saleServices from '../../services/dbServices/saleServices.js';

class SalesController {
    async recordSale(req, res) {
        try {
            // Expecting: { inventoryId, userId, quantity, total }
            const { inventoryId, userId, quantity, total } = req.body;
            const sale = await saleServices.addSale({ inventoryId, userId, quantity, total });
            res.status(201).json(sale);
        } catch (error) {
            res.status(500).json({ message: 'Error recording sale', error: error.message });
        }
    }

    async getSales(req, res) {
        try {
            // Optional filters: productName, minPrice, maxPrice
            const { productName, minPrice, maxPrice } = req.query;
            const sales = await saleServices.findSales({
                productName,
                minPrice: minPrice ? Number(minPrice) : undefined,
                maxPrice: maxPrice ? Number(maxPrice) : undefined
            });
            res.status(200).json(sales);
        } catch (error) {
            res.status(500).json({ message: 'Error retrieving sales', error: error.message });
        }
    }
}

export default new SalesController();