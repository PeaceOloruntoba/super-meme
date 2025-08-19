import cloudinary from "../../lib/cloudinary.config.js";
import ApiError from "../../utils/apiError.js";

export const uploadToCloudinary = async (tempFilePath) => {
  try {
    const { secure_url } = await cloudinary.v2.uploader.upload(tempFilePath, {
      use_filename: true,
      folder: "AppName",
    });
    return secure_url;
  } catch (error) {
    console.error("Error updating user image:", error);

    // Check if the error is already an instance of ApiError
    if (error instanceof ApiError) {
      throw error; // If it's an ApiError, just re-throw it
    }

    throw new ApiError.internalServerError(
      500,
      "Error uploading to Cloudinary: " + error.message
    );
  }
};
