import express from "express";
import methodNotAllowed from "../../middlewares/methodNotAllowed.js";
import { isAuth } from "../../middlewares/auth.js";
import {
  subscribe,
  cancelSubscription,
  getSubscriptionDetails,
  updatePaymentMethod,
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

export default router;
