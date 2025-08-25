import Invoice from "../models/invoice.model.js";
import ApiError from "../../utils/apiError.js";

const invoiceService = {
  /**
   * Helper function to calculate the total amount from a list of items.
   * @param {array} items - The array of invoice items.
   * @returns {number} The total amount.
   */
  calculateTotalAmount: (items) => {
    let total = 0;
    if (items && Array.isArray(items)) {
      items.forEach((item) => {
        if (!item.amount) {
          item.amount = item.quantity * item.rate;
        }
        total += item.amount;
      });
    }
    return total;
  },

  /**
   * Creates a new invoice.
   * @param {string} userId - The ID of the user creating the invoice.
   * @param {object} invoiceData - The invoice data.
   * @returns {Promise<object>} The newly created invoice.
   */
  createInvoice: async (userId, invoiceData) => {
    try {
      if (invoiceData.items && !invoiceData.amount) {
        invoiceData.amount = invoiceService.calculateTotalAmount(
          invoiceData.items
        );
      }

      const newInvoice = await Invoice.create({
        ...invoiceData,
        userId,
      });

      return {
        success: true,
        statusCode: 201,
        message: "Invoice created successfully.",
        data: { invoice: newInvoice },
      };
    } catch (error) {
      console.error("Error creating invoice:", error);
      if (error.code === 11000) {
        throw ApiError.conflict("Invoice number must be unique.", "INVOICE_NUMBER_TAKEN");
      }
      if (error.name === "ValidationError") {
        throw ApiError.badRequest(error.message, "VALIDATION_ERROR");
      }
      throw ApiError.internalServerError("Failed to create invoice.", "INVOICE_CREATE_FAILED");
    }
  },

  /**
   * Retrieves all invoices for a specific user.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object>} An array of invoices.
   */
  getAllInvoices: async (userId) => {
    try {
      const invoices = await Invoice.find({ userId }).populate("clientId").populate("projectId")
        .sort({ createdAt: -1 });

      return {
        success: true,
        statusCode: 200,
        message: "Invoices retrieved successfully.",
        data: { invoices },
      };
    } catch (error) {
      console.error("Error retrieving all invoices:", error);
      throw ApiError.internalServerError("Failed to retrieve invoices.", "INVOICE_LIST_FAILED");
    }
  },

  /**
   * Retrieves all invoices for a specific client.
   * @param {string} userId - The ID of the user.
   * @param {string} clientId - The ID of the client.
   * @returns {Promise<object>} An array of invoices.
   */
  getAllInvoicesByClient: async (userId, clientId) => {
    try {
      const invoices = await Invoice.find({ userId, clientId })
        .populate("clientId")
        .populate("projectId")
        .sort({ createdAt: -1 });

      return {
        success: true,
        statusCode: 200,
        message: "Invoices for client retrieved successfully.",
        data: { invoices },
      };
    } catch (error) {
      console.error("Error retrieving invoices by client:", error);
      throw ApiError.internalServerError("Failed to retrieve client invoices.", "INVOICE_LIST_BY_CLIENT_FAILED");
    }
  },

  /**
   * Retrieves all invoices for a specific project.
   * @param {string} userId - The ID of the user.
   * @param {string} projectId - The ID of the project.
   * @returns {Promise<object>} An array of invoices.
   */
  getAllInvoicesByProject: async (userId, projectId) => {
    try {
      const invoices = await Invoice.find({ userId, projectId })
        .populate("clientId", "name email")
        .populate("projectId", "name")
        .sort({ createdAt: -1 });

      return {
        success: true,
        statusCode: 200,
        message: "Invoices for project retrieved successfully.",
        data: { invoices },
      };
    } catch (error) {
      console.error("Error retrieving invoices by project:", error);
      throw ApiError.internalServerError(
        "Failed to retrieve project invoices.",
        "INVOICE_LIST_BY_PROJECT_FAILED"
      );
    }
  },

  /**
   * Retrieves a single invoice by its ID.
   * @param {string} invoiceId - The ID of the invoice.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object>} The single invoice.
   */
  getSingleInvoice: async (invoiceId, userId) => {
    try {
      const invoice = await Invoice.findOne({ _id: invoiceId, userId })
        .populate("clientId", "name email")
        .populate("projectId", "name");

      if (!invoice) {
        throw ApiError.notFound("Invoice not found.", "INVOICE_NOT_FOUND");
      }

      return {
        success: true,
        statusCode: 200,
        message: "Invoice retrieved successfully.",
        data: { invoice },
      };
    } catch (error) {
      console.error(`Error retrieving single invoice ${invoiceId}:`, error);
      if (error.name === "CastError") {
        throw ApiError.badRequest("Invalid Invoice ID format.", "INVALID_ID");
      }
      throw ApiError.internalServerError("Failed to retrieve invoice.", "INVOICE_FETCH_FAILED");
    }
  },

  /**
   * Updates an existing invoice.
   * @param {string} invoiceId - The ID of the invoice to update.
   * @param {string} userId - The ID of the user.
   * @param {object} updateData - The data to update.
   * @returns {Promise<object>} The updated invoice.
   */
  updateInvoice: async (invoiceId, userId, updateData) => {
    try {
      if (updateData.items && !updateData.amount) {
        updateData.amount = invoiceService.calculateTotalAmount(
          updateData.items
        );
      }

      const updatedInvoice = await Invoice.findOneAndUpdate(
        { _id: invoiceId, userId },
        { $set: updateData },
        { new: true, runValidators: true }
      )
        .populate("clientId", "name email")
        .populate("projectId", "name");

      if (!updatedInvoice) {
        throw ApiError.notFound(
          "Invoice not found or you don't have permission to update it.",
          "INVOICE_NOT_FOUND"
        );
      }

      return {
        success: true,
        statusCode: 200,
        message: "Invoice updated successfully.",
        data: { invoice: updatedInvoice },
      };
    } catch (error) {
      console.error(`Error updating invoice ${invoiceId}:`, error);
      if (error.name === "CastError") {
        throw ApiError.badRequest("Invalid Invoice ID format.", "INVALID_ID");
      }
      if (error.name === "ValidationError") {
        throw ApiError.badRequest(error.message, "VALIDATION_ERROR");
      }
      throw ApiError.internalServerError("Failed to update invoice.", "INVOICE_UPDATE_FAILED");
    }
  },

  /**
   * Deletes an invoice.
   * @param {string} invoiceId - The ID of the invoice to delete.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object>} A confirmation message.
   */
  deleteInvoice: async (invoiceId, userId) => {
    try {
      const invoice = await Invoice.findOneAndDelete({
        _id: invoiceId,
        userId,
      });

      if (!invoice) {
        throw ApiError.notFound(
          "Invoice not found or you don't have permission to delete it.",
          "INVOICE_NOT_FOUND"
        );
      }

      return {
        success: true,
        statusCode: 200,
        message: "Invoice deleted successfully.",
        data: null,
      };
    } catch (error) {
      console.error(`Error deleting invoice ${invoiceId}:`, error);
      if (error.name === "CastError") {
        throw ApiError.badRequest("Invalid Invoice ID format.", "INVALID_ID");
      }
      throw ApiError.internalServerError("Failed to delete invoice.", "INVOICE_DELETE_FAILED");
    }
  },
};

export default invoiceService;
