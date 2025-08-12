import express from "express";
import methodNotAllowed from "../../middlewares/methodNotAllowed.js";
import { isAuth } from "../../middlewares/auth.js";
import { getDashboardStats } from "../controllers/dashboard.controller.js";

const router = express.Router();

router.route("/stats").get(isAuth, getDashboardStats).all(methodNotAllowed);

export default router;
