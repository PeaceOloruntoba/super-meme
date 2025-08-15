import express from "express";
import { isAuth } from "../../middlewares/auth.js";
import {
  getProfile,
  updateProfile,
  updateNotifications,
  updatePreferences,
  updatePassword,
  updateImage,
  deleteAccount,
  toggle2FA,
  logoutAll,
} from "../controllers/user.controller.js";
import methodNotAllowed from "../../middlewares/methodNotAllowed.js";

const router = express.Router();

router
  .route("/profile")
  .get(isAuth, getProfile)
  .patch(isAuth, updateProfile)
  .all(methodNotAllowed);

router
  .route("/notifications")
  .patch(isAuth, updateNotifications)
  .all(methodNotAllowed);

router
  .route("/preferences")
  .patch(isAuth, updatePreferences)
  .all(methodNotAllowed);

router.route("/password").patch(isAuth, updatePassword).all(methodNotAllowed);

router.route("/image").patch(isAuth, updateImage).all(methodNotAllowed);

router
  .route("/delete-account")
  .post(isAuth, deleteAccount)
  .all(methodNotAllowed);

router.route("/2fa").patch(isAuth, toggle2FA).all(methodNotAllowed);

router.route("/logout-all").post(isAuth, logoutAll).all(methodNotAllowed);

export default router;
