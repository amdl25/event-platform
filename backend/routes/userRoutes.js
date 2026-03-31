import express from 'express';
import { getUserProfile, setInterests } from '../controllers/UserController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/:id', authenticateToken, getUserProfile);
router.post('/set-interests', authenticateToken, setInterests);

export default router;