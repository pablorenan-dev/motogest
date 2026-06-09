import express from 'express';
import { login, registro } from '../controllers/authController.js';

const router = express.Router();

router.post('/login',    login);
router.post('/registro', registro);

export default router;