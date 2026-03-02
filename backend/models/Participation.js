import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Participation = sequelize.define('Participation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  account_id: { 
    type: DataTypes.UUID, 
    allowNull: false,
    references: { model: 'account', key: 'id' } 
  },
  event_id: { 
    type: DataTypes.UUID, 
    allowNull: false,
    references: { model: 'event', key: 'id' }
  },
  status: { type: DataTypes.ENUM('going', 'interested'), defaultValue: 'going' },
  ticket_qr: { type: DataTypes.STRING, unique: true },
  checkin_done: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'participation' });

export default Participation;