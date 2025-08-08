import express from "express";
import { isAuth } from "../../middlewares/auth";
import { getUser, updateImage, updateProfile } from "../controllers/user.controller";
import methodNotAllowed from "../../middlewares/methodNotAllowed";

const router = express.Router();

router.route("/profile").patch(isAuth, updateProfile).all(methodNotAllowed);

router.route("/image").patch(isAuth, updateImage).all(methodNotAllowed);

router.route("/").get(isAuth, getUser).all(methodNotAllowed);

export default router;
