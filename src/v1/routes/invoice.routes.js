import express from "express";
import methodNotAllowed from "../../middlewares/methodNotAllowed.js";
import { isAuth } from "../../middlewares/auth.js";
import {
  createInvoice,
  getAllInvoices,
  getAllInvoicesByClient,
  getAllInvoicesByProject,
  getSingleInvoice,
  updateInvoice,
  deleteInvoice,
} from "../controllers/invoice.controller.js";

const router = express.Router();

router
  .route("/")
  .post(isAuth, createInvoice)
  .get(isAuth, getAllInvoices)
  .all(methodNotAllowed);

router
  .route("/:invoiceId")
  .get(isAuth, getSingleInvoice)
  .patch(isAuth, updateInvoice)
  .delete(isAuth, deleteInvoice)
  .all(methodNotAllowed);

router
  .route("/:clientId")
  .get(isAuth, getAllInvoicesByClient)
  .all(methodNotAllowed);

router
  .route("/:projectId")
  .get(isAuth, getAllInvoicesByProject)
  .all(methodNotAllowed);

export default router;
