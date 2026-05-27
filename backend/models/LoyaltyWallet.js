import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const LoyaltyWallet = sequelize.define('LoyaltyWallet', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  account_id: { 
    type: DataTypes.UUID, 
    allowNull: false,
    references: { model: 'account', key: 'id' }
  },
  org_id: { 
    type: DataTypes.UUID, 
    allowNull: false,
    references: { model: 'organization', key: 'id' }
  },
  points_balance: { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
  tableName: 'loyalty_wallet',
  indexes: [
    {
      unique: true,
      fields: ['account_id', 'org_id']
    }
  ]
});

export default LoyaltyWallet;