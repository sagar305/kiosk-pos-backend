import express from 'express';
import {
  initiateSignup,
  verifySignupOtp,
  completeSignup,
  login,
  refresh,
  logout,
  me,
} from '../controllers/authController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/signup/initiate', initiateSignup);
router.post('/signup/verify-otp', verifySignupOtp);
router.post('/signup/complete', completeSignup);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

export default router;
