const mongoose = require("mongoose");

const organizerSchema = new mongoose.Schema({
    name: { type: String },
    stripeAccountId: { type: String },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, {
    timestamps: true
});

module.exports = mongoose.model("Organizer", organizerSchema);
