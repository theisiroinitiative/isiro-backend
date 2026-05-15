import redisClient from '../../config/redis.js';

class OTPService {
  async storeOTP(email, otp, ttl = 300) {
    // Check for existing OTP to enforce rate limiting (60 seconds cooldown)
    const ttlRemaining = await redisClient.ttl(`otp:${email}`);
    if (ttlRemaining > (ttl - 60)) {
      const waitTime = ttlRemaining - (ttl - 60);
      throw new Error(`Please wait ${waitTime} seconds before requesting a new OTP.`);
    }

    // ttl in seconds (default 5 minutes)
    await redisClient.set(`otp:${email}`, otp, { EX: ttl });
  }

  async verifyOTP(email, otp) {
    const storedOtp = await redisClient.get(`otp:${email}`);
    return storedOtp === otp;
  }

  async deleteOTP(email) {
    await redisClient.del(`otp:${email}`);
  }
}

export default new OTPService();