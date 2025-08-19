import express from "express";
import methodNotAllowed from "../../middlewares/methodNotAllowed.js";
import { isAuth } from "../../middlewares/auth.js";
import {
  createMeasurement,
  deleteMeasurement,
  getAllMeasurements,
  getAllMeasurementsByClient,
  getSingleMeasurement,
  updateMeasurement,
} from "../controllers/measurements.controller.js";
import { requireFeature } from "../../middlewares/planEnforcement.js";

const router = express.Router({ mergeParams: true });

router
  .route("/")
  .post(isAuth, requireFeature("hasAdvancedMeasurements"), createMeasurement)
  .get(isAuth, getAllMeasurements)
  .all(methodNotAllowed);

router
  .route("/:measurementId")
  .get(isAuth, getSingleMeasurement)
  .patch(isAuth, updateMeasurement)
  .delete(isAuth, deleteMeasurement)
  .all(methodNotAllowed);

router
  .route("/:clientId")
  .get(isAuth, getAllMeasurementsByClient)
  .all(methodNotAllowed);

export default router;
