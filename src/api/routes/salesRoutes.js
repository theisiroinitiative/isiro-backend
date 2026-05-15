import { Router } from 'express';
import salesController from '../controllers/salesController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', authenticateToken, authorizeRoles(['admin', 'trader']), salesController.recordSale);
router.get('/', authenticateToken, authorizeRoles(['admin', 'trader']), salesController.getSales);

export default router;