import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';

import { 
    registerUser, 
    loginUser, 
    sendEmailOtp, 
    verifyEmailOtp,
    getMe, 
    updateMe
} from '../controllers/auth.controller';

import { 
    validateRegister, 
    validateLogin, 
    validateEmailOtp,
    validateUpdateProfile
} from '../validators/auth.validator';

const router = Router();

// --- Public Authentication Routes ---
router.post('/register', validateRegister, registerUser);
router.post('/login', validateLogin, loginUser);

// --- Passwordless OTP Flow ---
router.post('/otp/send', validateEmailOtp, sendEmailOtp);
router.post('/otp/verify', validateEmailOtp, verifyEmailOtp);

// --- Protected Profile Route ---
router.route('/me')
  .get(protect, getMe)
  .put(protect, validateUpdateProfile, updateMe);

export default router;