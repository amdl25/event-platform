import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = path.join(__dirname, '../storage');
const SETTINGS_FILE = path.join(STORAGE_DIR, 'platformSettings.json');
const AUDIT_LOG_FILE = path.join(STORAGE_DIR, 'auditLogs.json');
const NOTIFICATIONS_FILE = path.join(STORAGE_DIR, 'notifications.json');
const ORG_PLANS_FILE = path.join(STORAGE_DIR, 'orgPlans.json');

const readOrgPlans = () => {
  try {
    if (fs.existsSync(ORG_PLANS_FILE)) {
      return JSON.parse(fs.readFileSync(ORG_PLANS_FILE, 'utf8'));
    }
  } catch {}
  return {};
};

export const getOrgPlan = (orgId) => {
  return readOrgPlans()[orgId] || 'gratuit';
};

export const setOrgPlan = (orgId, plan) => {
  ensureStorageDir();
  try {
    const plans = readOrgPlans();
    plans[orgId] = plan;
    fs.writeFileSync(ORG_PLANS_FILE, JSON.stringify(plans, null, 2), 'utf8');
    return true;
  } catch {
    return false;
  }
};

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
    return false;
  }
};

export const setPlatformSettings = (settings) => {
  ensureStorageDir();
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (error) {
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
  }
  return [];
};

export const clearAuditLogs = () => {
  ensureStorageDir();
  try {
    fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify([], null, 2), 'utf8');
    return true;
  } catch (error) {
    return false;
  }
};

const readNotifications = () => {
  try {
    if (fs.existsSync(NOTIFICATIONS_FILE)) {
      return JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, 'utf8'));
    }
  } catch (error) {
  }
  return [];
};

const writeNotifications = (data) => {
  ensureStorageDir();
  fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(data, null, 2), 'utf8');
};

export const addNotification = ({ account_id, type, message }) => {
  try {
    const all = readNotifications();
    const entry = {
      id: crypto.randomUUID(),
      account_id,
      type,
      message,
      read: false,
      createdAt: new Date().toISOString()
    };
    all.push(entry);
    writeNotifications(all);
    return entry;
  } catch (error) {
    return null;
  }
};

export const getNotificationsForAccount = (account_id, limit = 20) => {
  try {
    const all = readNotifications();
    return all
      .filter((n) => n.account_id === account_id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  } catch (error) {
    return [];
  }
};

export const markAllNotificationsRead = (account_id) => {
  try {
    const all = readNotifications();
    const updated = all.map((n) => n.account_id === account_id ? { ...n, read: true } : n);
    writeNotifications(updated);
  } catch (error) {
  }
};
