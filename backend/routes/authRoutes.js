import express from 'express';
import {
	register,
	login,
	getOrganizerStatus,
	submitOrganizerVerification,
	reviewOrganizerVerification,
	getPendingOrganizations,
	verifyOrganizationByAdmin
} from '../controllers/AuthController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/organizer/status/:accountId', getOrganizerStatus);
router.post('/organizer/verification', submitOrganizerVerification);
router.patch('/admin/organizer/:organizationId/review', reviewOrganizerVerification);
router.get('/admin/pending-organizations', getPendingOrganizations);
router.patch('/admin/verify-organization/:id', verifyOrganizationByAdmin);

export default router;