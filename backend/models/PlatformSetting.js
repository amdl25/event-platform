import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PlatformSetting = sequelize.define('PlatformSetting', {
  key: { type: DataTypes.STRING, primaryKey: true },
  value: { type: DataTypes.TEXT, allowNull: false }
}, { tableName: 'platform_setting', timestamps: true });

export default PlatformSetting;
