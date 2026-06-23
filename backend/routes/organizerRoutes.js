import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import {
  getOrganizerDashboard,
  getOrganizerAnalytics,
  getOrganizerAdvancedAnalytics,
  getOrganizerParticipants,
  getOrganizerEvents,
  toggleParticipantCheckIn,
  getOrganizerNotifications,
  markNotificationsRead,
  updatePlan,
  createPlanCheckoutSession,
  confirmPlanCheckoutSession
} from '../controllers/OrganizerController.js';

const router = express.Router();

router.use(authenticateToken, requireRole('organizer'));

router.get('/dashboard', getOrganizerDashboard);
router.get('/analytics', getOrganizerAnalytics);
router.get('/analytics/advanced', getOrganizerAdvancedAnalytics);
router.get('/participants', getOrganizerParticipants);
router.patch('/participants/:participationId/check-in', toggleParticipantCheckIn);
router.get('/notifications', getOrganizerNotifications);
router.patch('/notifications/read-all', markNotificationsRead);
router.put('/plan', updatePlan);
router.post('/plan/checkout-session', createPlanCheckoutSession);
router.post('/plan/confirm-session', confirmPlanCheckoutSession);

export default router;
