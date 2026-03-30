import express from 'express';
import {
	register,
	login,
	getOrganizerStatus,
	submitOrganizerVerification,
	reviewOrganizerVerification
} from '../controllers/AuthController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/organizer/status/:accountId', getOrganizerStatus);
router.post('/organizer/verification', submitOrganizerVerification);
router.patch('/admin/organizer/:organizationId/review', reviewOrganizerVerification);

export default router;