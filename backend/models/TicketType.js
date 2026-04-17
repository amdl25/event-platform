import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const TicketType = sequelize.define('TicketType', {
  id: { 
    type: DataTypes.UUID, 
    defaultValue: DataTypes.UUIDV4, 
    primaryKey: true 
  },
  event_id: { 
    type: DataTypes.UUID, 
    allowNull: false,
    references: { model: 'event', key: 'id' },
    onDelete: 'CASCADE'
  },
  name: { 
    type: DataTypes.STRING, 
    allowNull: false,
    defaultValue: 'General Access'
  },
  description: { 
    type: DataTypes.TEXT,
    allowNull: true
  },
  price: { 
    type: DataTypes.DECIMAL(10, 2), 
    allowNull: false,
    defaultValue: 0.00
  },
  quantity: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    defaultValue: 100
  },
  sold_quantity: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    defaultValue: 0
  },
  points_reward: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    defaultValue: 0
  },
  display_order: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    defaultValue: 0
  },
  is_active: { 
    type: DataTypes.BOOLEAN, 
    allowNull: false,
    defaultValue: true
  }
}, { tableName: 'ticket_type' });

export default TicketType;
