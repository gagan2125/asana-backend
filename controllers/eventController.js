const Event = require("../models/eventModel");
const mongoose = require("mongoose");

const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const s3 = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    region: process.env.AWS_REGION,
});

const storage = multer.memoryStorage();

exports.upload = multer({ storage: storage }).single('flyer');

exports.addEvent = async (req, res) => {
    try {
        console.log(req.file);

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        const {
            organizer_id,
            event_name,
            start_date,
            end_date,
            open_time,
            category,
            venue_name,
            address,
            event_description,
            language,
            duration,
            min_age,
            min_age_ticket,
            ticket_start_price,
            font,
            color,
            explore,
            status,
            tickets,
        } = req.body;

        const fileName = `${Date.now()}-${req.file.originalname}`;
        const uploadParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        };

        const command = new PutObjectCommand(uploadParams);
        const uploadResult = await s3.send(command);

        const newEvent = new Event({
            organizer_id,
            event_name,
            start_date,
            end_date,
            open_time,
            category,
            venue_name,
            address,
            event_description,
            flyer: `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${fileName}`,
            language,
            duration,
            min_age,
            min_age_ticket,
            ticket_start_price,
            font,
            color,
            explore,
            status,
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

exports.getEventByOrganizerId = async (req, res) => {
    try {
        const organizerId = req.params.id;
        const objectId = new mongoose.Types.ObjectId(organizerId);

        const events = await Event.find({ organizer_id: objectId });

        if (!events || events.length === 0) {
            return res.status(404).json({ message: "No events found for this organizer" });
        }

        res.status(200).json(events);
    } catch (error) {
        console.error("Error fetching events by organizer ID:", error);
        if (error instanceof mongoose.Error.CastError) {
            return res.status(400).json({
                message: "Invalid organizer ID format",
                error: error.message,
            });
        }

        res.status(500).json({
            message: "Failed to fetch events by organizer ID",
            error: error.message,
        });
    }
};


exports.updateEvent = async (req, res) => {
    try {
        const eventId = req.params.id;
        const updatedData = req.body;
        if (req.file) {
            console.log("File uploaded:", req.file);
            const fileName = `${Date.now()}-${req.file.originalname}`;

            const uploadParams = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: fileName,
                Body: req.file.buffer,
                ContentType: req.file.mimetype,
            };

            const command = new PutObjectCommand(uploadParams);
            const uploadResult = await s3.send(command);
            updatedData.flyer = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${fileName}`;
        }
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