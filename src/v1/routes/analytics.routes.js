import express from "express";
import methodNotAllowed from "../../middlewares/methodNotAllowed.js";
import { isAuth } from "../../middlewares/auth.js";
import { getAnalytics } from "../controllers/analytics.controller.js";

const router = express.Router();

router
  .route("/stats")
  .get(isAuth, getAnalytics)
  .all(methodNotAllowed);

export default router;
