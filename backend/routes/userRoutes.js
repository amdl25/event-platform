import express from 'express';
import { getUserProfile, setInterests, removeInterest, addInterests  } from '../controllers/UserController.js';

const router = express.Router();

router.get('/:id', getUserProfile);
router.post('/set-interests', setInterests);

router.delete('/:userId/interests/:interestId', removeInterest);

router.post('/:userId/interests', addInterests);

export default router;