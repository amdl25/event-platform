import express from 'express';
import { getAllEvents, getEventById } from '../controllers/EventController.js';
import { joinEvent } from '../controllers/ParticipationController.js';

const router = express.Router();

router.get('/', getAllEvents);
router.post('/join', joinEvent);
router.get('/:id', getEventById);

export default router;