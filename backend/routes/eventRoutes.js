import express from 'express';
import {
	createEvent,
	deletePrivateEvent,
	getAllEvents,
	getEventById,
	getMyPrivateEvents,
	getUserCalendarEvents,
	respondToPrivateInvitation,
	updateEvent
} from '../controllers/EventController.js';
import { getMyTickets, joinEvent } from '../controllers/ParticipationController.js';
import { purchaseAsGuest, purchaseAsUser, sendTicketsByEmail } from '../controllers/BookingController.js';
import { confirmInviteParticipation, getInvitePreview } from '../controllers/InviteController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getAllEvents);
router.get('/calendar/:userId', authenticateToken, getUserCalendarEvents);
router.get('/tickets/mine', authenticateToken, getMyTickets);
router.get('/private/mine', authenticateToken, getMyPrivateEvents);
router.patch('/private/invitations/:participationId', authenticateToken, respondToPrivateInvitation);
router.delete('/private/:eventId', authenticateToken, deletePrivateEvent);
router.get('/invite/:eventId', getInvitePreview);
router.post('/invite/:eventId/confirm', authenticateToken, confirmInviteParticipation);
router.post('/join', authenticateToken, joinEvent);
router.post('/purchase/user', authenticateToken, purchaseAsUser);
router.post('/purchase/guest', purchaseAsGuest);
router.post('/tickets/send-email', sendTicketsByEmail);
router.post('/', authenticateToken, createEvent);
router.patch('/:id', authenticateToken, updateEvent);
router.get('/:id', getEventById);

export default router;