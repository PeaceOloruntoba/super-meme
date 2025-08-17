import express from "express";
import methodNotAllowed from "../../middlewares/methodNotAllowed.js";
import { isAuth } from "../../middlewares/auth.js";
import {
  createPattern,
  getAllPatterns,
  getSinglePattern,
  updatePattern,
  deletePattern,
  getPublicPatterns, // Updated
} from "../controllers/pattern.controller.js";

const router = express.Router();

router
  .route("/")
  .post(isAuth, createPattern)
  .get(isAuth, getAllPatterns)
  .all(methodNotAllowed);

router
  .route("/public") // Changed from /super
  .get(getPublicPatterns) // No auth needed for public, remove isAuth if public access
  .all(methodNotAllowed);

router
  .route("/:patternId")
  .get(isAuth, getSinglePattern)
  .patch(isAuth, updatePattern)
  .delete(isAuth, deletePattern)
  .all(methodNotAllowed);

export default router;
