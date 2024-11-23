const mongoose = require('mongoose');

const AuthSchema = new mongoose.Schema({
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String },
    phoneNumber: { type: String, required: true, unique: true },
    authToken: { type: String }
}, {
    timestamps: true
});

module.exports = mongoose.model('User', AuthSchema);
