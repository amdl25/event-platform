import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const LoyaltyWallet = sequelize.define('LoyaltyWallet', {
  account_id: { 
    type: DataTypes.UUID, 
    primaryKey: true,
    allowNull: false,
    references: { model: 'account', key: 'id' }
  },
  org_id: { 
    type: DataTypes.UUID, 
    primaryKey: true,
    allowNull: false,
    references: { model: 'organization', key: 'id' }
  },
  points_balance: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { tableName: 'loyalty_wallet' });

export default LoyaltyWallet;