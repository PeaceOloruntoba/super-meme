import express from "express";
import methodNotAllowed from "../../middlewares/methodNotAllowed.js";
import { isAuth } from "../../middlewares/auth.js";
import {
  subscribe,
  cancelSubscription,
  getSubscriptionStatus,
} from "../controllers/subscription.controller.js";

const router = express.Router();

router
  .route("/")
  .get(isAuth, getSubscriptionStatus)
  .post(isAuth, subscribe)
  .all(methodNotAllowed);

router.route("/cancel").post(isAuth, cancelSubscription).all(methodNotAllowed);

export default router;
