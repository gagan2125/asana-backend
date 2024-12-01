const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    party_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    transaction_id: { type: String },
    date: { type: String },
    amount: { type: Number },
    status: { type: String },
    payment_method: { type: String },
    qrcode: { type: String },
    qr_status: { type: String },
    count: { type: String },
    ticketId: { type: String }
}, {
    timestamps: true
});

module.exports = mongoose.model("Payment", paymentSchema);
