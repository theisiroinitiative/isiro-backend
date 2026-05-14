import express from 'express';
import SalesController from '../controllers/salesController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const setSalesRoutes = (app) => {
    const router = express.Router();
    const salesController = new SalesController();

    router.post('/sales', authenticateToken, authorizeRoles(['admin', 'trader']), salesController.recordSale);
    router.get('/sales', authenticateToken, authorizeRoles(['admin', 'trader']), salesController.getSales);

    app.use('/api', router);
};

export default setSalesRoutes;