import asyncWrapper from "../../middlewares/asyncWrapper.js";
import userService from "../services/user.service.js";
import ApiError from "../../utils/apiError.js";
import authService from "../services/auth.service.js";

/**
 * Controller to handle updating a user's profile.
 */
export const updateProfile = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const updateData = req.body;

  if (!userId) {
    throw ApiError.unauthorized("User ID not found in request.");
  }

  const result = await userService.updateProfile(userId, updateData);
  res.status(result.status_code).json(result);
});

/**
 * Controller to handle changing a user's password.
 */
export const updatePassword = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const { currentPassword, newPassword } = req.body;

  if (!userId) {
    throw ApiError.unauthorized("User ID not found in request.");
  }

  if (!currentPassword || !newPassword) {
    throw ApiError.badRequest("Current and new passwords are required.");
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
      "No image file provided in the request (expected 'image' field)."
    );
  }

  const imageFile = req.files.image;

  if (!userId) {
    throw ApiError.unauthorized("User ID not found in request.");
  }

  const result = await userService.updateImage(userId, imageFile);
  res.status(result.status_code).json(result);
});

/**
 * Controller to handle getting a user's profile details.
 */
export const getUser = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const result = await authService.getUser(userId);
  res.status(200).json(result);
});
