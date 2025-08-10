import asyncWrapper from "../../middlewares/asyncWrapper.js";
import projectService from "../services/projects.service.js";
import ApiError from "../../utils/apiError.js";

/**
 * Controller to create a new project.
 * Expects clientId in req.body for this route, or can be modified to accept from params.
 * For consistency with nested routes, we'll expect it in req.params for the nested route.
 * For top-level project creation, it's typically in the body.
 */
export const createProject = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const { clientId } = req.body;
  const projectData = req.body;

  if (!clientId) {
    throw ApiError.badRequest("Client ID is required to create a project.");
  }

  const result = await projectService.createProject(
    userId,
    clientId,
    projectData
  );
  res.status(result.statusCode).json(result);
});

/**
 * Controller to get all projects for the authenticated user.
 */
export const getAllProjects = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const result = await projectService.getAllProjects(userId);
  res.status(result.statusCode).json(result);
});

/**
 * Controller to get all projects for a specific client (belonging to the user).
 * This controller expects clientId from URL parameters due to route nesting.
 */
export const getAllProjectsByClient = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const { clientId } = req.params;
  if (!clientId) {
    throw ApiError.badRequest("Client ID is required in URL parameters.");
  }
  const result = await projectService.getAllProjectsByClient(userId, clientId);
  res.status(result.statusCode).json(result);
});

/**
 * Controller to get a single project.
 */
export const getSingleProject = asyncWrapper(async (req, res, next) => {
  const { projectId } = req.params;
  const { userId } = req.user;

  if (!projectId) {
    throw ApiError.badRequest("Project ID is required.");
  }

  const result = await projectService.getSingleProject(projectId, userId);
  res.status(result.statusCode).json(result);
});

/**
 * Controller to update an existing project.
 */
export const updateProject = asyncWrapper(async (req, res, next) => {
  const { projectId } = req.params;
  const { userId } = req.user;
  const updateData = req.body;

  if (!projectId) {
    throw ApiError.badRequest("Project ID is required.");
  }

  const result = await projectService.updateProject(
    projectId,
    userId,
    updateData
  );
  res.status(result.statusCode).json(result);
});

/**
 * Controller to delete a project.
 */
export const deleteProject = asyncWrapper(async (req, res, next) => {
  const { projectId } = req.params;
  const { userId } = req.user;

  if (!projectId) {
    throw ApiError.badRequest("Project ID is required.");
  }

  const result = await projectService.deleteProject(projectId, userId);
  res.status(result.statusCode).json(result);
});
