import express from 'express';
const router = express.Router();
import { getAllEvents } from '../controllers/EventController.js';
import { joinEvent } from '../controllers/ParticipationController.js';

router.get('/events', getAllEvents);
router.post('/events/join', joinEvent);

export default router;