import asyncWrapper from "../../middlewares/asyncWrapper.js";
import analyticsService from "../services/analytics.service.js";
import ApiError from "../../utils/apiError.js";

/**
 * Controller to get analytics statistics for the authenticated user based on time period.
 */
export const getAnalytics = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user; // Assuming userId is populated by auth middleware
  const { timePeriod } = req.query; // Get timePeriod from query parameters

  if (!userId) {
    throw ApiError.unauthorized("User ID not found in request.");
  }

  // Validate timePeriod (optional but recommended)
  const allowedTimePeriods = ["1month", "3months", "6months", "1year", "all"];
  if (timePeriod && !allowedTimePeriods.includes(timePeriod)) {
    throw ApiError.badRequest("Invalid time period specified.");
  }

  const result = await analyticsService.getAnalyticsStats(
    userId,
    timePeriod || "all"
  ); // Default to 'all' if not specified
  res.status(result.statusCode).json(result);
});
