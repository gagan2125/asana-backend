const mongoose = require("mongoose");

const payoutSchema = new mongoose.Schema({
    amount: { type: Number },
    currency: { type: String },
    organizerId: mongoose.Schema.Types.ObjectId,
    userId: mongoose.Schema.Types.ObjectId,
    transferGroup: { type: String },
    isTransferred: { type: Boolean, default: false },
}, {
    timestamps: true
});

module.exports = mongoose.model("Payout", payoutSchema);
