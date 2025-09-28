import { Router } from "express";
import { protect } from "../middleware/auth.middleware";

import {
  registerUser,
  loginUser,
  checkUserExists,
  sendEmailOtp,
  verifyEmailOtp,
  getMe,
  updateMe,
  addAddress,
  updateAddress,
  deleteAddress,
  getAddresses,
} from "../controllers/auth.controller";

import {
  validateRegister,
  validateLogin,
  validateEmailOtp,
  validateUpdateProfile,
} from "../validators/auth.validator";

const router = Router();

// --- Public Authentication Routes ---
router.post("/register", validateRegister, registerUser);
router.post("/login", validateLogin, loginUser);

// --- User Check Route ---
router.post("/check-user", checkUserExists);

// --- Passwordless OTP Flow ---
router.post("/otp/send", validateEmailOtp, sendEmailOtp);
router.post("/otp/verify", validateEmailOtp, verifyEmailOtp);

// --- Protected Profile Route ---
router
  .route("/me")
  .get(protect, getMe)
  .put(protect, validateUpdateProfile, updateMe);

// --- Protected Address Management Routes ---
router.route("/addresses").get(protect, getAddresses).post(protect, addAddress);

router
  .route("/addresses/:addressId")
  .put(protect, updateAddress)
  .delete(protect, deleteAddress);

export default router;
