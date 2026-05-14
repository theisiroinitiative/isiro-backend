import express from "express";
import AccountController from "../controllers/accountController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const controller = new AccountController();

router.post('/create', authenticateToken, authorizeRoles(['trader']), controller.createAccount);
router.patch('/update/:id', authenticateToken, authorizeRoles(['trader']), controller.updateAccountInfo);
router.delete('/delete/:id', authenticateToken, authorizeRoles(['trader']), controller.deleteAccount);

// Webhook endpoint (unauthenticated since it uses x-squad-signature for validation)
router.post('/webhook', controller.squadWebhook);

export default router;
