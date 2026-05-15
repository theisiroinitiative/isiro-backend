import { DataTypes } from 'sequelize';
import sequelize from '../utils/sequelize.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'trader'
  },
  isEmailVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  businessName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  businessCategory: {
    type: DataTypes.STRING,
    allowNull: true
  },
  targetMonthlyRevenue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  isBusinessDetailsComplete: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  emailVerificationToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  emailVerificationTokenExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  whatsappVerificationCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isWhatsappVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'users',
  timestamps: true
});

export default User;