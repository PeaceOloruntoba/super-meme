import User from "../models/user.model.js";
import ApiError from "../../utils/apiError.js";
import { uploadToCloudinary } from "./upload.service.js";
import bcrypt from "bcrypt";
import subscriptionService from "./subscription.service.js";

const userService = {
  /**
   * Gets a user's profile.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object>} - An object with success status, message, and user data.
   */
  getProfile: async function (userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound("User not found.", "USER_NOT_FOUND");
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
   * Deletes a user's account by setting status to 'deleted' and canceling subscription if any.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object>} - An object with success status and message.
   */
  deleteAccount: async function (userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound("User not found.", "USER_NOT_FOUND");
    }
    if (user.subscriptionId) {
      await subscriptionService.cancelSubscription(userId);
    }
    user.status = "deleted";
    user.activeSessions = [];
    await user.save();
    return {
      success: true,
      status_code: 200,
      message: "Account deleted successfully.",
    };
  },

  /**
   * Toggles 2FA for the user (stub, real implementation needs secret generation and verification).
   * @param {string} userId - The ID of the user.
   * @param {boolean} enable - Whether to enable or disable 2FA.
   * @returns {Promise<object>} - An object with success status and message.
   */
  toggle2FA: async function (userId, enable) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound("User not found.", "USER_NOT_FOUND");
    }
    user.is2FAEnabled = enable;
    await user.save();
    return {
      success: true,
      status_code: 200,
      message: `2FA ${enable ? "enabled" : "disabled"} successfully.`,
    };
  },

  /**
   * Logs out all active sessions for the user.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object>} - An object with success status and message.
   */
  logoutAll: async function (userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound("User not found.", "USER_NOT_FOUND");
    }
    user.activeSessions = [];
    await user.save();
    return {
      success: true,
      status_code: 200,
      message: "Logged out from all sessions successfully.",
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
      throw ApiError.notFound("User not found.", "USER_NOT_FOUND");
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
      throw ApiError.notFound("User not found.", "USER_NOT_FOUND");
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
      throw ApiError.notFound("User not found.", "USER_NOT_FOUND");
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
      throw ApiError.notFound("User not found.", "USER_NOT_FOUND");
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw ApiError.unauthorized("Incorrect current password.", "INCORRECT_PASSWORD");
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
      throw ApiError.badRequest("No image file provided for upload.", "IMAGE_MISSING");
    }

    const user = await User.findById(userId);

    if (!user) {
      throw ApiError.notFound("User not found.", "USER_NOT_FOUND");
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
        "Failed to upload image: " + error.message,
        "IMAGE_UPLOAD_FAILED"
      );
    }
  },
};

export default userService;
