import InventoryService from '../../services/dbServices/inventoryService.js';

const InventoryController = {
  getInventory: async (req, res) => {
    try {
      const inventory = await InventoryService.getInventoryByUserId(req.user.id);
      res.json(inventory);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  addItem: async (req, res) => {
    try {
      const updated = await InventoryService.addItem(req.body);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  removeItem: async (req, res) => {
    try {
      const { id, quantity } = req.body;
      const updated = await InventoryService.removeItem(id, quantity);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
};

export default InventoryController;