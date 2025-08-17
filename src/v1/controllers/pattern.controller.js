import asyncWrapper from "../../middlewares/asyncWrapper.js";
import patternService from "../services/pattern.service.js";
import ApiError from "../../utils/apiError.js";

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

export const getPublicPatterns = asyncWrapper(async (req, res, next) => {
  // Updated from getAll
  const result = await patternService.getPublicPatterns();
  res.status(result.statusCode).json(result);
});

export const getAllPatterns = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const result = await patternService.getAllPatterns(userId);
  res.status(result.statusCode).json(result);
});

export const getSinglePattern = asyncWrapper(async (req, res, next) => {
  const { patternId } = req.params;
  const { userId } = req.user;
  const result = await patternService.getSinglePattern(patternId, userId);
  res.status(result.statusCode).json(result);
});

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

export const deletePattern = asyncWrapper(async (req, res, next) => {
  const { patternId } = req.params;
  const { userId } = req.user;
  const result = await patternService.deletePattern(patternId, userId);
  res.status(result.statusCode).json(result);
});
