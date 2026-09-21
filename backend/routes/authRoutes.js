import express from 'express';
import {
	register,
	login,
	getOrganizerStatus,
	submitOrganizerVerification,
	getPendingOrganizations,
	verifyOrganizationByAdmin
} from '../controllers/AuthController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/organizer/status/:accountId', authenticateToken, getOrganizerStatus);
router.post('/organizer/verification', authenticateToken, requireRole('organizer'), submitOrganizerVerification);
router.get('/admin/pending-organizations', authenticateToken, requireRole('admin'), getPendingOrganizations);
router.patch('/admin/verify-organization/:id', authenticateToken, requireRole('admin'), verifyOrganizationByAdmin);

export default router;