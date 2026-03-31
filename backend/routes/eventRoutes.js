import express from 'express';
import { createEvent, getAllEvents, getEventById, getUserCalendarEvents } from '../controllers/EventController.js';
import { joinEvent } from '../controllers/ParticipationController.js';
import { purchaseAsGuest, purchaseAsUser, sendTicketsByEmail } from '../controllers/BookingController.js';
import { confirmInviteParticipation, getInvitePreview } from '../controllers/InviteController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getAllEvents);
router.get('/calendar/:userId', authenticateToken, getUserCalendarEvents);
router.get('/invite/:eventId', getInvitePreview);
router.post('/invite/:eventId/confirm', authenticateToken, confirmInviteParticipation);
router.post('/join', authenticateToken, joinEvent);
router.post('/purchase/user', authenticateToken, purchaseAsUser);
router.post('/purchase/guest', purchaseAsGuest);
router.post('/tickets/send-email', sendTicketsByEmail);
router.post('/', authenticateToken, createEvent);
router.get('/:id', getEventById);

export default router;