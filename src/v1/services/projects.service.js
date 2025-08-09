import Products from "../models/products.model.js";
import ApiError from "../../utils/apiError.js";

const productsService = {
  /**
   * Creates a new project record for a specific client.
   * @param {string} userId - The ID of the user creating the project.
   * @param {string} clientId - The ID of the client the project is for.
   * @param {object} projectData - The project data.
   * @returns {Promise<object>} The newly created project.
   */
  createProject: async (userId, clientId, projectData) => {
    const newProject = await Products.create({
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
  },

  /**
   * Retrieves all project records for a specific client.
   * @param {string} userId - The ID of the user.
   * @param {string} clientId - The ID of the client.
   * @returns {Promise<object>} An array of project records.
   */
  getAllProjectsByClient: async (userId, clientId) => {
    const projects = await Products.find({ userId, clientId }).sort({
      createdAt: -1,
    });
    return {
      success: true,
      statusCode: 200,
      message: "Projects retrieved successfully.",
      data: { projects },
    };
  },

  /**
   * Retrieves a single project record by its ID.
   * @param {string} projectId - The ID of the project record.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object>} The single project record.
   */
  getSingleProject: async (projectId, userId) => {
    const project = await Products.findOne({
      _id: projectId,
      userId,
    });
    if (!project) {
      throw ApiError.notFound("Project record not found.");
    }
    return {
      success: true,
      statusCode: 200,
      message: "Project retrieved successfully.",
      data: { project },
    };
  },

  /**
   * Updates an existing project record.
   * @param {string} projectId - The ID of the project to update.
   * @param {string} userId - The ID of the user.
   * @param {object} updateData - The data to update.
   * @returns {Promise<object>} The updated project record.
   */
  updateProject: async (projectId, userId, updateData) => {
    const updatedProject = await Products.findOneAndUpdate(
      { _id: projectId, userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
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
  },

  /**
   * Deletes a project record.
   * @param {string} projectId - The ID of the project to delete.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object>} A confirmation message.
   */
  deleteProject: async (projectId, userId) => {
    const project = await Products.findOneAndDelete({
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
  },
};

export default productsService;
