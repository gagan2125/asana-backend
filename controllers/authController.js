const User = require('../models/authModel');
const twilio = require('twilio');
const jwt = require('jsonwebtoken');

const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

exports.sendOtp = async (req, res) => {
    const { phoneNumber } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    try {
        await twilioClient.messages.create({
            body: `Your OTP is ${otp}`,
            messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
            to: phoneNumber,
        });
        res.status(200).json({ success: true, message: 'OTP sent' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
};

exports.verifyOtp = async (req, res) => {
    const { phoneNumber, otp } = req.body;

    try {
        const user = await User.findOne({ phoneNumber });

        if (!user) {
            const authToken = jwt.sign({ phoneNumber }, process.env.JWT_SECRET, { expiresIn: '1h' });
            let newUser = new User({
                phoneNumber,
                authToken,
            });
            await newUser.save();

            res.status(200).json({ success: true, userID: newUser._id, authToken: authToken });
        } else {
            res.status(200).json({ success: true, userID: user._id, authToken: user.authToken });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Verification failed' });
    }
};

exports.basicInfo = async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, email } = req.body;

    try {
        const updatedUser = await User.findByIdAndUpdate(
            id,
            { firstName, lastName, email },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, message: 'User updated successfully', data: updatedUser });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

exports.getUserById = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Failed to fetch user", error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const userId = req.params.id;
        const updateData = req.body;
        const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({
            message: "User updated successfully",
            user: updatedUser
        });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Failed to update user", error: error.message });
    }
};