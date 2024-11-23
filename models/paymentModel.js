const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
    user_id: { type: String },
    party_id: { type: String },
    transaction_id: { type: String },
    date: { type: Date, default: Date.now },
    amount: { type: Number },
    status: { type: String },
    payment_method: { type: String },
}, {
    timestamps: true
});

module.exports = mongoose.model("Payment", paymentSchema);
