import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Organization = sequelize.define('Organization', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  business_identifier: {
    type: DataTypes.STRING,
    allowNull: true
  },
  registered_address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  official_phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  verification_status: {
    type: DataTypes.ENUM('unverified', 'pending', 'verified', 'rejected'),
    allowNull: false,
    defaultValue: 'unverified'
  },
  verification_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  verified_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  owner_id: { 
    type: DataTypes.UUID, 
    allowNull: false,
    references: { model: 'account', key: 'id' }
  }
}, { tableName: 'organization' });

export default Organization;