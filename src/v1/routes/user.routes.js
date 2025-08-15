import express from "express";
import { isAuth } from "../../middlewares/auth.js";
import { getUser, updateImage, updateProfile } from "../controllers/user.controller.js";
import methodNotAllowed from "../../middlewares/methodNotAllowed.js";

const router = express.Router();

router.route("/profile").patch(isAuth, updateProfile).all(methodNotAllowed);

router.route("/image").patch(isAuth, updateImage).all(methodNotAllowed);

router.route("/").get(isAuth, getUser).all(methodNotAllowed);

export default router;
