import { DataTypes } from 'sequelize';
import sequelize from '../utils/sequelize.js';
import User from './user.js';

const Token = sequelize.define('Token', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: User,
      key: 'email'
    }
  },
  token_string: {
    type: DataTypes.STRING,
    allowNull: false
  },
  expiryStatus: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false // false = not expired, true = expired
  }
}, {
  tableName: 'tokens',
  timestamps: true
});

await Token.sync();
// Association (optional, for Sequelize magic methods)
User.hasMany(Token, { foreignKey: 'email', sourceKey: 'email' });
Token.belongsTo(User, { foreignKey: 'email', targetKey: 'email' });

export default Token;