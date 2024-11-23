const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");

router.post("/add-event", eventController.addEvent);
router.get("/get-event", eventController.getAllEvents)
router.get("/get-event-by-id/:id", eventController.getEventById)
router.put("/update-event/:id", eventController.updateEvent)
router.delete("/delete-event/:id", eventController.deleteEvent)

module.exports = router;