import asyncWrapper from "../../middlewares/asyncWrapper.js";
import userService from "../services/user.service.js";
import ApiError from "../../utils/apiError.js";
import authService from "../services/auth.service.js";

/**
 * Controller to handle updating a user's profile.
 */
export const updateProfile = asyncWrapper(async (req, res, next) => {
  // userId is populated by the authentication middleware (e.g., isAuth)
  const { userId } = req.user;
  const updateData = req.body; // The data to update comes from the request body

  if (!userId) {
    throw ApiError.unauthorized("User ID not found in request.");
  }

  const result = await userService.updateProfile(userId, updateData);
  res.status(result.status_code).json(result);
});

/**
 * Controller to handle updating a user's profile image.
 */
export const updateImage = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user; // userId from auth middleware

  // Check if a file was uploaded using express-fileupload
  if (!req.files || !req.files.image) {
    throw ApiError.badRequest(
      "No image file provided in the request (expected 'image' field)."
    );
  }

  const imageFile = req.files.image; // Assuming the input field name for the image is 'image'

  if (!userId) {
    throw ApiError.unauthorized("User ID not found in request.");
  }

  const result = await userService.updateImage(userId, imageFile);
  res.status(result.status_code).json(result);
});

// If you want to use the general getUser from auth.controller.js here,
// you can uncomment the line below or move the implementation.
// For now, let's keep it clean with just the new user-specific functionalities.

export const getUser = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const result = await authService.getUser(userId); // Assuming getUser is also in userService
  res.status(200).json(result);
});
