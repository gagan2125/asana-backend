const Event = require("../models/eventModel");

exports.addEvent = async (req, res) => {
    try {
        const {
            organizer_id,
            event_name,
            start_date,
            end_date,
            venue_name,
            address,
            event_description,
            flyer,
            tickets,
        } = req.body;

        const newEvent = new Event({
            organizer_id,
            event_name,
            start_date,
            end_date,
            venue_name,
            address,
            event_description,
            flyer,
            tickets,
        });

        const savedEvent = await newEvent.save();

        res.status(201).json({
            message: "Event created successfully",
            event: savedEvent,
        });
    } catch (error) {
        console.error("Error creating event:", error);
        res.status(500).json({
            message: "Failed to create event",
            error: error.message,
        });
    }
};

exports.getAllEvents = async (req, res) => {
    try {
        const events = await Event.find();
        res.status(200).json(events);
    } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json({
            message: "Failed to fetch events",
            error: error.message,
        });
    }
};

exports.getEventById = async (req, res) => {
    try {
        const eventId = req.params.id;
        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        res.status(200).json(event);
    } catch (error) {
        console.error("Error fetching event:", error);
        res.status(500).json({
            message: "Failed to fetch event",
            error: error.message,
        });
    }
};

exports.updateEvent = async (req, res) => {
    try {
        const eventId = req.params.id;
        const updatedData = req.body;

        const updatedEvent = await Event.findByIdAndUpdate(eventId, updatedData, {
            new: true,
            runValidators: true,
        });

        if (!updatedEvent) {
            return res.status(404).json({ message: "Event not found" });
        }

        res.status(200).json({
            message: "Event updated successfully",
            event: updatedEvent,
        });
    } catch (error) {
        console.error("Error updating event:", error);
        res.status(500).json({
            message: "Failed to update event",
            error: error.message,
        });
    }
};

exports.deleteEvent = async (req, res) => {
    try {
        const eventId = req.params.id;
        const deletedEvent = await Event.findByIdAndDelete(eventId);

        if (!deletedEvent) {
            return res.status(404).json({ message: "Event not found" });
        }

        res.status(200).json({
            message: "Event deleted successfully",
            event: deletedEvent,
        });
    } catch (error) {
        console.error("Error deleting event:", error);
        res.status(500).json({
            message: "Failed to delete event",
            error: error.message,
        });
    }
};