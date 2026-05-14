import userServices from '../../services/dbServices/userServices.js';
import otpService from '../../services/dbServices/otpService.js';
import { generateOTP } from '../../utils/otpGenerator.js';
import { sendOTPEmail, sendPasswordResetOTPEmail } from '../../utils/emailsender.js';
import { signAccessToken, signRefreshToken } from '../../config/tokens.js';
import tokenServices from '../../services/dbServices/tokenServices.js';
import jwt from 'jsonwebtoken';
import Token from '../../models/token.js';

class UserController {
  async registerUser(req, res) {
    try {
      // Validate input (assumes validateSignup middleware already ran)
      const { name, email, phoneNumber, password } = req.body;

      // Generate OTP
      const otp = generateOTP();

      // Store OTP in Redis
      await otpService.storeOTP(email, otp);

      // Send OTP email
      const sent = await sendOTPEmail(email, name, otp);
      if (sent) {
        await userServices.createUser({ name, email, phoneNumber, password });
        res.status(201).json({ message: 'User created. OTP sent to email for verification.' });
      }

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async verifyUserEmail(req, res) {
    try {
      const { email, otp } = req.body;

      // Verify OTP
      const isValid = await otpService.verifyOTP(email, otp);
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid or expired OTP.' });
      }

      // Update user's email verification status
      const user = await userServices.updateEmailVerifiedByEmail(email, true);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      // Fetch user data
      const userData = await userServices.fetchUserData(user.id);

      // Create tokens
      const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
      const refreshToken = signRefreshToken({ id: user.id, email: user.email, role: user.role });

      // Set tokens in httpOnly cookies
      res.cookie('accessToken', accessToken, { httpOnly: true, maxAge: 30 * 60 * 1000 }); // 30 mins
      res.cookie('refreshToken', refreshToken, { httpOnly: true, maxAge: 3 * 60 * 60 * 1000 }); // 3 hours

      // Optionally delete OTP after successful verification
      await otpService.deleteOTP(email);

      res.status(200).json({ message: 'Email verified successfully.', user: userData });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async loginUser(req, res) {
    try {
      const { email, password } = req.body;

      // Verify user credentials
      const user = await userServices.verifyUserCredentials(email, password);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // Fetch user data
      const userData = await userServices.fetchUserData(user.id);

      // Create tokens
      const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
      const refreshToken = signRefreshToken({ id: user.id, email: user.email, role: user.role });

      // Set tokens in httpOnly cookies
      res.cookie('accessToken', accessToken, { httpOnly: true, maxAge: 30 * 60 * 1000, sameSite: 'none', secure: true }); // 30 mins
      res.cookie('refreshToken', refreshToken, { httpOnly: true, maxAge: 3 * 60 * 60 * 1000, sameSite: 'none', secure: true }); // 3 hours

      res.status(200).json({ message: 'Login successful.', user: userData });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 1. Verify user exists and send OTP for password reset
  async verifyUserExist(req, res) {
    try {
      const { email } = req.body;
      const exists = await userServices.userExists(email);
      if (!exists) {
        return res.status(404).json({ error: 'User with this email does not exist.' });
      }

      // Generate OTP
      const otp = generateOTP();

      // Store OTP in Redis
      await otpService.storeOTP(email, otp);

      // Send password reset OTP email
      await sendPasswordResetOTPEmail(email, otp);

      res.status(200).json({ message: 'OTP sent to email for password reset.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 2. Update user password after OTP verification
  async updatePassword(req, res) {
    try {
      const { email, password } = req.body;
      const updated = await userServices.updatePassword(email, password);
      if (!updated) {
        return res.status(404).json({ error: 'User not found or password not updated.' });
      }
      res.status(200).json({ message: 'Password updated successfully.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateBusinessDetails(req, res) {
    try {
      const { businessName, businessCategory, targetMonthlyRevenue } = req.body;
      const updated = await userServices.updateBusinessDetails(req.user.id, businessName, businessCategory, targetMonthlyRevenue);
      if (!updated) {
        return res.status(404).json({ error: 'User not found or business details not updated.' });
      }
      res.status(200).json({ message: 'Business details updated successfully.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 3. Logout user
  async logoutUser(req, res) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (refreshToken) {
        const decoded = jwt.decode(refreshToken);
        if (decoded && decoded.email) {
          // Setting expiryStatus to true (expired) to invalidate it in the DB
          await tokenServices.updateExpiryStatus(decoded.email, refreshToken, true);
        }
      }
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      res.status(200).json({ message: 'Logout successful.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 4. Renew token
  async renewToken(req, res) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token not found.' });
      }

      const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret';

      let decoded;
      try {
        decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired refresh token.' });
      }

      const tokenRecord = await Token.findOne({ where: { token_string: refreshToken } });
      if (!tokenRecord || tokenRecord.expiryStatus === true) {
        return res.status(401).json({ error: 'Refresh token has been revoked.' });
      }

      const newAccessToken = signAccessToken({ id: decoded.id, email: decoded.email, role: decoded.role });

      res.cookie('accessToken', newAccessToken, { httpOnly: true, maxAge: 30 * 60 * 1000, sameSite: 'none', secure: true }); // 30 mins

      res.status(200).json({ message: 'Token renewed successfully.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  // 5. Get WhatsApp Verification Code and Link
  async getWhatsappVerification(req, res) {
    try {
      const userId = req.user.id;
      const user = await userServices.fetchUserData(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const code = await userServices.generateWhatsappVerificationCode(userId);
      const botPhoneNumber = process.env.BOT_PHONE_NUMBER || '2348000000000';
      const whatsappLink = `https://wa.me/${botPhoneNumber}?text=VERIFY ${code}`;

      res.status(200).json({
        message: 'WhatsApp verification code generated.',
        code,
        whatsappLink
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new UserController();