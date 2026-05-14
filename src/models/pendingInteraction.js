import { DataTypes } from "sequelize";
import sequelize from "../utils/sequelize.js";
import User from "./user.js";

const PendingInteraction = sequelize.define('PendingInteraction', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
            model: User,
            key: 'id'
        }
    },
    originalMessage: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    intent: {
        type: DataTypes.STRING,
        allowNull: false
    },
    extractedData: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    suggestedResponse: {
        type: DataTypes.TEXT,
        allowNull: false
    }
}, {
    tableName: 'pending_interactions',
    timestamps: true
});

await PendingInteraction.sync();

User.hasOne(PendingInteraction, { foreignKey: 'userId' });
PendingInteraction.belongsTo(User, { foreignKey: 'userId' });

export default PendingInteraction;
