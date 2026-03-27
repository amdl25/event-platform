import express from 'express';
import { createEvent, getAllEvents, getEventById, getUserCalendarEvents } from '../controllers/EventController.js';
import { joinEvent } from '../controllers/ParticipationController.js';
import { purchaseAsGuest, purchaseAsUser } from '../controllers/BookingController.js';
import { confirmInviteParticipation, getInvitePreview } from '../controllers/InviteController.js';

const router = express.Router();

router.get('/', getAllEvents);
router.get('/calendar/:userId', getUserCalendarEvents);
router.get('/invite/:eventId', getInvitePreview);
router.post('/invite/:eventId/confirm', confirmInviteParticipation);
router.post('/join', joinEvent);
router.post('/purchase/user', purchaseAsUser);
router.post('/purchase/guest', purchaseAsGuest);
router.post('/', createEvent);
router.get('/:id', getEventById);

export default router;