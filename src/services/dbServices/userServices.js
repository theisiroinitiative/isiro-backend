import User from '../../models/user.js';
import bcrypt from 'bcryptjs';

class UserServices {
  async createUser({ name, email, phoneNumber, password, role = 'trader' }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      phoneNumber,
      password: hashedPassword,
      role
    });
    return user;
  }

  async verifyUserCredentials(email, password) {
    const user = await User.findOne({ where: { email } });
    if (!user) return null;
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;
    return user;
  }

  async fetchUserData(userId) {
    const user = await User.findByPk(userId, {
      attributes: ['name', 'email', 'phoneNumber', 'isEmailVerified']
    });
    return user;
  }

  async updateEmailVerified(userId, status = true) {
    const user = await User.findByPk(userId);
    if (!user) return null;
    user.isEmailVerified = status;
    await user.save();
    return user;
  }

  async updateBusinessDetails(userId, businessName, businessCategory, targetMonthlyRevenue) {
    const user = await User.findByPk(userId);
    if (!user) return null;
    user.businessName = businessName;
    user.businessCategory = businessCategory;
    user.targetMonthlyRevenue = targetMonthlyRevenue;
    user.isBusinessDetailsComplete = true;
    await user.save();
    return user;
  }

  async updateEmailVerifiedByEmail(email, status = true) {
    const user = await User.findOne({ where: { email } });
    if (!user) return null;
    user.isEmailVerified = status;
    await user.save();
    return user;
  }

  async deleteUser(userId) {
    const user = await User.findByPk(userId);
    if (!user) return null;
    await user.destroy();
    return true;
  }

  async userExists(email) {
    const user = await User.findOne({ where: { email } });
    return !!user;
  }

  async fetchUserDataByEmail(email) {
    return await User.findOne({ where: { email } });
  }

  async userExistsByPhone(phoneNumber) {
    const user = await User.findOne({ where: { phoneNumber } });
    return !!user;
  }

  async getUserIdByPhone(phoneNumber) {
    const user = await User.findOne({ where: { phoneNumber }, attributes: ['id'] });
    return user;
  }

  async fetchUserDataByPhone(phoneNumber) {
    return await User.findOne({ where: { phoneNumber } });
  }

  async generateWhatsappVerificationCode(userId) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const user = await User.findByPk(userId);
    if (!user) return null;
    user.whatsappVerificationCode = code;
    await user.save();
    return code;
  }

  async verifyWhatsappCode(phoneNumber, code) {
    const user = await User.findOne({ where: { phoneNumber, whatsappVerificationCode: code } });
    if (!user) return false;
    user.isWhatsappVerified = true;
    user.whatsappVerificationCode = null;
    await user.save();
    return true;
  }

  async updatePassword(email, newPassword) {
    const user = await User.findOne({ where: { email } });
    if (!user) return false;
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();
    return true;
  }
}

export default new UserServices();