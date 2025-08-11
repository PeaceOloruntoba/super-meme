import express from "express";
import methodNotAllowed from "../../middlewares/methodNotAllowed.js";
import { isAuth } from "../../middlewares/auth.js";
import {
  createProject,
  getAllProjects,
  getAllProjectsByClient,
  getSingleProject,
  updateProject,
  deleteProject,
} from "../controllers/projects.controller.js";

const router = express.Router();

router
  .route("/")
  .post(isAuth, createProject)
  .get(isAuth, getAllProjects)
  .all(methodNotAllowed);

router
  .route("/:projectId")
  .get(isAuth, getSingleProject)
  .patch(isAuth, updateProject)
  .delete(isAuth, deleteProject)
  .all(methodNotAllowed);

router
  .route("/:clientId")
  .get(isAuth, getAllProjectsByClient)
  .all(methodNotAllowed);

export default router;
