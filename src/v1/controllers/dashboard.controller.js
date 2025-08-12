import asyncWrapper from "../../middlewares/asyncWrapper.js";
import dashboardService from "../services/dashboard.service.js";
import ApiError from "../../utils/apiError.js";

/**
 * Controller to get dashboard statistics for the authenticated user.
 */
export const getDashboardStats = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  if (!userId) {
    throw ApiError.unauthorized("User ID not found in request.");
  }

  const result = await dashboardService.getDashboardStats(userId);
  res.status(result.statusCode).json(result);
});
