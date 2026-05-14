import Token from '../../models/token.js';

class TokenService {
  async storeRefreshToken(email, tokenString) {
    return await Token.create({
      email,
      token_string: tokenString,
      expiryStatus: false
    });
  }

  async updateExpiryStatus(email, tokenString, status = true) {
    const token = await Token.findOne({ where: { email, token_string: tokenString } });
    if (!token) return null;
    token.expiryStatus = status;
    await token.save();
    return token;
  }

  async deleteExpiredTokens(email) {
    return await Token.destroy({
      where: {
        email,
        expiryStatus: true
      }
    });
  }
}

export default new TokenService();