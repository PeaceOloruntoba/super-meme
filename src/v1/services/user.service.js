import User from "../models/user.model.js";
import ApiError from "../../utils/apiError.js"; // Assuming you have ApiError
// Ensure this path is correct based on where you put cloudinary upload logic
import { uploadToCloudinary } from "../../utils/cloudinary.js"; // Assuming cloudinary upload utility

const userService = {
  /**
   * Updates a user's profile information.
   * @param {string} userId - The ID of the user to update.
   * @param {object} updateData - An object containing fields to update.
   * @returns {Promise<object>} - An object with success status, message, and updated user data.
   */
  updateProfile: async function (userId, updateData) {
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      throw ApiError.notFound("User not found.");
    }

    // List of allowed fields to update directly on the user document
    const allowedFields = [
      "firstName",
      "lastName",
      "businessName",
      "businessType",
      "address",
      "bio",
      "website",
      "sendNewsletter",
    ];

    // Update allowed fields
    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        user[field] = updateData[field];
      }
    });

    // Handle nested settings updates
    if (updateData.settings && typeof updateData.settings === "object") {
      // Allowed settings fields. Be specific to prevent arbitrary updates.
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

    await user.save(); // Save the updated user document

    // Remove sensitive data before returning
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
      // Upload the image to Cloudinary using your utility function
      const imageUrl = await uploadToCloudinary(imageFile.tempFilePath);

      user.image = imageUrl; // Update the user's image URL
      await user.save(); // Save the updated user document

      // Remove sensitive data before returning
      user.password = undefined;

      return {
        success: true,
        status_code: 200,
        message: "Profile image updated successfully.",
        data: { user },
      };
    } catch (error) {
      // Re-throw or wrap Cloudinary upload errors
      if (error instanceof ApiError) {
        throw error; // If uploadToCloudinary throws an ApiError, re-throw it
      }
      throw ApiError.internalServerError(
        "Failed to upload image: " + error.message
      );
    }
  },

  // You can add other user-related services here, e.g., getUsers, deleteUser, etc.
};

export default userService;
