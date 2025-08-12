import express from "express";
import methodNotAllowed from "../../middlewares/methodNotAllowed.js";
import { isAuth } from "../../middlewares/auth.js";
import {
  createPattern,
  getAllPatterns,
  getSinglePattern,
  updatePattern,
  deletePattern,
  getAll,
} from "../controllers/pattern.controller.js";

const router = express.Router();

router
  .route("/")
  .post(isAuth, createPattern)
  .get(isAuth, getAllPatterns)
  .all(methodNotAllowed);

router
  .route("/super")
  .get(isAuth, getAll)
  .all(methodNotAllowed);

router
  .route("/:patternId")
  .get(isAuth, getSinglePattern)
  .patch(isAuth, updatePattern)
  .delete(isAuth, deletePattern)
  .all(methodNotAllowed);

export default router;
