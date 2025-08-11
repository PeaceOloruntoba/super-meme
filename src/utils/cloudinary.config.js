import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a file buffer to Cloudinary.
 * @param {Buffer} fileBuffer - The buffer of the file to upload.
 * @param {string} folder - The folder in Cloudinary to upload to.
 * @returns {Promise<string>} The URL of the uploaded image.
 */
export const uploadFileToCloudinary = async (
  fileBuffer,
  folder = "patterns"
) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { resource_type: "image", folder: folder },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            return reject(error);
          }
          resolve(result.secure_url);
        }
      )
      .end(fileBuffer);
  });
};

/**
 * Uploads a base64 encoded string to Cloudinary.
 * @param {string} base64String - The base64 encoded image string (e.g., "data:image/png;base64,...").
 * @param {string} folder - The folder in Cloudinary to upload to.
 * @returns {Promise<string>} The URL of the uploaded image.
 */
export const uploadBase64ToCloudinary = async (
  base64String,
  folder = "patterns"
) => {
  try {
    const result = await cloudinary.uploader.upload(base64String, {
      resource_type: "image",
      folder: folder,
    });
    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary base64 upload error:", error);
    throw error;
  }
};

/**
 * Deletes an image from Cloudinary.
 * @param {string} imageUrl - The full URL of the image to delete.
 * @returns {Promise<object>} Cloudinary deletion result.
 */
export const deleteFileFromCloudinary = async (imageUrl) => {
  try {
    const publicId = imageUrl.split("/").pop().split(".")[0];
    const result = await cloudinary.uploader.destroy(`patterns/${publicId}`);
    return result;
  } catch (error) {
    console.error("Cloudinary deletion error:", error);
    throw error;
  }
};
