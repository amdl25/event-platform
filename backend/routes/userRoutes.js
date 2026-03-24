import express from 'express';
import { getUserProfile, setInterests } from '../controllers/UserController.js';

const router = express.Router();

router.get('/:id', getUserProfile);
router.post('/set-interests', setInterests);

export default router;