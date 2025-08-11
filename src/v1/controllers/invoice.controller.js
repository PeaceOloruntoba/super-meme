import asyncWrapper from "../../middlewares/asyncWrapper.js";
import invoiceService from "../services/invoice.service.js";
import ApiError from "../../utils/apiError.js";

/**
 * Controller to create a new invoice.
 */
export const createInvoice = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const invoiceData = req.body;
  const result = await invoiceService.createInvoice(userId, invoiceData);
  res.status(result.statusCode).json(result);
});

/**
 * Controller to get all invoices for the authenticated user.
 */
export const getAllInvoices = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const result = await invoiceService.getAllInvoices(userId);
  res.status(result.statusCode).json(result);
});

/**
 * Controller to get all invoices for a specific client.
 */
export const getAllInvoicesByClient = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const { clientId } = req.params;
  if (!clientId) {
    throw ApiError.badRequest("Client ID is required in URL parameters.");
  }
  const result = await invoiceService.getAllInvoicesByClient(userId, clientId);
  res.status(result.statusCode).json(result);
});

/**
 * Controller to get all invoices for a specific project.
 */
export const getAllInvoicesByProject = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const { projectId } = req.params;
  if (!projectId) {
    throw ApiError.badRequest("Project ID is required in URL parameters.");
  }
  const result = await invoiceService.getAllInvoicesByProject(
    userId,
    projectId
  );
  res.status(result.statusCode).json(result);
});

/**
 * Controller to get a single invoice.
 */
export const getSingleInvoice = asyncWrapper(async (req, res, next) => {
  const { invoiceId } = req.params;
  const { userId } = req.user;
  if (!invoiceId) {
    throw ApiError.badRequest("Invoice ID is required.");
  }
  const result = await invoiceService.getSingleInvoice(invoiceId, userId);
  res.status(result.statusCode).json(result);
});

/**
 * Controller to update an existing invoice.
 */
export const updateInvoice = asyncWrapper(async (req, res, next) => {
  const { invoiceId } = req.params;
  const { userId } = req.user;
  const updateData = req.body;
  if (!invoiceId) {
    throw ApiError.badRequest("Invoice ID is required.");
  }
  const result = await invoiceService.updateInvoice(
    invoiceId,
    userId,
    updateData
  );
  res.status(result.statusCode).json(result);
});

/**
 * Controller to delete an invoice.
 */
export const deleteInvoice = asyncWrapper(async (req, res, next) => {
  const { invoiceId } = req.params;
  const { userId } = req.user;
  if (!invoiceId) {
    throw ApiError.badRequest("Invoice ID is required.");
  }
  const result = await invoiceService.deleteInvoice(invoiceId, userId);
  res.status(result.statusCode).json(result);
});
