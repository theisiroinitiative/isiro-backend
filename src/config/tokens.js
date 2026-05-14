import jwt from 'jsonwebtoken';
import tokenService from '../services/dbServices/tokenServices.js';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'your_jwt_access_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret';

export function signAccessToken(userData) {
  return jwt.sign(userData, JWT_ACCESS_SECRET, { expiresIn: '30m' });
}

export async function signRefreshToken(userData) {
  const refreshToken = jwt.sign(userData, JWT_REFRESH_SECRET, { expiresIn: '3h' });
  await tokenService.storeRefreshToken(userData.email, refreshToken);
  return refreshToken;
}