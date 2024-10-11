// routes/auth.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Student Authentication Routes
router.post("/student/signup", authController.studentSignup);
router.post("/student/login", authController.studentLogin);

// Shopkeeper Authentication Routes
router.post("/shopkeeper/signup", authController.shopkeeperSignup);
router.post("/shopkeeper/login", authController.shopkeeperLogin);

// Forgot Password Route
router.post("/forgot-password", authController.forgotPassword);

// Reset Password Route
router.post("/reset-password", authController.resetPassword);

module.exports = router;
