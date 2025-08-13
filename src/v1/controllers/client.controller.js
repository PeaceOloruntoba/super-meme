import asyncWrapper from "../../middlewares/asyncWrapper.js";
import clientService from "../services/client.service.js";
import ApiError from "../../utils/apiError.js";

/**
 * Controller to create a new client.
 */
export const createClient = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const clientData = req.body;
  const result = await clientService.createClient(userId, clientData);
  res.status(result.statusCode).json(result);
});

/**
 * Controller to get all clients for a user.
 */
export const getAllClients = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const result = await clientService.getAllClients(userId);
  res.status(result.statusCode).json(result);
});

/**
 * Controller to get a single client.
 */
export const getSingleClient = asyncWrapper(async (req, res, next) => {
  const { clientId } = req.params;
  const { userId } = req.user;

  if (!clientId) {
    throw ApiError.badRequest("Client ID is required.");
  }

  const result = await clientService.getSingleClient(clientId, userId);
  res.status(result.statusCode).json(result);
});

/**
 * Controller to update an existing client.
 */
export const updateClient = asyncWrapper(async (req, res, next) => {
  const { clientId } = req.params;
  const { userId } = req.user;
  const updateData = req.body;

  if (!clientId) {
    throw ApiError.badRequest("Client ID is required.");
  }

  const result = await clientService.updateClient(clientId, userId, updateData);
  res.status(result.statusCode).json(result);
});

/**
 * Controller to delete a client.
 */
export const deleteClient = asyncWrapper(async (req, res, next) => {
  const { clientId } = req.params;
  const { userId } = req.user;

  if (!clientId) {
    throw ApiError.badRequest("Client ID is required.");
  }

  const result = await clientService.deleteClient(clientId, userId);
  res.status(result.statusCode).json(result);
});
