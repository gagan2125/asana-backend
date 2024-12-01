const express = require('express');
const { sendOtp, verifyOtp, basicInfo, getUserById, update } = require('../controllers/authController');

const router = express.Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/basic-info/:id', basicInfo);
router.get('/get-user-by-id/:id', getUserById);
router.put("/update-user/:id", update)

module.exports = router;
