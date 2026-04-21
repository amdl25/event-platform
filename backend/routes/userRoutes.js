import express from 'express';
import { getMyLoyaltySummary, getUserProfile, setInterests, updateMyProfile } from '../controllers/UserController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/me/loyalty', authenticateToken, getMyLoyaltySummary);
router.patch('/me', authenticateToken, updateMyProfile);
router.get('/:id', authenticateToken, getUserProfile);
router.post('/set-interests', authenticateToken, setInterests);

export default router;