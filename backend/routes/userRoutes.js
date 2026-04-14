import express from 'express';
import { getMyLoyaltySummary, getUserProfile, setInterests } from '../controllers/UserController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/me/loyalty', authenticateToken, getMyLoyaltySummary);
router.get('/:id', authenticateToken, getUserProfile);
router.post('/set-interests', authenticateToken, setInterests);

export default router;