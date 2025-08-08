import asyncWrapper from "../../middlewares/asyncWrapper.js";
import calendarEventService from "../services/calendar.service.js";
import ApiError from "../../utils/apiError.js";

/**
 * Controller to create a new calendar event.
 */
export const createEvent = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const eventData = req.body;
  const result = await calendarEventService.createEvent(userId, eventData);
  res.status(result.statusCode).json(result);
});

/**
 * Controller to get all calendar events for a user.
 */
export const getAllEvents = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const result = await calendarEventService.getAllEvents(userId);
  res.status(result.statusCode).json(result);
});

/**
 * Controller to get a single calendar event.
 */
export const getSingleEvent = asyncWrapper(async (req, res, next) => {
  const { eventId } = req.params;
  const { userId } = req.user;

  if (!eventId) {
    throw ApiError.badRequest("Event ID is required.");
  }

  const result = await calendarEventService.getSingleEvent(eventId, userId);
  res.status(result.statusCode).json(result);
});

/**
 * Controller to update an existing calendar event.
 */
export const updateEvent = asyncWrapper(async (req, res, next) => {
  const { eventId } = req.params;
  const { userId } = req.user;
  const updateData = req.body;

  if (!eventId) {
    throw ApiError.badRequest("Event ID is required.");
  }

  const result = await calendarEventService.updateEvent(
    eventId,
    userId,
    updateData
  );
  res.status(result.statusCode).json(result);
});

/**
 * Controller to delete a calendar event.
 */
export const deleteEvent = asyncWrapper(async (req, res, next) => {
  const { eventId } = req.params;
  const { userId } = req.user;

  if (!eventId) {
    throw ApiError.badRequest("Event ID is required.");
  }

  const result = await calendarEventService.deleteEvent(eventId, userId);
  res.status(result.statusCode).json(result);
});
