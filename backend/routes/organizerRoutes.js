import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import {
  getOrganizerDashboard,
  getOrganizerParticipants,
  toggleParticipantCheckIn
} from '../controllers/OrganizerController.js';

const router = express.Router();

router.use(authenticateToken, requireRole('organizer'));

router.get('/dashboard', getOrganizerDashboard);
router.get('/participants', getOrganizerParticipants);
router.patch('/participants/:participationId/check-in', toggleParticipantCheckIn);

export default router;
