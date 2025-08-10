import Project from "../models/projects.model.js";
import ApiError from "../../utils/apiError.js";

const projectService = {
  /**
   * Creates a new project record for a specific user and client.
   * @param {string} userId - The ID of the user creating the project.
   * @param {string} clientId - The ID of the client the project is for.
   * @param {object} projectData - The project data.
   * @returns {Promise<object>} The newly created project.
   */
  createProject: async (userId, clientId, projectData) => {
    try {
      const newProject = await Project.create({
        ...projectData,
        userId,
        clientId,
      });
      return {
        success: true,
        statusCode: 201,
        message: "Project created successfully.",
        data: { project: newProject },
      };
    } catch (error) {
      console.error("Error creating project:", error);

      if (error.name === "ValidationError") {
        throw ApiError.badRequest(error.message);
      }
      throw ApiError.internalServerError("Failed to create project.");
    }
  },

  /**
   * Retrieves all project records for a specific user.
   * This endpoint is suitable for a user's general project list.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object>} An array of project records.
   */
  getAllProjects: async (userId) => {
    try {
      const projects = await Project.find({ userId })
        .populate("clientId", "name email")
        .sort({ createdAt: -1 });
      return {
        success: true,
        statusCode: 200,
        message: "Projects retrieved successfully.",
        data: { projects },
      };
    } catch (error) {
      console.error("Error retrieving all projects:", error);
      throw ApiError.internalServerError("Failed to retrieve projects.");
    }
  },

  /**
   * Retrieves all project records for a specific client, ensuring they belong to the user.
   * This endpoint is suitable for viewing projects associated with a particular client.
   * @param {string} userId - The ID of the user.
   * @param {string} clientId - The ID of the client.
   * @returns {Promise<object>} An array of project records.
   */
  getAllProjectsByClient: async (userId, clientId) => {
    try {
      const projects = await Project.find({ userId, clientId })
        .populate("clientId", "name email")
        .sort({ createdAt: -1 });
      return {
        success: true,
        statusCode: 200,
        message: "Projects retrieved successfully for this client.",
        data: { projects },
      };
    } catch (error) {
      console.error("Error retrieving projects by client:", error);
      throw ApiError.internalServerError("Failed to retrieve client projects.");
    }
  },

  /**
   * Retrieves a single project record by its ID, confirming ownership by the user.
   * @param {string} projectId - The ID of the project record.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object>} The single project record.
   */
  getSingleProject: async (projectId, userId) => {
    try {
      const project = await Project.findOne({
        _id: projectId,
        userId,
      }).populate("clientId", "name email");

      if (!project) {
        throw ApiError.notFound("Project record not found.");
      }
      return {
        success: true,
        statusCode: 200,
        message: "Project retrieved successfully.",
        data: { project },
      };
    } catch (error) {
      console.error(`Error retrieving single project ${projectId}:`, error);

      if (error.name === "CastError") {
        throw ApiError.badRequest("Invalid Project ID format.");
      }
      throw ApiError.internalServerError("Failed to retrieve project.");
    }
  },

  /**
   * Updates an existing project record, confirming ownership by the user.
   * @param {string} projectId - The ID of the project to update.
   * @param {string} userId - The ID of the user.
   * @param {object} updateData - The data to update.
   * @returns {Promise<object>} The updated project record.
   */
  updateProject: async (projectId, userId, updateData) => {
    try {
      const updatedProject = await Project.findOneAndUpdate(
        { _id: projectId, userId },
        { $set: updateData },
        { new: true, runValidators: true }
      ).populate("clientId", "name email");

      if (!updatedProject) {
        throw ApiError.notFound(
          "Project record not found or you don't have permission to update it."
        );
      }
      return {
        success: true,
        statusCode: 200,
        message: "Project record updated successfully.",
        data: { project: updatedProject },
      };
    } catch (error) {
      console.error(`Error updating project ${projectId}:`, error);

      if (error.name === "CastError") {
        throw ApiError.badRequest(
          "Invalid Project ID format or invalid update data format."
        );
      }
      if (error.name === "ValidationError") {
        throw ApiError.badRequest(error.message);
      }
      throw ApiError.internalServerError("Failed to update project.");
    }
  },

  /**
   * Deletes a project record, confirming ownership by the user.
   * @param {string} projectId - The ID of the project to delete.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object>} A confirmation message.
   */
  deleteProject: async (projectId, userId) => {
    try {
      const project = await Project.findOneAndDelete({
        _id: projectId,
        userId,
      });
      if (!project) {
        throw ApiError.notFound(
          "Project record not found or you don't have permission to delete it."
        );
      }
      return {
        success: true,
        statusCode: 200,
        message: "Project record deleted successfully.",
        data: null,
      };
    } catch (error) {
      console.error(`Error deleting project ${projectId}:`, error);

      if (error.name === "CastError") {
        throw ApiError.badRequest("Invalid Project ID format.");
      }
      throw ApiError.internalServerError("Failed to delete project.");
    }
  },
};

export default projectService;
