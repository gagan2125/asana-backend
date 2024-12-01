const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
    ticket_name: { type: String },
    qty: { type: Number, min: 0 },
    price: { type: Number, min: 0 },
    sale_start: { type: String },
    sale_end: { type: String },
    valid_start: { type: String },
    valid_end: { type: String },
    min_count: { type: String },
    max_count: { type: String },
    password: { type: String },
    ticket_description: { type: String, maxlength: 500 },
});

const eventSchema = new mongoose.Schema(
    {
        organizer_id: { type: mongoose.Schema.Types.ObjectId, ref: "Organizer" },
        event_name: { type: String, maxlength: 200 },
        start_date: { type: String },
        end_date: { type: String },
        open_time: { type: String },
        category: { type: String },
        venue_name: { type: String, maxlength: 200 },
        address: { type: String, maxlength: 500 },
        event_description: { type: String, maxlength: 2000 },
        flyer: { type: String },
        language: { type: String },
        duration: { type: String },
        min_age: { type: String },
        min_age_ticket: { type: String },
        ticket_start_price: { type: String },
        font: { type: String },
        color: { type: String },
        explore: { type: String },
        status: { type: String },
        tickets: [ticketSchema],
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Event", eventSchema);
