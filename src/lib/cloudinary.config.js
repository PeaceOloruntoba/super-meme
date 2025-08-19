import dotenv from "dotenv";
dotenv.config();
import cloudinary from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUNIDARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  default_folder: "Root", // Set default folder here
});

export default cloudinary;
