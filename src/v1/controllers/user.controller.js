import asyncWrapper from "../../middlewares/asyncWrapper.js";
import userService from "../services/user.service.js";
import ApiError from "../../utils/apiError.js";

/**
 * Controller to handle getting a user's profile.
 */
export const getProfile = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  if (!userId) {
    throw ApiError.unauthorized(
      "User ID not found in request.",
      "USER_ID_MISSING"
    );
  }
  const result = await userService.getProfile(userId);
  res.status(result.status_code).json(result);
});

/**
 * Controller to handle updating a user's profile.
 */
export const updateProfile = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const updateData = req.body;

  if (!userId) {
    throw ApiError.unauthorized(
      "User ID not found in request.",
      "USER_ID_MISSING"
    );
  }

  const result = await userService.updateProfile(userId, updateData);
  res.status(result.status_code).json(result);
});

/**
 * Controller to handle updating a user's notifications.
 */
export const updateNotifications = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const { settings } = req.body;

  if (!userId) {
    throw ApiError.unauthorized(
      "User ID not found in request.",
      "USER_ID_MISSING"
    );
  }

  if (!settings || typeof settings !== "object") {
    throw ApiError.badRequest(
      "Invalid notifications data.",
      "INVALID_NOTIFICATIONS_DATA"
    );
  }

  const result = await userService.updateNotifications(userId, settings);
  res.status(result.status_code).json(result);
});

/**
 * Controller to handle updating a user's preferences.
 */
export const updatePreferences = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const { settings } = req.body;

  if (!userId) {
    throw ApiError.unauthorized(
      "User ID not found in request.",
      "USER_ID_MISSING"
    );
  }

  if (!settings || typeof settings !== "object") {
    throw ApiError.badRequest(
      "Invalid preferences data.",
      "INVALID_PREFERENCES_DATA"
    );
  }

  const result = await userService.updatePreferences(userId, settings);
  res.status(result.status_code).json(result);
});

/**
 * Controller to handle changing a user's password.
 */
export const updatePassword = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const { currentPassword, newPassword } = req.body;

  if (!userId) {
    throw ApiError.unauthorized(
      "User ID not found in request.",
      "USER_ID_MISSING"
    );
  }

  if (!currentPassword || !newPassword) {
    throw ApiError.badRequest(
      "Current and new passwords are required.",
      "MISSING_PASSWORD_FIELDS"
    );
  }

  const result = await userService.updatePassword(
    userId,
    currentPassword,
    newPassword
  );
  res.status(result.status_code).json(result);
});

/**
 * Controller to handle updating a user's profile image.
 */
export const updateImage = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;

  if (!req.files || !req.files.image) {
    throw ApiError.badRequest(
      "No image file provided in the request (expected 'image' field).",
      "IMAGE_FILE_MISSING"
    );
  }

  const imageFile = req.files.image;

  if (!userId) {
    throw ApiError.unauthorized(
      "User ID not found in request.",
      "USER_ID_MISSING"
    );
  }

  const result = await userService.updateImage(userId, imageFile);
  res.status(result.status_code).json(result);
});

/**
 * Controller to delete user account.
 */
export const deleteAccount = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  if (!userId) {
    throw ApiError.unauthorized(
      "User ID not found in request.",
      "USER_ID_MISSING"
    );
  }
  const result = await userService.deleteAccount(userId);
  res.status(result.status_code).json(result);
});

/**
 * Controller to toggle 2FA.
 */
export const toggle2FA = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const { enable } = req.body;
  if (!userId) {
    throw ApiError.unauthorized(
      "User ID not found in request.",
      "USER_ID_MISSING"
    );
  }
  if (typeof enable !== "boolean") {
    throw ApiError.badRequest(
      "Enable flag is required as boolean.",
      "INVALID_ENABLE_FLAG"
    );
  }
  const result = await userService.toggle2FA(userId, enable);
  res.status(result.status_code).json(result);
});

/**
 * Controller to logout from all sessions.
 */
export const logoutAll = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  if (!userId) {
    throw ApiError.unauthorized(
      "User ID not found in request.",
      "USER_ID_MISSING"
    );
  }
  const result = await userService.logoutAll(userId);
  res.status(result.status_code).json(result);
});
