import Client from "../models/client.model.js";
import ApiError from "../../utils/apiError.js";

const clientService = {
  /**
   * Creates a new client for a specific user.
   * @param {string} userId - The ID of the user creating the client.
   * @param {object} clientData - The client data (name, email, phone, etc.).
   * @returns {Promise<object>} The newly created client.
   */
  createClient: async (userId, clientData) => {
    const newClient = await Client.create({ ...clientData, userId });
    return {
      success: true,
      status_code: 201,
      message: "Client created successfully.",
      data: { client: newClient },
    };
  },

  /**
   * Retrieves all clients for a specific user.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object>} An array of clients.
   */
  getAllClients: async (userId) => {
    const clients = await Client.find({ userId }).sort({ createdAt: -1 });

    return {
      success: true,
      status_code: 200,
      message: "Clients retrieved successfully.",
      data: { clients },
    };
  },

  /**
   * Retrieves a single client by its ID, ensuring it belongs to the user.
   * @param {string} clientId - The ID of the client.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object>} The single client.
   */
  getSingleClient: async (clientId, userId) => {
    const client = await Client.findOne({ _id: clientId, userId });

    if (!client) {
      throw ApiError.notFound("Client not found.");
    }

    return {
      success: true,
      status_code: 200,
      message: "Client retrieved successfully.",
      data: { client },
    };
  },

  /**
   * Updates an existing client.
   * @param {string} clientId - The ID of the client to update.
   * @param {string} userId - The ID of the user.
   * @param {object} updateData - The data to update.
   * @returns {Promise<object>} The updated client.
   */
  updateClient: async (clientId, userId, updateData) => {
    const client = await Client.findOneAndUpdate(
      { _id: clientId, userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!client) {
      throw ApiError.notFound(
        "Client not found or you don't have permission to update it."
      );
    }

    return {
      success: true,
      status_code: 200,
      message: "Client updated successfully.",
      data: { client },
    };
  },

  /**
   * Deletes a client.
   * @param {string} clientId - The ID of the client to delete.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object>} A confirmation message.
   */
  deleteClient: async (clientId, userId) => {
    const client = await Client.findOneAndDelete({ _id: clientId, userId });

    if (!client) {
      throw ApiError.notFound(
        "Client not found or you don't have permission to delete it."
      );
    }

    return {
      success: true,
      status_code: 200,
      message: "Client deleted successfully.",
      data: null,
    };
  },
};

export default clientService;
