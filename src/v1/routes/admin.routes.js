import express from "express";
import methodNotAllowed from "../../middlewares/methodNotAllowed.js";
import { isAdmin } from "../../middlewares/auth.js";
import {
  getUsers,
  getUserById,
  listSubscriptions,
  changeUserPlan,
  cancelUserSubscription,
  listPatterns,
  deletePattern,
  getUserAnalytics,
} from "../controllers/admin.controller.js";

const router = express.Router();

// Users
router.route("/users").get(isAdmin, getUsers).all(methodNotAllowed);
router.route("/users/:id").get(isAdmin, getUserById).all(methodNotAllowed);

// Subscriptions
router
  .route("/subscriptions")
  .get(isAdmin, listSubscriptions)
  .all(methodNotAllowed);
router
  .route("/users/:id/plan")
  .post(isAdmin, changeUserPlan)
  .all(methodNotAllowed);
router
  .route("/users/:id/subscription/cancel")
  .post(isAdmin, cancelUserSubscription)
  .all(methodNotAllowed);

// Patterns
router.route("/patterns").get(isAdmin, listPatterns).all(methodNotAllowed);
router.route("/patterns/:id").delete(isAdmin, deletePattern).all(methodNotAllowed);

// Analytics
router
  .route("/analytics/users")
  .get(isAdmin, getUserAnalytics)
  .all(methodNotAllowed);

export default router;
