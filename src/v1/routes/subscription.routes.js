import express from "express";
import methodNotAllowed from "../../middlewares/methodNotAllowed.js";
import { isAuth } from "../../middlewares/auth.js";
import {
  subscribe,
  cancelSubscription,
  getSubscriptionDetails,
  updatePaymentMethod,
  verifyCallback,
} from "../controllers/subscription.controller.js";

const router = express.Router();

router.route("/").post(isAuth, subscribe).all(methodNotAllowed);

router
  .route("/details")
  .get(isAuth, getSubscriptionDetails)
  .all(methodNotAllowed);

router.route("/cancel").post(isAuth, cancelSubscription).all(methodNotAllowed);

router
  .route("/payment-method")
  .patch(isAuth, updatePaymentMethod)
  .all(methodNotAllowed);

// Public endpoint hit by frontend after Flutterwave redirect
router.route("/verify").get(verifyCallback).all(methodNotAllowed);

export default router;
