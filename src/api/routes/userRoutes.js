import { Router } from 'express';
import userController from '../controllers/userController.js';
import { validateSignup, validateLogin, validateBusinessDetails } from '../middleware/validationMiddleware.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// Register new user
router.post('/register', validateSignup, userController.registerUser);

// Email verification after registration
router.post('/verify-email', userController.verifyUserEmail);

// Login user
router.post('/login', validateLogin, userController.loginUser);

// Send OTP for password reset (email verification for password reset)
router.post('/password-reset/request', userController.verifyUserExist);

// Set new password after OTP verification
router.post('/password-reset/new', userController.updatePassword);

router.post('/update-business-details', authenticateToken, validateBusinessDetails, userController.updateBusinessDetails);

// Logout user
router.post('/logout', userController.logoutUser);

// Renew access token
router.post('/renew-token', userController.renewToken);

// Onboarding: Get WhatsApp verification link
router.get('/whatsapp-verification', authenticateToken, userController.getWhatsappVerification);

export default router;