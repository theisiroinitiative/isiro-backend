import { DataTypes } from 'sequelize';
import sequelize from '../utils/sequelize.js';
import Inventory from './inventory.js';
import User from './user.js';

const Sale = sequelize.define('Sale', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
    unique: true
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Inventory,
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  amountPaid: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  paymentSource: {
    type: DataTypes.ENUM('CASH', 'SQUADPAY'),
    allowNull: false
  },
  confidenceScore: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: false
  },
  squadTransactionRef: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  status: {
    type: DataTypes.ENUM('SUCCESS', 'PENDING'),
    defaultValue: 'PENDING'
  },
  profitMade: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  tableName: 'sales',
  timestamps: true
});

await Sale.sync();

Inventory.hasMany(Sale, { foreignKey: 'productId' });
Sale.belongsTo(Inventory, { foreignKey: 'productId' });

User.hasMany(Sale, { foreignKey: 'userId' });
Sale.belongsTo(User, { foreignKey: 'userId' });

export default Sale;