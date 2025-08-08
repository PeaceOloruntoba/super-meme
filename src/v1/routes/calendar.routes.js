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

const router = express.Router();

// Base route for creating and getting all events
router
  .route("/")
  .post(isAuth, createEvent)
  .get(isAuth, getAllEvents)
  .all(methodNotAllowed);

// Routes for specific event actions (get, update, delete)
router
  .route("/:eventId")
  .get(isAuth, getSingleEvent)
  .patch(isAuth, updateEvent)
  .delete(isAuth, deleteEvent)
  .all(methodNotAllowed);

export default router;
