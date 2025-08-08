import express from "express";
import methodNotAllowed from "../../middlewares/methodNotAllowed.js";
import { isAuth } from "../../middlewares/auth.js";
import {
  createClient,
  getAllClients,
  getSingleClient,
  updateClient,
  deleteClient,
} from "../controllers/client.controller.js";

const router = express.Router();

router
  .route("/")
  .post(isAuth, createClient)
  .get(isAuth, getAllClients)
  .all(methodNotAllowed);

router
  .route("/:clientId")
  .get(isAuth, getSingleClient)
  .patch(isAuth, updateClient)
  .delete(isAuth, deleteClient)
  .all(methodNotAllowed);

export default router;
