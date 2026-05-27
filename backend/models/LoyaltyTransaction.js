import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const LoyaltyTransaction = sequelize.define('LoyaltyTransaction', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  wallet_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  event_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'event', key: 'id' }
  },
  points_amount: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.ENUM('earn', 'redeem'), allowNull: false },
}, { tableName: 'loyalty_transaction' });

export default LoyaltyTransaction;