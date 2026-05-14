import { Router } from 'express';
import InventoryController from '../controllers/inventoryController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', authenticateToken, authorizeRoles(['admin', 'trader']), InventoryController.getInventory);
router.post('/add', authenticateToken, authorizeRoles(['admin', 'trader']), InventoryController.addItem);
router.post('/remove', authenticateToken, authorizeRoles(['admin', 'trader']), InventoryController.removeItem);

export default router;