import express from 'express';
import { register, login, setInterests } from '../controllers/AuthController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

router.post('/set-interests', setInterests);

export default router;