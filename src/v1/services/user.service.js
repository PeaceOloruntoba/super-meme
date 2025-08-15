import User from "../models/user.model.js";
import ApiError from "../../utils/apiError.js";
import { uploadToCloudinary } from "./upload.service.js";
import bcrypt from "bcrypt";

const userService = {
  /**
   * Gets a user's profile.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object>} - An object with success status, message, and user data.
   */
  getProfile: async function (userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound("User not found.");
    }
    user.password = undefined;
    return {
      success: true,
      status_code: 200,
      message: "Profile fetched successfully.",
      data: { user },
    };
  },

  /**
   * Updates a user's profile information (top-level fields).
   * @param {string} userId - The ID of the user to update.
   * @param {object} updateData - An object containing top-level fields to update.
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
      "email",
      "address",
      "bio",
      "website",
      "phone",
      "businessName",
      "businessType",
      "sendNewsletter",
      "revenueGoals",
    ];

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        user[field] = updateData[field];
      }
    });

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
   * Updates a user's notification settings.
   * @param {string} userId - The ID of the user to update.
   * @param {object} settingsData - An object containing notification settings to update.
   * @returns {Promise<object>} - An object with success status, message, and updated user data.
   */
  updateNotifications: async function (userId, settingsData) {
    const user = await User.findById(userId);

    if (!user) {
      throw ApiError.notFound("User not found.");
    }

    const allowedSettingsFields = [
      "emailNotifications",
      "pushNotifications",
      "projectDeadlines",
      "clientMessages",
      "paymentReminders",
      "marketingEmails",
    ];

    allowedSettingsFields.forEach((field) => {
      if (settingsData[field] !== undefined) {
        user.settings[field] = settingsData[field];
      }
    });

    await user.save();

    user.password = undefined;

    return {
      success: true,
      status_code: 200,
      message: "Notifications updated successfully.",
      data: { user },
    };
  },

  /**
   * Updates a user's preference settings.
   * @param {string} userId - The ID of the user to update.
   * @param {object} settingsData - An object containing preference settings to update.
   * @returns {Promise<object>} - An object with success status, message, and updated user data.
   */
  updatePreferences: async function (userId, settingsData) {
    const user = await User.findById(userId);

    if (!user) {
      throw ApiError.notFound("User not found.");
    }

    const allowedSettingsFields = [
      "theme",
      "language",
      "timezone",
      "currency",
      "measurementUnit",
      "defaultProjectDuration",
    ];

    allowedSettingsFields.forEach((field) => {
      if (settingsData[field] !== undefined) {
        user.settings[field] = settingsData[field];
      }
    });

    await user.save();

    user.password = undefined;

    return {
      success: true,
      status_code: 200,
      message: "Preferences updated successfully.",
      data: { user },
    };
  },

  /**
   * Updates a user's password.
   * @param {string} userId - The ID of the user.
   * @param {string} currentPassword - The user's current password.
   * @param {string} newPassword - The new password.
   * @returns {Promise<object>} - An object with success status and message.
   */
  updatePassword: async function (userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select("+password");

    if (!user) {
      throw ApiError.notFound("User not found.");
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw ApiError.unauthorized("Incorrect current password.");
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return {
      success: true,
      status_code: 200,
      message: "Password updated successfully.",
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
