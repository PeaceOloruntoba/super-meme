import Pattern from "../models/pattern.model.js";
import ApiError from "../../utils/apiError.js";
import {
  uploadBase64ToCloudinary,
  deleteFileFromCloudinary,
} from "../../utils/cloudinary.config.js";
import {
  generatePatternImage,
  generateFashionSampleImage,
  generateInstructions,
  generateMaterials,
} from "../../utils/aiGenerator.js";
import mongoose from "mongoose";

const patternService = {
  createPattern: async (
    userId,
    patternData,
    base64Image = null,
    isAiGeneratedRequest = false
  ) => {
    try {
      const imageUrls = [];
      let finalIsAiGenerated = false;
      let instructions = [];
      let materials = [];

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

        instructions = await generateInstructions(patternData);
        materials = await generateMaterials(patternData);

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
        userId, // Assume userId is string
        image_urls: imageUrls,
        isAiGenerated: finalIsAiGenerated,
        instructions,
        materials,
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

  getPublicPatterns: async () => {
    // Renamed from getAll, for public (general)
    try {
      const patterns = await Pattern.find({ userId: "general" }).sort({
        createdAt: -1,
      });
      return {
        success: true,
        statusCode: 200,
        message: "Public patterns retrieved successfully.",
        data: { patterns },
      };
    } catch (error) {
      console.error("Error retrieving public patterns:", error);
      throw ApiError.internalServerError("Failed to retrieve patterns.");
    }
  },

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

  getSinglePattern: async (patternId, userId) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(patternId)) {
        throw ApiError.badRequest("Invalid Pattern ID format.");
      }

      const pattern = await Pattern.findOne({ _id: patternId });

      if (!pattern) {
        throw ApiError.notFound("Pattern not found.");
      }

      // Allow access if it's user's own or public
      if (pattern.userId !== userId && pattern.userId !== "general") {
        throw ApiError.forbidden(
          "You don't have permission to access this pattern."
        );
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

  updatePattern: async (patternId, userId, updateData, base64Image = null) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(patternId)) {
        throw ApiError.badRequest("Invalid Pattern ID format.");
      }

      const existingPattern = await Pattern.findById(patternId);
      if (!existingPattern) {
        throw ApiError.notFound("Pattern not found.");
      }

      if (existingPattern.userId !== userId) {
        // TODO: Add admin check here, e.g., if (!req.user.isAdmin) throw forbidden
        throw ApiError.forbidden(
          "You don't have permission to update this pattern."
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

      const updatedPattern = await Pattern.findByIdAndUpdate(
        patternId,
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

  deletePattern: async (patternId, userId) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(patternId)) {
        throw ApiError.badRequest("Invalid Pattern ID format.");
      }

      const pattern = await Pattern.findById(patternId);

      if (!pattern) {
        throw ApiError.notFound("Pattern not found.");
      }

      if (pattern.userId !== userId) {
        // TODO: Add admin check here
        throw ApiError.forbidden(
          "You don't have permission to delete this pattern."
        );
      }

      // Instead of deleting, move to general (public)
      pattern.userId = "general";
      await pattern.save();

      // Optionally, delete images if needed, but keeping for public
      // for (const url of pattern.image_urls) {
      //   await deleteFileFromCloudinary(url);
      // }

      return {
        success: true,
        statusCode: 200,
        message: "Pattern moved to public successfully.",
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
