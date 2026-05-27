import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = path.join(__dirname, '../storage');
const SETTINGS_FILE = path.join(STORAGE_DIR, 'platformSettings.json');
const AUDIT_LOG_FILE = path.join(STORAGE_DIR, 'auditLogs.json');

const ensureStorageDir = () => {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
};

export const getPlatformSettings = () => {
  ensureStorageDir();
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading platform settings:', error.message);
  }
  return {};
};

export const updatePlatformSetting = (key, value) => {
  ensureStorageDir();
  try {
    const settings = getPlatformSettings();
    settings[key] = String(value);
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error updating platform setting:', error.message);
    return false;
  }
};

export const setPlatformSettings = (settings) => {
  ensureStorageDir();
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error setting platform settings:', error.message);
    return false;
  }
};

export const addAuditLogEntry = ({ actor_id = null, actor_role = null, action, entity_type, entity_id = null, details = {} }) => {
  ensureStorageDir();
  try {
    const logs = getAuditLogs();
    const newEntry = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
      actor_id,
      actor_role,
      action,
      entity_type,
      entity_id,
      details,
      createdAt: new Date().toISOString()
    };
    logs.push(newEntry);
    fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(logs, null, 2), 'utf8');
    return newEntry;
  } catch (error) {
    console.error('Error adding audit log entry:', error.message);
    return null;
  }
};

export const getAuditLogs = (limit = null, order = 'DESC') => {
  ensureStorageDir();
  try {
    if (fs.existsSync(AUDIT_LOG_FILE)) {
      const data = fs.readFileSync(AUDIT_LOG_FILE, 'utf8');
      let logs = JSON.parse(data);
      
      logs.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return order === 'DESC' ? dateB - dateA : dateA - dateB;
      });

      if (limit) {
        logs = logs.slice(0, limit);
      }

      return logs;
    }
  } catch (error) {
    console.error('Error reading audit logs:', error.message);
  }
  return [];
};

export const clearAuditLogs = () => {
  ensureStorageDir();
  try {
    fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify([], null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error clearing audit logs:', error.message);
    return false;
  }
};
