import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Event = sequelize.define('Event', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  location: { type: DataTypes.STRING },
  start_date: { type: DataTypes.DATE, allowNull: false },
  end_date: { type: DataTypes.DATE, allowNull: false },
  max_capacity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  current_occupancy: { type: DataTypes.INTEGER, defaultValue: 0 },
  price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
  
  points_value: { 
    type: DataTypes.INTEGER, 
    defaultValue: 0
  },
  
  image_url: { 
    type: DataTypes.STRING, 
    allowNull: true
  },
  
  creator_id: { 
    type: DataTypes.UUID, 
    allowNull: false,
    references: { model: 'account', key: 'id' }
  },
  org_id: { 
    type: DataTypes.UUID, 
    allowNull: true,
    references: { model: 'organization', key: 'id' }
  },
  
  show_guest_list: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  guest_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  confirmation_deadline: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, { tableName: 'event' });

export default Event;