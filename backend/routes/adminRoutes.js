import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import {
  createCategoryAdmin,
  deleteCategoryAdmin,
  getAuditLogAdmin,
  getDashboardSummary,
  getEventsAdmin,
  getOrganizationsAdmin,
  getParticipantsAdmin,
  getReportsAdmin,
  getSettingsAdmin,
  moderateEvent,
  updateCategoryAdmin,
  updateOrganizationStatus,
  updateSettingsAdmin
} from '../controllers/AdminController.js';

const router = express.Router();

router.use(authenticateToken, requireRole('admin'));

router.get('/dashboard', getDashboardSummary);
router.get('/organizations', getOrganizationsAdmin);
router.patch('/organizations/:id/status', updateOrganizationStatus);
router.get('/participants', getParticipantsAdmin);
router.get('/events', getEventsAdmin);
router.patch('/events/:id/moderation', moderateEvent);
router.get('/reports', getReportsAdmin);
router.get('/settings', getSettingsAdmin);
router.patch('/settings', updateSettingsAdmin);
router.get('/audit-log', getAuditLogAdmin);
router.post('/categories', createCategoryAdmin);
router.patch('/categories/:id', updateCategoryAdmin);
router.delete('/categories/:id', deleteCategoryAdmin);

export default router;
