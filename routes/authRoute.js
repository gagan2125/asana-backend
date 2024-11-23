const express = require('express');
const { sendOtp, verifyOtp, basicInfo } = require('../controllers/authController');

const router = express.Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/basic-info/:id', basicInfo);

module.exports = router;
