import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  actor_id: { type: DataTypes.UUID, allowNull: true },
  actor_role: { type: DataTypes.STRING, allowNull: true },
  action: { type: DataTypes.STRING, allowNull: false },
  entity_type: { type: DataTypes.STRING, allowNull: false },
  entity_id: { type: DataTypes.STRING, allowNull: true },
  details: { type: DataTypes.JSONB, allowNull: true }
}, { tableName: 'audit_log' });

export default AuditLog;
