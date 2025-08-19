import express from "express";
import methodNotAllowed from "../../middlewares/methodNotAllowed.js";
import { isAuth } from "../../middlewares/auth.js";
import {
  createEvent,
  deleteEvent,
  getAllEvents,
  getSingleEvent,
  updateEvent,
} from "../controllers/calendar.controller.js";
import { requireFeature } from "../../middlewares/planEnforcement.js";

const router = express.Router();

// Base route for creating and getting all events
router
  .route("/")
  .post(isAuth, requireFeature("hasCalendarScheduling"), createEvent)
  .get(isAuth, requireFeature("hasCalendarScheduling"), getAllEvents)
  .all(methodNotAllowed);

// Routes for specific event actions (get, update, delete)
router
  .route("/:eventId")
  .get(isAuth, requireFeature("hasCalendarScheduling"), getSingleEvent)
  .patch(isAuth, requireFeature("hasCalendarScheduling"), updateEvent)
  .delete(isAuth, requireFeature("hasCalendarScheduling"), deleteEvent)
  .all(methodNotAllowed);

export default router;
