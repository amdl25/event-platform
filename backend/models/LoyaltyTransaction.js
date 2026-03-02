import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const LoyaltyTransaction = sequelize.define('LoyaltyTransaction', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  account_id: { type: DataTypes.UUID, allowNull: false },
  org_id: { type: DataTypes.UUID, allowNull: false },
  event_id: { type: DataTypes.UUID, allowNull: true },
  points_amount: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.ENUM('earn', 'redeem'), allowNull: false },
}, { tableName: 'loyalty_transaction' });

export default LoyaltyTransaction;