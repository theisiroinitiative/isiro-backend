import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = createClient({
  url: process.env.REDIS_URL,
  password: process.env.REDIS_PASSWORD
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

async function connectWithRetry(maxRetries = 3, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await redisClient.connect();
      console.log('Redis connected successfully.');
      return;
    } catch (err) {
      console.error(`Redis connection attempt ${attempt}/${maxRetries} failed:`, err.message);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  console.error('Redis: All connection attempts failed. OTP features will be unavailable.');
}

await connectWithRetry();

export default redisClient;