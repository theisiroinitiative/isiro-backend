import Inventory from './src/models/inventory.js';
import sequelize from './src/utils/sequelize.js';

async function check() {
    try {
        await sequelize.authenticate();
        const items = await Inventory.findAll();
        console.log('--- INVENTORY START ---');
        console.log('Total items:', items.length);
        items.forEach(item => {
            console.log(`PRODUCT: ${item.productName} | ID: ${item.id} | USER: ${item.userId}`);
        });
        console.log('--- INVENTORY END ---');
    } catch (err) {
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

check();
