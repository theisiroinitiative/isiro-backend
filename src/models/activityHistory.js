import { DataTypes } from "sequelize";
import sequelize from "../utils/sequelize.js";
import User from "./user.js";

const activityHistory = sequelize.define('activityHistory', {
    activityId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
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
    intent: {
        type: DataTypes.STRING,
        allowNull: false
    },
    confidenceScore: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: false
    },
    verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    phaseOne_result: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    phaseTwo_result: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    rawMessages: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        allowNull: false
    },
    suggestedResponses: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        allowNull: false
    },
    timeStamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
    }
});

User.hasMany(activityHistory, { foreignKey: 'userId' });
activityHistory.belongsTo(User, { foreignKey: 'userId' });

export default activityHistory;
