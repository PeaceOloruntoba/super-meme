import User from "../models/user.model.js";
import Client from "../models/client.model.js";
import Project from "../models/projects.model.js";
import Pattern from "../models/pattern.model.js";
import Invoice from "../models/invoice.model.js";
import ApiError from "../../utils/apiError.js";
import mongoose from "mongoose";

const analyticsService = {
  /**
   * Helper to determine date ranges based on the time period.
   * @param {string} timePeriod - "1month", "3months", "6months", "1year", "all"
   * @returns {object} { startDate, endDate, prevStartDate, prevEndDate }
   */
  getTimePeriodDates: (timePeriod) => {
    const now = new Date();
    let startDate, endDate, prevStartDate, prevEndDate;

    endDate = now; // End date is always up to now

    switch (timePeriod) {
      case "1month":
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          now.getDate()
        );
        prevStartDate = new Date(
          now.getFullYear(),
          now.getMonth() - 2,
          now.getDate()
        );
        prevEndDate = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          now.getDate()
        );
        break;
      case "3months":
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 3,
          now.getDate()
        );
        prevStartDate = new Date(
          now.getFullYear(),
          now.getMonth() - 6,
          now.getDate()
        );
        prevEndDate = new Date(
          now.getFullYear(),
          now.getMonth() - 3,
          now.getDate()
        );
        break;
      case "6months":
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 6,
          now.getDate()
        );
        prevStartDate = new Date(
          now.getFullYear(),
          now.getMonth() - 12,
          now.getDate()
        );
        prevEndDate = new Date(
          now.getFullYear(),
          now.getMonth() - 6,
          now.getDate()
        );
        break;
      case "1year":
        startDate = new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate()
        );
        prevStartDate = new Date(
          now.getFullYear() - 2,
          now.getMonth(),
          now.getDate()
        );
        prevEndDate = new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate()
        );
        break;
      case "all":
      default:
        startDate = new Date(0); // Epoch time
        // For "all", prev period doesn't make logical sense for change %
        prevStartDate = new Date(0);
        prevEndDate = new Date(0);
        break;
    }
    return { startDate, endDate, prevStartDate, prevEndDate };
  },

  /**
   * Calculates percentage change. Handles division by zero.
   * @param {number} current - Current value.
   * @param {number} previous - Previous value.
   * @returns {number} Percentage change.
   */
  calculateChangePercentage: (current, previous) => {
    if (previous === 0) {
      return current > 0 ? 100 : 0; // If previous was 0 and current is > 0, it's 100% growth
    }
    // Ensures no NaN if current and previous are same non-zero values
    if (current === previous) return 0;
    return ((current - previous) / previous) * 100;
  },

  /**
   * Retrieves comprehensive analytics statistics for a given user and time period.
   * @param {string} userId - The ID of the authenticated user.
   * @param {string} timePeriod - The desired time frame for analytics (e.g., "1month", "6months", "1year", "all").
   * @returns {Promise<object>} An object containing various analytics statistics.
   */
  getAnalyticsStats: async (userId, timePeriod) => {
    try {
      // Ensure the user exists
      const user = await User.findById(userId);
      if (!user) {
        throw ApiError.notFound("User not found.");
      }

      const { startDate, endDate, prevStartDate, prevEndDate } =
        analyticsService.getTimePeriodDates(timePeriod);

      const userObjectId = new mongoose.Types.ObjectId(userId);
      const now = new Date(); // To ensure consistency for 6-month trend calculations

      // --- Key Metrics Calculations ---

      // Total Revenue
      const currentPeriodRevenueResult = await Invoice.aggregate([
        {
          $match: {
            userId: userObjectId,
            status: "paid",
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      const totalRevenue =
        currentPeriodRevenueResult.length > 0
          ? currentPeriodRevenueResult[0].total
          : 0;

      const prevPeriodRevenueResult = await Invoice.aggregate([
        {
          $match: {
            userId: userObjectId,
            status: "paid",
            createdAt: { $gte: prevStartDate, $lte: prevEndDate },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      const prevTotalRevenue =
        prevPeriodRevenueResult.length > 0
          ? prevPeriodRevenueResult[0].total
          : 0;
      const totalRevenueChange = analyticsService.calculateChangePercentage(
        totalRevenue,
        prevTotalRevenue
      );

      // Active Clients (total clients with status 'active' at the end of the period)
      const activeClientsCount = await Client.countDocuments({
        userId: userObjectId,
        status: "active",
        createdAt: { $lte: endDate }, // Clients created up to the end date and are active
      });
      const prevActiveClientsCount = await Client.countDocuments({
        userId: userObjectId,
        status: "active",
        createdAt: { $lte: prevEndDate },
      });
      const activeClientsChange = analyticsService.calculateChangePercentage(
        activeClientsCount,
        prevActiveClientsCount
      );

      // Projects Completed
      const currentPeriodCompletedProjects = await Project.countDocuments({
        userId: userObjectId,
        status: "completed",
        updatedAt: { $gte: startDate, $lte: endDate },
      });
      const prevPeriodCompletedProjects = await Project.countDocuments({
        userId: userObjectId,
        status: "completed",
        updatedAt: { $gte: prevStartDate, $lte: prevEndDate },
      });
      const projectsCompletedChange =
        analyticsService.calculateChangePercentage(
          currentPeriodCompletedProjects,
          prevPeriodCompletedProjects
        );

      // Average Project Value (sum of paid invoices for completed projects / count of such projects in current period)
      const currentPeriodProjectValues = await Project.aggregate([
        {
          $match: {
            userId: userObjectId,
            status: "completed",
            updatedAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $lookup: {
            from: "invoices",
            localField: "_id",
            foreignField: "projectId",
            as: "invoices",
          },
        },
        { $unwind: "$invoices" },
        { $match: { "invoices.status": "paid" } }, // Only consider paid invoices linked to completed projects
        {
          $group: {
            _id: null,
            totalValue: { $sum: "$invoices.amount" },
            projectCount: { $sum: 1 },
          },
        },
      ]);
      const avgProjectValue =
        currentPeriodProjectValues.length > 0
          ? currentPeriodProjectValues[0].totalValue /
            currentPeriodProjectValues[0].projectCount
          : 0;

      const prevPeriodProjectValues = await Project.aggregate([
        {
          $match: {
            userId: userObjectId,
            status: "completed",
            updatedAt: { $gte: prevStartDate, $lte: prevEndDate },
          },
        },
        {
          $lookup: {
            from: "invoices",
            localField: "_id",
            foreignField: "projectId",
            as: "invoices",
          },
        },
        { $unwind: "$invoices" },
        { $match: { "invoices.status": "paid" } },
        {
          $group: {
            _id: null,
            totalValue: { $sum: "$invoices.amount" },
            projectCount: { $sum: 1 },
          },
        },
      ]);
      const prevAvgProjectValue =
        prevPeriodProjectValues.length > 0
          ? prevPeriodProjectValues[0].totalValue /
            prevPeriodProjectValues[0].projectCount
          : 0;
      const avgProjectValueChange = analyticsService.calculateChangePercentage(
        avgProjectValue,
        prevAvgProjectValue
      );

      // --- Revenue Analysis ---

      // Monthly Revenue Trend (last 6 months, for chart display)
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const monthlyRevenueTrendAgg = await Invoice.aggregate([
        {
          $match: {
            userId: userObjectId,
            status: "paid",
            createdAt: { $gte: sixMonthsAgo, $lte: now },
          },
        },
        {
          $lookup: {
            from: "projects",
            localField: "projectId",
            foreignField: "_id",
            as: "projectDetails",
          },
        },
        {
          $unwind: {
            path: "$projectDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            revenue: { $sum: "$amount" },
            projectsCount: { $sum: 1 }, // Sum of invoices, which corresponds to projects with a paid invoice
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
        {
          $project: {
            _id: 0,
            month: {
              // Map month number to short name
              $switch: {
                branches: [
                  { case: { $eq: ["$_id.month", 1] }, then: "Jan" },
                  { case: { $eq: ["$_id.month", 2] }, then: "Feb" },
                  { case: { $eq: ["$_id.month", 3] }, then: "Mar" },
                  { case: { $eq: ["$_id.month", 4] }, then: "Apr" },
                  { case: { $eq: ["$_id.month", 5] }, then: "May" },
                  { case: { $eq: ["$_id.month", 6] }, then: "Jun" },
                  { case: { $eq: ["$_id.month", 7] }, then: "Jul" },
                  { case: { $eq: ["$_id.month", 8] }, then: "Aug" },
                  { case: { $eq: ["$_id.month", 9] }, then: "Sep" },
                  { case: { $eq: ["$_id.month", 10] }, then: "Oct" },
                  { case: { $eq: ["$_id.month", 11] }, then: "Nov" },
                  { case: { $eq: ["$_id.month", 12] }, then: "Dec" },
                ],
                default: "Unknown",
              },
            },
            year: "$_id.year",
            revenue: "$revenue",
            projectsCount: "$projectsCount",
          },
        },
      ]);

      // Fill in missing months with 0 revenue for consistent 6-month chart display
      const filledMonthlyRevenueTrend = [];
      for (let i = 5; i >= 0; i--) {
        // Iterate for last 6 months including current
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = d.toLocaleString("en-US", { month: "short" });
        const year = d.getFullYear();
        const existingData = monthlyRevenueTrendAgg.find(
          (item) => item.month === monthName && item.year === year
        );
        filledMonthlyRevenueTrend.push(
          existingData || {
            month: monthName,
            year: year,
            revenue: 0,
            projectsCount: 0,
          }
        );
      }

      // Revenue by Service Type
      const revenueByServiceTypeAgg = await Invoice.aggregate([
        {
          $match: {
            userId: userObjectId,
            status: "paid",
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $lookup: {
            from: "projects", // assuming your Project model is 'projects' collection
            localField: "projectId",
            foreignField: "_id",
            as: "projectDetails",
          },
        },
        { $unwind: "$projectDetails" },
        { $match: { "projectDetails.userId": userObjectId } }, // Ensure project also belongs to user
        {
          $group: {
            _id: "$projectDetails.type", // Group by project type
            totalRevenue: { $sum: "$amount" },
            projectCount: { $sum: 1 }, // Count projects for this type
          },
        },
        { $sort: { totalRevenue: -1 } },
        {
          $project: {
            _id: 0,
            type: "$_id",
            revenue: "$totalRevenue",
            count: "$projectCount",
          },
        },
      ]);

      const totalRevenueForServiceTypes = revenueByServiceTypeAgg.reduce(
        (sum, item) => sum + item.revenue,
        0
      );
      const revenueByServiceTypeFormatted = revenueByServiceTypeAgg.map(
        (item) => ({
          ...item,
          percentage:
            totalRevenueForServiceTypes > 0
              ? (item.revenue / totalRevenueForServiceTypes) * 100
              : 0,
        })
      );

      // --- Client Insights ---

      // New Clients Acquired (clients created within the current period)
      const newClientsThisPeriod = await Client.countDocuments({
        userId: userObjectId,
        createdAt: { $gte: startDate, $lte: endDate },
      });

      // Average Projects per Client (using all projects and all clients up to end date)
      const totalProjectsAllTime = await Project.countDocuments({
        userId: userObjectId,
        createdAt: { $lte: endDate },
      });
      const totalClientsAllTime = await Client.countDocuments({
        userId: userObjectId,
        createdAt: { $lte: endDate },
      });
      const avgProjectsPerClient =
        totalClientsAllTime > 0
          ? totalProjectsAllTime / totalClientsAllTime
          : 0;

      // Top Clients by Revenue
      const topClientsByRevenue = await Invoice.aggregate([
        {
          $match: {
            userId: userObjectId,
            status: "paid",
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: "$clientId",
            totalRevenue: { $sum: "$amount" },
            projectsCount: { $addToSet: "$projectId" }, // Get unique project IDs
          },
        },
        {
          $project: {
            _id: 1,
            totalRevenue: 1,
            projectsCount: { $size: "$projectsCount" }, // Count unique projects
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 5 }, // Top 5 clients
        {
          $lookup: {
            from: "clients", // assuming your Client model is 'clients' collection
            localField: "_id",
            foreignField: "_id",
            as: "clientDetails",
          },
        },
        { $unwind: "$clientDetails" },
        {
          $project: {
            id: "$_id",
            name: "$clientDetails.name",
            projects: "$projectsCount",
            value: "$totalRevenue",
          },
        },
      ]);

      // --- Project Performance ---

      // Project Status Distribution
      const projectStatusDistribution = await Project.aggregate([
        {
          $match: {
            userId: userObjectId,
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $project: { _id: 0, status: "$_id", count: 1 } },
      ]);
      const totalProjectsInPeriod = projectStatusDistribution.reduce(
        (sum, item) => sum + item.count,
        0
      );
      const projectStatusDistributionFormatted = projectStatusDistribution.map(
        (item) => ({
          ...item,
          percentage:
            totalProjectsInPeriod > 0
              ? (item.count / totalProjectsInPeriod) * 100
              : 0,
        })
      );

      // Project Timeline Performance
      const completedProjectsForTimeline = await Project.find({
        userId: userObjectId,
        status: "completed",
        updatedAt: { $gte: startDate, $lte: endDate },
      });

      let onTimeCount = 0;
      let totalDurationDays = 0;
      let projectsDelayed = 0;

      for (const project of completedProjectsForTimeline) {
        const duration =
          (project.updatedAt.getTime() - project.createdAt.getTime()) /
          (1000 * 60 * 60 * 24);
        totalDurationDays += duration;

        if (project.dueDate) {
          // Compare completed date with due date
          if (project.updatedAt.getTime() <= project.dueDate.getTime()) {
            onTimeCount++;
          } else {
            projectsDelayed++;
          }
        }
      }

      const totalCompletedProjectsForTimeline =
        completedProjectsForTimeline.length;
      const onTimeDeliveryRate =
        totalCompletedProjectsForTimeline > 0
          ? (onTimeCount / totalCompletedProjectsForTimeline) * 100
          : 0;
      const avgDaysToComplete =
        totalCompletedProjectsForTimeline > 0
          ? totalDurationDays / totalCompletedProjectsForTimeline
          : 0;

      return {
        success: true,
        statusCode: 200,
        message: "Analytics data retrieved successfully.",
        data: {
          keyMetrics: {
            totalRevenue: totalRevenue,
            totalRevenueChange: parseFloat(totalRevenueChange.toFixed(1)),
            activeClients: activeClientsCount,
            activeClientsChange: parseFloat(activeClientsChange.toFixed(1)),
            projectsCompleted: currentPeriodCompletedProjects,
            projectsCompletedChange: parseFloat(
              projectsCompletedChange.toFixed(1)
            ),
            avgProjectValue: parseFloat(avgProjectValue.toFixed(2)),
            avgProjectValueChange: parseFloat(avgProjectValueChange.toFixed(1)),
          },
          revenueAnalysis: {
            monthlyTrend: filledMonthlyRevenueTrend,
            byServiceType: revenueByServiceTypeFormatted,
          },
          clientInsights: {
            newClientsThisPeriod: newClientsThisPeriod,
            avgProjectsPerClient: parseFloat(avgProjectsPerClient.toFixed(1)),
            topClients: topClientsByRevenue,
          },
          projectPerformance: {
            statusDistribution: projectStatusDistributionFormatted,
            timelinePerformance: {
              onTimeDeliveryRate: parseFloat(onTimeDeliveryRate.toFixed(1)),
              avgDaysToComplete: parseFloat(avgDaysToComplete.toFixed(1)),
              projectsDelayed: projectsDelayed,
            },
          },
          // efficiencyMetrics removed as per user request to avoid dummy data
        },
      };
    } catch (error) {
      console.error("Error fetching analytics stats:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internalServerError(
        "Failed to retrieve analytics statistics."
      );
    }
  },
};

export default analyticsService;
