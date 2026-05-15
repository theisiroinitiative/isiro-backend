import express from "express";
import accountController from "../controllers/accountController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Virtual Account Management
router.post('/create', authenticateToken, authorizeRoles(['trader']), accountController.createAccount.bind(accountController));
router.patch('/update/:id', authenticateToken, authorizeRoles(['trader']), accountController.updateAccountInfo.bind(accountController));
router.delete('/delete/:id', authenticateToken, authorizeRoles(['trader']), accountController.deleteAccount.bind(accountController));

// Account Lookup (verify recipient before transfer)
router.post('/lookup-account', authenticateToken, authorizeRoles(['trader']), accountController.lookupBankAccount.bind(accountController));

// Withdrawals
router.post('/withdraw', authenticateToken, authorizeRoles(['trader']), accountController.withdrawFunds.bind(accountController));
router.get('/transfers', authenticateToken, authorizeRoles(['trader']), accountController.getTransferHistory.bind(accountController));

// Balance
router.get('/balance', authenticateToken, authorizeRoles(['trader']), accountController.getBalance.bind(accountController));

// Squad Webhook (unauthenticated — uses x-squad-signature for validation)
router.post('/webhook', accountController.squadWebhook.bind(accountController));

export default router;
