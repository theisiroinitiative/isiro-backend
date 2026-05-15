import { DataTypes } from 'sequelize';
import sequelize from '../utils/sequelize.js';
import User from './user.js';

const Inventory = sequelize.define('Inventory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
    unique: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  productName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  quantityInStock: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  costPrice: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  sellingPrice: {
    type: DataTypes.FLOAT,
    allowNull: false
  }
}, {
  tableName: 'inventories',
  timestamps: true
});

// Association
User.hasMany(Inventory, { foreignKey: 'userId' });
Inventory.belongsTo(User, { foreignKey: 'userId' });

export default Inventory;