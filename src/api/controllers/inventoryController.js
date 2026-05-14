import InventoryService from '../../services/dbServices/inventoryService.js';

const InventoryController = {
  getInventory: (req, res) => {
    res.json(InventoryService.getInventory());
  },
  addItem: (req, res) => {
    try {
      const updated = InventoryService.addItem(req.body);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  removeItem: (req, res) => {
    try {
      const { id, quantity } = req.body;
      const updated = inventoryService.removeItem(id, quantity);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
};

export default InventoryController;