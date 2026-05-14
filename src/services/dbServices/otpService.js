import redisClient from '../../config/redis.js';

class OTPService {
  async storeOTP(email, otp, ttl = 300) {
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