import dotenv from "dotenv";
dotenv.config();
import cloudinary from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // Corrected from CLOUNINARY_NAME
  api_key: process.env.CLOUDINARY_API_KEY, // Corrected from CLOUNINARY_API_KEY
  api_secret: process.env.CLOUDINARY_API_SECRET, // Corrected from CLOUNINARY_API_SECRET
  default_folder: "Root",
});

export default cloudinary;