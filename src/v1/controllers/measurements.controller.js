import asyncWrapper from "../../middlewares/asyncWrapper.js";
import measurementsService from "../services/measurements.service.js";
import ApiError from "../../utils/apiError.js";

/**
 * Controller to create a new measurement record.
 */
export const createMeasurement = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const { clientId } = req.params;
  const measurementData = req.body;
  if (!clientId) {
    throw ApiError.badRequest("Client ID is required in the URL parameters.");
  }
  const result = await measurementsService.createMeasurement(
    userId,
    clientId,
    measurementData
  );
  res.status(result.statusCode).json(result);
});

/**
 * Controller to get all measurement records for a specific client.
 */
export const getAllMeasurementsByClient = asyncWrapper(
  async (req, res, next) => {
    const { userId } = req.user;
    const { clientId } = req.params;
    if (!clientId) {
      throw ApiError.badRequest("Client ID is required in the URL parameters.");
    }
    const result = await measurementsService.getAllMeasurementsByClient(
      userId,
      clientId
    );
    res.status(result.statusCode).json(result);
  }
);

/**
 * Controller to get a single measurement record.
 */
export const getSingleMeasurement = asyncWrapper(async (req, res, next) => {
  const { measurementId } = req.params;
  const { userId } = req.user;
  if (!measurementId) {
    throw ApiError.badRequest("Measurement ID is required.");
  }
  const result = await measurementsService.getSingleMeasurement(
    measurementId,
    userId
  );
  res.status(result.statusCode).json(result);
});

/**
 * Controller to update an existing measurement record.
 */
export const updateMeasurement = asyncWrapper(async (req, res, next) => {
  const { measurementId } = req.params;
  const { userId } = req.user;
  const updateData = req.body;
  if (!measurementId) {
    throw ApiError.badRequest("Measurement ID is required.");
  }
  const result = await measurementsService.updateMeasurement(
    measurementId,
    userId,
    updateData
  );
  res.status(result.statusCode).json(result);
});

/**
 * Controller to delete a measurement record.
 */
export const deleteMeasurement = asyncWrapper(async (req, res, next) => {
  const { measurementId } = req.params;
  const { userId } = req.user;
  if (!measurementId) {
    throw ApiError.badRequest("Measurement ID is required.");
  }
  const result = await measurementsService.deleteMeasurement(
    measurementId,
    userId
  );
  res.status(result.statusCode).json(result);
});
