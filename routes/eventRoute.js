const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");

router.post("/add-event", eventController.upload, eventController.addEvent);
router.get("/get-event", eventController.getAllEvents)
router.get("/get-event-by-id/:id", eventController.getEventById)
router.get("/get-event-by-organizer-id/:id", eventController.getEventByOrganizerId)
router.put("/update-event/:id", eventController.upload, eventController.updateEvent)
router.delete("/delete-event/:id", eventController.deleteEvent)

module.exports = router;