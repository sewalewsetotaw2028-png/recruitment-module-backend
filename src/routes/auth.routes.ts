import { Router, RequestHandler } from "express";
import {
  register,
  login,
  getMe,
  refresh,
  logout,
  emailSignin,
  googleRedirect,
  googleCallback,
  verifyEmail,
  resendVerification,
  magicLinkCallback,
} from '../controllers/auth.controller';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/email-signin', emailSignin);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.get('/magic-link/callback', magicLinkCallback);
router.get('/google', googleRedirect);
router.get('/google/callback', googleCallback);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get("/me", authenticate as RequestHandler, getMe as RequestHandler);

export default router;
