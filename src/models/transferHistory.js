import { DataTypes } from "sequelize";
import sequelize from "../utils/sequelize.js";
import User from "./user.js";

const TransferHistory = sequelize.define('transfer_history', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    virtualAccountId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
    },
    bank_code: {
        type: DataTypes.STRING,
        allowNull: false
    },
    account_number: {
        type: DataTypes.STRING,
        allowNull: false
    },
    account_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    transaction_reference: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    remark: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'SUCCESS', 'FAILED'),
        defaultValue: 'PENDING',
        allowNull: false
    },
    squad_response: {
        type: DataTypes.JSONB,
        allowNull: true
    }
}, {
    tableName: 'transfer_history',
    timestamps: true
});

User.hasMany(TransferHistory, { foreignKey: 'userId' });
TransferHistory.belongsTo(User, { foreignKey: 'userId' });

export default TransferHistory;
