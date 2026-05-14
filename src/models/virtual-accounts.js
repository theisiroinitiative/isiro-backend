import { DataTypes } from "sequelize";
import sequelize from "../utils/sequelize.js";
import User from "./user.js";

const virtualAccount = sequelize.define('virtual-accounts', {
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    accountId: {
        type: DataTypes.UUID,
        unique: true,
    },
    accountName: {
        type: DataTypes.STRING,
        unique: true,
    },
    accountNumber: {
        type: DataTypes.STRING,
        unique: true
    },
    beneficiary_account: {
        type: DataTypes.STRING,
        unique: true
    },
    withdrawal_pin: {
        type: DataTypes.STRING,
        unique: true
    },
    account_description: { type: DataTypes.TEXT },
    bankName: { type: DataTypes.STRING },
    orderRef: { type: DataTypes.STRING },
    balance: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00
    }
});

await virtualAccount.sync();

User.hasMany(virtualAccount, { foreignKey: 'userId' });
virtualAccount.belongsTo(User, { foreignKey: 'userId' });

export default virtualAccount;