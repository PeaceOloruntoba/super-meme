import Measurements from "../models/measurements.model.js";
import ApiError from "../../utils/apiError.js";

const measurementsService = {
  /**
   * Creates a new measurement record for a specific client.
   * @param {string} userId - The ID of the user creating the measurement.
   * @param {object} measurementData - The measurement data.
   * @returns {Promise<object>} The newly created measurement.
   */
  createMeasurement: async (userId, measurementData) => {
    const newMeasurement = await Measurements.create({
      ...measurementData,
      userId,
    });
    return {
      success: true,
      statusCode: 201,
      message: "Measurement record created successfully.",
      data: { measurement: newMeasurement },
    };
  },

  /**
   * Retrieves all measurement records for an authenticated user.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object>} An array of measurement records.
   */
  getAllMeasurements: async (userId) => {
    const measurements = await Measurements.find({ userId }).sort({
      createdAt: -1,
    });
    return {
      success: true,
      statusCode: 200,
      message: "Measurements retrieved successfully.",
      data: { measurements },
    };
  },

  /**
   * Retrieves all measurement records for a specific client.
   * @param {string} userId - The ID of the user.
   * @param {string} clientId - The ID of the client.
   * @returns {Promise<object>} An array of measurement records.
   */
  getAllMeasurementsByClient: async (userId, clientId) => {
    const measurements = await Measurements.find({ userId, clientId }).sort({
      createdAt: -1,
    });
    return {
      success: true,
      statusCode: 200,
      message: "Measurements retrieved successfully.",
      data: { measurements },
    };
  },

  /**
   * Retrieves a single measurement record by its ID.
   * @param {string} measurementId - The ID of the measurement record.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object>} The single measurement record.
   */
  getSingleMeasurement: async (measurementId, userId) => {
    const measurement = await Measurements.findOne({
      _id: measurementId,
      userId,
    });
    if (!measurement) {
      throw ApiError.notFound("Measurement record not found.");
    }
    return {
      success: true,
      statusCode: 200,
      message: "Measurement retrieved successfully.",
      data: { measurement },
    };
  },

  /**
   * Updates an existing measurement record.
   * @param {string} measurementId - The ID of the measurement to update.
   * @param {string} userId - The ID of the user.
   * @param {object} updateData - The data to update.
   * @returns {Promise<object>} The updated measurement record.
   */
  updateMeasurement: async (measurementId, userId, updateData) => {
    const updatedMeasurement = await Measurements.findOneAndUpdate(
      { _id: measurementId, userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!updatedMeasurement) {
      throw ApiError.notFound(
        "Measurement record not found or you don't have permission to update it."
      );
    }
    return {
      success: true,
      statusCode: 200,
      message: "Measurement record updated successfully.",
      data: { measurement: updatedMeasurement },
    };
  },

  /**
   * Deletes a measurement record.
   * @param {string} measurementId - The ID of the measurement to delete.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object>} A confirmation message.
   */
  deleteMeasurement: async (measurementId, userId) => {
    const measurement = await Measurements.findOneAndDelete({
      _id: measurementId,
      userId,
    });
    if (!measurement) {
      throw ApiError.notFound(
        "Measurement record not found or you don't have permission to delete it."
      );
    }
    return {
      success: true,
      statusCode: 200,
      message: "Measurement record deleted successfully.",
      data: null,
    };
  },
};

export default measurementsService;
