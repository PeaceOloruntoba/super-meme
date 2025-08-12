import Pattern from "../models/pattern.model.js";
import ApiError from "../../utils/apiError.js";
import {
  uploadBase64ToCloudinary,
  deleteFileFromCloudinary,
} from "../../utils/cloudinary.config.js";
import {
  generatePatternImage,
  generateFashionSampleImage,
} from "../../utils/aiGenerator.js";
import mongoose from "mongoose";

const patternService = {
  /**
   * Creates a new pattern, either AI-generated or user-drawn.
   * @param {string} userId - The ID of the user.
   * @param {object} patternData - The pattern details (garmentType, style, etc.).
   * @param {string} [base64Image] - Optional: Base64 string of a user-drawn pattern.
   * @param {boolean} [isAiGeneratedRequest=false] - If true, triggers AI generation.
   * @returns {Promise<object>} The newly created pattern.
   */
  createPattern: async (
    userId,
    patternData,
    base64Image = null,
    isAiGeneratedRequest = false
  ) => {
    try {
      const imageUrls = [];
      let finalIsAiGenerated = false;

      if (isAiGeneratedRequest) {
        const generatedPatternUrl = await generatePatternImage(
          patternData.garmentType,
          patternData.style,
          patternData.fabricType,
          patternData.sizeRange,
          patternData.occasion,
          patternData.additionalDetails
        );
        imageUrls.push(generatedPatternUrl);

        const fashionSampleUrl = await generateFashionSampleImage(
          patternData,
          generatedPatternUrl
        );
        imageUrls.push(fashionSampleUrl);

        finalIsAiGenerated = true;
      } else if (base64Image) {
        const uploadedUrl = await uploadBase64ToCloudinary(
          base64Image,
          "user-drawn-patterns"
        );
        imageUrls.push(uploadedUrl);
      } else {
        throw ApiError.badRequest(
          "No image data or AI generation request provided for pattern."
        );
      }

      const newPattern = await Pattern.create({
        ...patternData,
        userId,
        image_urls: imageUrls,
        isAiGenerated: finalIsAiGenerated,
      });

      return {
        success: true,
        statusCode: 201,
        message: "Pattern created successfully.",
        data: { pattern: newPattern },
      };
    } catch (error) {
      console.error("Error creating pattern:", error);
      if (error.name === "ValidationError") {
        throw ApiError.badRequest(error.message);
      }

      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internalServerError("Failed to create pattern.");
    }
  },

  /**
   * Retrieves all patterns
   * @returns {Promise<object>} An array of patterns.
   */
  getAll: async (userId) => {
    try {
      const patterns = await Pattern.find().sort({ createdAt: -1 });
      return {
        success: true,
        statusCode: 200,
        message: "Patterns retrieved successfully.",
        data: { patterns },
      };
    } catch (error) {
      console.error("Error retrieving all patterns:", error);
      throw ApiError.internalServerError("Failed to retrieve patterns.");
    }
  },

  /**
   * Retrieves all patterns for a specific user.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object>} An array of patterns.
   */
  getAllPatterns: async (userId) => {
    try {
      const patterns = await Pattern.find({ userId }).sort({ createdAt: -1 });
      return {
        success: true,
        statusCode: 200,
        message: "Patterns retrieved successfully.",
        data: { patterns },
      };
    } catch (error) {
      console.error("Error retrieving all patterns:", error);
      throw ApiError.internalServerError("Failed to retrieve patterns.");
    }
  },

  /**
   * Retrieves a single pattern by its ID.
   * @param {string} patternId - The ID of the pattern.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object>} The single pattern.
   */
  getSinglePattern: async (patternId, userId) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(patternId)) {
        throw ApiError.badRequest("Invalid Pattern ID format.");
      }

      const pattern = await Pattern.findOne({ _id: patternId, userId });

      if (!pattern) {
        throw ApiError.notFound("Pattern not found.");
      }

      return {
        success: true,
        statusCode: 200,
        message: "Pattern retrieved successfully.",
        data: { pattern },
      };
    } catch (error) {
      console.error(`Error retrieving single pattern ${patternId}:`, error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internalServerError("Failed to retrieve pattern.");
    }
  },

  /**
   * Updates an existing pattern.
   * @param {string} patternId - The ID of the pattern to update.
   * @param {string} userId - The ID of the user.
   * @param {object} updateData - The data to update.
   * @param {string} [base64Image] - Optional: New base64 image if user wants to replace it.
   * @returns {Promise<object>} The updated pattern.
   */
  updatePattern: async (patternId, userId, updateData, base64Image = null) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(patternId)) {
        throw ApiError.badRequest("Invalid Pattern ID format.");
      }

      const existingPattern = await Pattern.findOne({ _id: patternId, userId });
      if (!existingPattern) {
        throw ApiError.notFound(
          "Pattern not found or you don't have permission to update it."
        );
      }

      if (base64Image) {
        for (const url of existingPattern.image_urls) {
          await deleteFileFromCloudinary(url);
        }

        const newImageUrl = await uploadBase64ToCloudinary(
          base64Image,
          "user-drawn-patterns"
        );
        updateData.image_urls = [newImageUrl];
        updateData.isAiGenerated = false;
      } else if (updateData.image_urls) {
        const oldImageUrlsToDelete = existingPattern.image_urls.filter(
          (url) => !updateData.image_urls.includes(url)
        );
        for (const url of oldImageUrlsToDelete) {
          await deleteFileFromCloudinary(url);
        }
      }

      const updatedPattern = await Pattern.findOneAndUpdate(
        { _id: patternId, userId },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      return {
        success: true,
        statusCode: 200,
        message: "Pattern updated successfully.",
        data: { pattern: updatedPattern },
      };
    } catch (error) {
      console.error(`Error updating pattern ${patternId}:`, error);
      if (error instanceof ApiError) {
        throw error;
      }
      if (error.name === "ValidationError") {
        throw ApiError.badRequest(error.message);
      }
      throw ApiError.internalServerError("Failed to update pattern.");
    }
  },

  /**
   * Deletes a pattern.
   * @param {string} patternId - The ID of the pattern to delete.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object>} A confirmation message.
   */
  deletePattern: async (patternId, userId) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(patternId)) {
        throw ApiError.badRequest("Invalid Pattern ID format.");
      }

      const pattern = await Pattern.findOneAndDelete({
        _id: patternId,
        userId,
      });

      if (!pattern) {
        throw ApiError.notFound(
          "Pattern not found or you don't have permission to delete it."
        );
      }

      for (const url of pattern.image_urls) {
        await deleteFileFromCloudinary(url);
      }

      return {
        success: true,
        statusCode: 200,
        message: "Pattern deleted successfully.",
        data: null,
      };
    } catch (error) {
      console.error(`Error deleting pattern ${patternId}:`, error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internalServerError("Failed to delete pattern.");
    }
  },
};

export default patternService;
