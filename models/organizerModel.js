const mongoose = require("mongoose");

const organizerSchema = new mongoose.Schema({
    name: { type: String },
    stripeAccountId: { type: String },
}, {
    timestamps: true
});

module.exports = mongoose.model("Organizer", organizerSchema);
