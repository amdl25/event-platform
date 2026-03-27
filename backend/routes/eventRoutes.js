import express from 'express';
import { getAllEvents, getEventById, getUserCalendarEvents } from '../controllers/EventController.js';
import { joinEvent } from '../controllers/ParticipationController.js';
import { purchaseAsGuest, purchaseAsUser } from '../controllers/BookingController.js';

const router = express.Router();

router.get('/', getAllEvents);
router.get('/calendar/:userId', getUserCalendarEvents);
router.post('/join', joinEvent);
router.post('/purchase/user', purchaseAsUser);
router.post('/purchase/guest', purchaseAsGuest);
router.get('/:id', getEventById);

export default router;