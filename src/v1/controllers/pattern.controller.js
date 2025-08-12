import asyncWrapper from "../../middlewares/asyncWrapper.js";
import patternService from "../services/pattern.service.js";
import ApiError from "../../utils/apiError.js";

/**
 * Controller to create a new pattern (AI-generated or user-drawn).
 * Expects `isAiGenerated` boolean and/or `base64Image` string in req.body.
 */
export const createPattern = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const { isAiGenerated, base64Image, ...patternData } = req.body;

  if (
    !patternData.garmentType ||
    !patternData.style ||
    !patternData.sizeRange ||
    !patternData.fabricType
  ) {
    throw ApiError.badRequest(
      "Garment Type, Style, Size Range, and Fabric Type are required for pattern creation."
    );
  }

  const result = await patternService.createPattern(
    userId,
    patternData,
    base64Image,
    isAiGenerated
  );
  res.status(result.statusCode).json(result);
});

/**
 * Controller to get all patterns.
 */
export const getAll = asyncWrapper(async (req, res, next) => {
  const result = await patternService.getAll();
  res.status(result.statusCode).json(result);
});

/**
 * Controller to get all patterns for a user.
 */
export const getAllPatterns = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const result = await patternService.getAllPatterns(userId);
  res.status(result.statusCode).json(result);
});

/**
 * Controller to get a single pattern.
 */
export const getSinglePattern = asyncWrapper(async (req, res, next) => {
  const { patternId } = req.params;
  const { userId } = req.user;
  const result = await patternService.getSinglePattern(patternId, userId);
  res.status(result.statusCode).json(result);
});

/**
 * Controller to update an existing pattern.
 * Can handle updating details or replacing the image with a new base64 string.
 */
export const updatePattern = asyncWrapper(async (req, res, next) => {
  const { patternId } = req.params;
  const { userId } = req.user;
  const { base64Image, ...updateData } = req.body;

  const result = await patternService.updatePattern(
    patternId,
    userId,
    updateData,
    base64Image
  );
  res.status(result.statusCode).json(result);
});

/**
 * Controller to delete a pattern.
 */
export const deletePattern = asyncWrapper(async (req, res, next) => {
  const { patternId } = req.params;
  const { userId } = req.user;
  const result = await patternService.deletePattern(patternId, userId);
  res.status(result.statusCode).json(result);
});
