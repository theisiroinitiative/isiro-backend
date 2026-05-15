import { DataTypes } from "sequelize";
import sequelize from "../utils/sequelize.js";
import User from "./user.js";

const expense = sequelize.define('expense', {
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    nameOfExpense: {
        type: DataTypes.STRING,
        allowNull: false
    },
    expenseId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    category: {
        type: DataTypes.ENUM('CAPITAL', 'OPERATIONAL', 'MISCELLANEOUS', 'PERSONAL', 'OTHERS'),
        allowNull: false
    },
    verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    confidenceScore: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true
    }
});

User.hasMany(expense, { foreignKey: 'userId' });
expense.belongsTo(User, { foreignKey: 'userId' });

export default expense;