import User from "../models/user.model.js";
import ApiError from "../../utils/apiError.js";
import { uploadToCloudinary } from "./upload.service.js";

const userService = {
  /**
   * Updates a user's profile information.
   * @param {string} userId - The ID of the user to update.
   * @param {object} updateData - An object containing fields to update.
   * @returns {Promise<object>} - An object with success status, message, and updated user data.
   */
  updateProfile: async function (userId, updateData) {
    const user = await User.findById(userId);

    if (!user) {
      throw ApiError.notFound("User not found.");
    }

    const allowedFields = [
      "firstName",
      "lastName",
      "businessName",
      "businessType",
      "address",
      "bio",
      "website",
      "sendNewsletter",
      "revenueGoals",
    ];

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        user[field] = updateData[field];
      }
    });

    if (updateData.settings && typeof updateData.settings === "object") {
      const allowedSettingsFields = [
        "emailNotifications",
        "pushNotifications",
        "projectDeadlines",
        "clientMessages",
        "paymentReminders",
        "marketingEmails",
        "theme",
        "language",
        "timezone",
        "currency",
        "measurementUnit",
        "defaultProjectDuration",
      ];
      allowedSettingsFields.forEach((settingField) => {
        if (updateData.settings[settingField] !== undefined) {
          user.settings[settingField] = updateData.settings[settingField];
        }
      });
    }

    await user.save();

    user.password = undefined;

    return {
      success: true,
      status_code: 200,
      message: "Profile updated successfully.",
      data: { user },
    };
  },

  /**
   * Updates a user's profile image.
   * @param {string} userId - The ID of the user to update.
   * @param {object} imageFile - The file object from express-fileupload (e.g., req.files.image).
   * @returns {Promise<object>} - An object with success status, message, and updated user data.
   */
  updateImage: async function (userId, imageFile) {
    if (!imageFile || !imageFile.tempFilePath) {
      throw ApiError.badRequest("No image file provided for upload.");
    }

    const user = await User.findById(userId);

    if (!user) {
      throw ApiError.notFound("User not found.");
    }

    try {
      const imageUrl = await uploadToCloudinary(imageFile.tempFilePath);

      user.image = imageUrl;
      await user.save();

      user.password = undefined;

      return {
        success: true,
        status_code: 200,
        message: "Profile image updated successfully.",
        data: { user },
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internalServerError(
        "Failed to upload image: " + error.message
      );
    }
  },
};

export default userService;
