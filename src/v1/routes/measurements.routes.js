import express from "express";
import methodNotAllowed from "../../middlewares/methodNotAllowed.js";
import { isAuth } from "../../middlewares/auth.js";
import { createMeasurement, deleteMeasurement, getAllMeasurementsByClient, getSingleMeasurement, updateMeasurement } from "../controllers/measurements.controller.js";

const router = express.Router({ mergeParams: true });

router
  .route("/")
  .post(isAuth, createMeasurement)
  .get(isAuth, getAllMeasurementsByClient)
  .all(methodNotAllowed);

router
  .route("/:measurementId")
  .get(isAuth, getSingleMeasurement)
  .patch(isAuth, updateMeasurement)
  .delete(isAuth, deleteMeasurement)
  .all(methodNotAllowed);

export default router;
