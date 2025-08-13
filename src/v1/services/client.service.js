import Client from "../models/client.model.js";
import Project from "../models/projects.model.js";
import Invoice from "../models/invoice.model.js";
import ApiError from "../../utils/apiError.js";
import User from "../models/user.model.js";
import emailService from "./email.service.js";
import mongoose from "mongoose";

const clientService = {
  /**
   * Helper function to fetch active project count and last order date for a client.
   * @param {string} clientId - The ID of the client.
   * @param {string} userId - The ID of the user (for ownership check).
   * @returns {Promise<{activeProjects: number, lastOrderDate: Date | null}>}
   */
  getClientStats: async (clientId, userId) => {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const clientObjectId = new mongoose.Types.ObjectId(clientId);

    const activeProjects = await Project.countDocuments({
      clientId: clientObjectId,
      userId: userObjectId,
      status: { $in: ["planning", "in-progress", "review"] },
    });

    const lastInvoice = await Invoice.findOne({
      clientId: clientObjectId,
      userId: userObjectId,
      status: "paid",
    })
      .sort({ createdAt: -1 })
      .select("createdAt");

    const lastOrderDate = lastInvoice ? lastInvoice.createdAt : null;

    return { activeProjects, lastOrderDate };
  },

  /**
   * Creates a new client for a specific user.
   * @param {string} userId - The ID of the user creating the client.
   * @param {object} clientData - The client data (name, email, phone, etc.).
   * @returns {Promise<object>} The newly created client.
   */
  createClient: async (userId, clientData) => {
    try {
      const newClient = await Client.create({ ...clientData, userId });
      
      const clientWithStats = {
        ...newClient.toObject(),
        projects: 0,
        lastOrderDate: null,
      };

      return {
        success: true,
        statusCode: 201,
        message: "Client created successfully.",
        data: { client: clientWithStats },
      };
    } catch (error) {
      console.error("Error creating client:", error);
      if (error.name === "ValidationError") {
        throw ApiError.badRequest(error.message);
      }
      throw ApiError.internalServerError("Failed to create client.");
    }
  },

  /**
   * Retrieves all clients for a specific user, with active project count and last order date.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object>} An array of clients.
   */
  getAllClients: async (userId) => {
    try {
      const clients = await Client.find({ userId }).sort({ createdAt: -1 });

      const clientsWithStats = await Promise.all(
        clients.map(async (client) => {
          const stats = await clientService.getClientStats(client._id, userId);
          return {
            ...client.toObject(),
            projects: stats.activeProjects,
            lastOrderDate: stats.lastOrderDate,
          };
        })
      );

      return {
        success: true,
        statusCode: 200,
        message: "Clients retrieved successfully.",
        data: { clients: clientsWithStats },
      };
    } catch (error) {
      console.error("Error retrieving all clients:", error);
      throw ApiError.internalServerError("Failed to retrieve clients.");
    }
  },

  /**
   * Retrieves a single client by its ID, ensuring it belongs to the user,
   * and includes active project count and last order date.
   * @param {string} clientId - The ID of the client.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object>} The single client.
   */
  getSingleClient: async (clientId, userId) => {
    try {
      const client = await Client.findOne({ _id: clientId, userId });

      if (!client) {
        throw ApiError.notFound("Client not found.");
      }

      const stats = await clientService.getClientStats(client._id, userId);

      const clientWithStats = {
        ...client.toObject(),
        projects: stats.activeProjects,
        lastOrderDate: stats.lastOrderDate,
      };

      return {
        success: true,
        statusCode: 200,
        message: "Client retrieved successfully.",
        data: { client: clientWithStats },
      };
    } catch (error) {
      console.error(`Error retrieving single client ${clientId}:`, error);
      if (error.name === "CastError") {
        throw ApiError.badRequest("Invalid Client ID format.");
      }
      throw ApiError.internalServerError("Failed to retrieve client.");
    }
  },

  /**
   * Updates an existing client.
   * @param {string} clientId - The ID of the client to update.
   * @param {string} userId - The ID of the user.
   * @param {object} updateData - The data to update.
   * @returns {Promise<object>} The updated client.
   */
  updateClient: async (clientId, userId, updateData) => {
    try {
      const isStatusUpdate = updateData.status !== undefined;

      const existingClient = await Client.findOne({ _id: clientId, userId });
      if (!existingClient) {
        throw ApiError.notFound(
          "Client not found or you don't have permission to update it."
        );
      }

      const updatedClient = await Client.findOneAndUpdate(
        { _id: clientId, userId },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (
        isStatusUpdate &&
        existingClient.status !== updatedClient.status &&
        updatedClient.email
      ) {
        const user = await User.findById(userId);
        if (user?.settings?.clientMessages) {
          try {
            const subject = `Account Status Update from ${
              user.businessName || user.firstName
            }`;
            const context = {
              clientName: updatedClient.name,
              userName: user.firstName,
              newStatus: updatedClient.status.toUpperCase(),
            };
            await emailService.sendTemplateEmail(
              updatedClient.email,
              subject,
              "clientStatusUpdateTemplate",
              context
            );
            console.log(
              `Notification email sent to ${updatedClient.name} for status update.`
            );
          } catch (error) {
            console.error("Failed to send client status update email:", error);
          }
        }
      }

      const stats = await clientService.getClientStats(
        updatedClient._id,
        userId
      );
      const clientWithStats = {
        ...updatedClient.toObject(),
        projects: stats.activeProjects,
        lastOrderDate: stats.lastOrderDate,
      };

      return {
        success: true,
        statusCode: 200,
        message: "Client updated successfully.",
        data: { client: clientWithStats },
      };
    } catch (error) {
      console.error(`Error updating client ${clientId}:`, error);
      if (error.name === "CastError") {
        throw ApiError.badRequest(
          "Invalid Client ID format or invalid update data."
        );
      }
      if (error.name === "ValidationError") {
        throw ApiError.badRequest(error.message);
      }
      throw ApiError.internalServerError("Failed to update client.");
    }
  },

  /**
   * Deletes a client.
   * @param {string} clientId - The ID of the client to delete.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object>} A confirmation message.
   */
  deleteClient: async (clientId, userId) => {
    try {
      const client = await Client.findOneAndDelete({ _id: clientId, userId });
      if (!client) {
        throw ApiError.notFound(
          "Client not found or you don't have permission to delete it."
        );
      }
      return {
        success: true,
        statusCode: 200,
        message: "Client deleted successfully.",
        data: null,
      };
    } catch (error) {
      console.error(`Error deleting client ${clientId}:`, error);
      if (error.name === "CastError") {
        throw ApiError.badRequest("Invalid Client ID format.");
      }
      throw ApiError.internalServerError("Failed to delete client.");
    }
  },
};

export default clientService;
