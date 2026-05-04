import express from 'express';
import {
	createEvent,
	deleteEvent,
	deletePrivateEvent,
	getAllEvents,
	getEventById,
	getMyPrivateEvents,
	getUserCalendarEvents,
	regeneratePrivateInviteLink,
	respondToPrivateInvitation,
	updatePrivateEventSettings,
	updateEvent
} from '../controllers/EventController.js';
import { getMyTickets, joinEvent } from '../controllers/ParticipationController.js';
import {
	confirmCheckoutSession,
	createCheckoutSession,
	generateTicketsPdf,
	getPurchaseQuote,
	sendTicketsByEmail
} from '../controllers/BookingController.js';
import { confirmInviteParticipation, getInvitePreview, getPrivateGuestList } from '../controllers/InviteController.js';
import {
	getTicketTypesForEvent,
	createTicketType,
	updateTicketType,
	deleteTicketType,
	getTicketTypeById
} from '../controllers/TicketTypeController.js';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth.js';
import upload from '../config/multer.js';

const router = express.Router();

router.get('/', getAllEvents);
router.get('/calendar/:userId', authenticateToken, getUserCalendarEvents);
router.get('/tickets/mine', authenticateToken, getMyTickets);
router.get('/private/mine', optionalAuthenticateToken, getMyPrivateEvents);
router.patch('/private/invitations/:participationId', authenticateToken, respondToPrivateInvitation);
router.delete('/private/:eventId', authenticateToken, deletePrivateEvent);
router.post('/private/:eventId/regenerate-link', authenticateToken, regeneratePrivateInviteLink);
router.patch('/private/:eventId/settings', authenticateToken, updatePrivateEventSettings);
router.get('/invite/:eventId', optionalAuthenticateToken, getInvitePreview);
router.post('/invite/:eventId/confirm', authenticateToken, confirmInviteParticipation);
router.get('/private/:eventId/guests', authenticateToken, getPrivateGuestList);
router.post('/join', authenticateToken, joinEvent);
router.get('/purchase/quote', optionalAuthenticateToken, getPurchaseQuote);
router.post('/purchase/checkout-session', optionalAuthenticateToken, createCheckoutSession);
router.post('/purchase/confirm-session', confirmCheckoutSession);
router.post('/tickets/send-email', sendTicketsByEmail);
router.post('/tickets/pdf', generateTicketsPdf);

router.get('/:eventId/ticket-types', getTicketTypesForEvent);
router.post('/:eventId/ticket-types', authenticateToken, createTicketType);
router.get('/ticket-types/:ticketTypeId', getTicketTypeById);
router.patch('/:eventId/ticket-types/:ticketTypeId', authenticateToken, updateTicketType);
router.delete('/:eventId/ticket-types/:ticketTypeId', authenticateToken, deleteTicketType);

router.post('/', authenticateToken, upload, createEvent);
router.delete('/:id', authenticateToken, deleteEvent);
router.patch('/:id', authenticateToken, upload, updateEvent);
router.get('/:id', getEventById);

export default router;