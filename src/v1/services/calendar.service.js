import Calendar from "../models/calendar.model.js";
import User from "../models/user.model.js";
import Client from "../models/client.model.js";
import ApiError from "../../utils/apiError.js";
import emailService from "./email.service.js";

const calendar = {
  /**
   * Creates a new calendar event for a specific user.
   * @param {string} userId - The ID of the user creating the event.
   * @param {object} eventData - The event data.
   * @returns {Promise<object>} The newly created event.
   */
  createEvent: async (userId, eventData) => {
    const newEvent = await Calendar.create({ ...eventData, userId });

    if (newEvent.type === "deadline") {
      await calendar.sendDeadlineNotification(newEvent, userId);
    }

    return {
      success: true,
      statusCode: 201,
      message: "Event created successfully.",
      data: { event: newEvent },
    };
  },

  /**
   * Retrieves all calendar events for a specific user.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object>} An array of calendar events.
   */
  getAllEvents: async (userId) => {
    const events = await Calendar.find({ userId })
      .populate("clientId", "name email")
      .sort({ startTime: 1 });

    return {
      success: true,
      statusCode: 200,
      message: "Events retrieved successfully.",
      data: { events },
    };
  },

  /**
   * Retrieves a single calendar event by its ID.
   * @param {string} eventId - The ID of the event.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object>} The single event.
   */
  getSingleEvent: async (eventId, userId) => {
    const event = await Calendar.findOne({
      _id: eventId,
      userId,
    }).populate("clientId", "name email");

    if (!event) {
      throw ApiError.notFound("Event not found.");
    }

    return {
      success: true,
      statusCode: 200,
      message: "Event retrieved successfully.",
      data: { event },
    };
  },

  /**
   * Updates an existing calendar event.
   * @param {string} eventId - The ID of the event to update.
   * @param {string} userId - The ID of the user.
   * @param {object} updateData - The data to update.
   * @returns {Promise<object>} The updated event.
   */
  updateEvent: async (eventId, userId, updateData) => {
    const updatedEvent = await Calendar.findOneAndUpdate(
      { _id: eventId, userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedEvent) {
      throw ApiError.notFound(
        "Event not found or you don't have permission to update it."
      );
    }

    if (updatedEvent.type === "deadline") {
      await calendar.sendDeadlineNotification(updatedEvent, userId);
    }

    return {
      success: true,
      statusCode: 200,
      message: "Event updated successfully.",
      data: { event: updatedEvent },
    };
  },

  /**
   * Deletes a calendar event.
   * @param {string} eventId - The ID of the event to delete.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object>} A confirmation message.
   */
  deleteEvent: async (eventId, userId) => {
    const event = await Calendar.findOneAndDelete({
      _id: eventId,
      userId,
    });

    if (!event) {
      throw ApiError.notFound(
        "Event not found or you don't have permission to delete it."
      );
    }

    return {
      success: true,
      statusCode: 200,
      message: "Event deleted successfully.",
      data: null,
    };
  },

  /**
   * Helper function to send an email notification for a deadline.
   * @param {object} event - The deadline event object.
   * @param {string} userId - The ID of the user.
   */
  sendDeadlineNotification: async (event, userId) => {
    try {
      const user = await User.findById(userId);
      const client = await Client.findById(event.clientId);

      if (user?.settings?.projectDeadlines && client?.email) {
        const subject = `Deadline Notification for Project: ${event.title}`;
        const context = {
          clientName: client.name,
          userName: user.firstName,
          eventName: event.title,
          eventDate: event.endTime.toLocaleDateString(),
        };

        await emailService.sendTemplateEmail(
          client.email,
          subject,
          "deadlineNotificationTemplate",
          context
        );
        console.log(
          `Deadline notification sent to ${client.name} for event: ${event.title}`
        );
      }
    } catch (error) {
      console.error(
        `Failed to send deadline notification for event ${event._id}:`,
        error
      );
    }
  },
};

export default calendar;
