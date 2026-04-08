import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Participation = sequelize.define('Participation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  account_id: { 
    type: DataTypes.UUID, 
    allowNull: true,
    references: { model: 'account', key: 'id' } 
  },
  event_id: { 
    type: DataTypes.UUID, 
    allowNull: false,
    references: { model: 'event', key: 'id' }
  },
  buyer_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  buyer_email: { 
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'going'
  },
  invite_status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
    allowNull: false,
    defaultValue: 'accepted'
  },
  ticket_qr: { type: DataTypes.TEXT, unique: true }
}, { tableName: 'participation' });

export default Participation;