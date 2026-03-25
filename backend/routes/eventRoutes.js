import express from 'express';
import { getAllEvents, getEventById } from '../controllers/EventController.js';
import { joinEvent } from '../controllers/ParticipationController.js';
import { purchaseAsGuest, purchaseAsUser } from '../controllers/BookingController.js';

const router = express.Router();

router.get('/', getAllEvents);
router.post('/join', joinEvent);
router.post('/purchase/user', purchaseAsUser);
router.post('/purchase/guest', purchaseAsGuest);
router.get('/:id', getEventById);

export default router;