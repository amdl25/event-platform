import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Organization = sequelize.define('Organization', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  owner_id: { 
    type: DataTypes.UUID, 
    allowNull: false,
    references: { model: 'account', key: 'id' }
  }
}, { tableName: 'organization' });

export default Organization;