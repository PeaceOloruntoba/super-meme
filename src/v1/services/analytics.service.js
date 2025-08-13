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
        prevStartDate = new Date(0); // No real previous period for "all"
        prevEndDate = new Date(0);
        break;
    }
    return { startDate, endDate, prevStartDate, prevEndDate };
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
      const totalRevenueChange =
        prevTotalRevenue > 0
          ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100
          : totalRevenue > 0
          ? 100
          : 0;

      // Active Clients
      const currentPeriodClients = await Client.countDocuments({
        userId: userObjectId,
        createdAt: { $gte: startDate, $lte: endDate },
      });
      const prevPeriodClients = await Client.countDocuments({
        userId: userObjectId,
        createdAt: { $gte: prevStartDate, $lte: prevEndDate },
      });
      const activeClientsChange =
        prevPeriodClients > 0
          ? ((currentPeriodClients - prevPeriodClients) / prevPeriodClients) *
            100
          : currentPeriodClients > 0
          ? 100
          : 0;

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
        prevPeriodCompletedProjects > 0
          ? ((currentPeriodCompletedProjects - prevPeriodCompletedProjects) /
              prevPeriodCompletedProjects) *
            100
          : currentPeriodCompletedProjects > 0
          ? 100
          : 0;

      // Average Project Value (sum of completed project invoices / count of completed projects)
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
        { $match: { "invoices.status": "paid" } },
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
      const avgProjectValueChange =
        prevAvgProjectValue > 0
          ? ((avgProjectValue - prevAvgProjectValue) / prevAvgProjectValue) *
            100
          : avgProjectValue > 0
          ? 100
          : 0;

      // --- Revenue Analysis ---

      // Monthly Revenue Trend (last 6 months)
      const monthlyRevenueTrend = await Invoice.aggregate([
        {
          $match: {
            userId: userObjectId,
            status: "paid",
            createdAt: {
              $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1),
              $lte: now,
            }, // Last 6 months
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            revenue: { $sum: "$amount" },
            // To get projects completed in this month, we would need to join with Projects and count.
            // For simplicity, we'll just sum invoices here.
            // Getting project count per month in this aggregation is complex without a direct link,
            // or requires a separate lookup. Let's keep it revenue for simplicity for now.
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
        {
          $project: {
            _id: 0,
            month: {
              // Map month number to name
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
          },
        },
      ]);
      // Filling in missing months with 0 revenue for last 6 months for consistent chart display
      const filledMonthlyRevenueTrend = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = d.toLocaleString("en-US", { month: "short" });
        const year = d.getFullYear();
        const existingData = monthlyRevenueTrend.find(
          (item) => item.month === monthName && item.year === year
        );
        filledMonthlyRevenueTrend.push(
          existingData || { month: monthName, year: year, revenue: 0 }
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
            _id: "$projectDetails.type",
            totalRevenue: { $sum: "$amount" },
            projectCount: { $sum: 1 },
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

      // --- Efficiency Metrics (using mock data as detailed tracking isn't in models) ---
      // These would ideally come from specific time-tracking or QA models.
      const efficiencyMetrics = {
        timeEfficiencyByProjectType: [
          { type: "Wedding Dress", avgHours: 45, efficiencyScore: 92 },
          { type: "Business Suit", avgHours: 28, efficiencyScore: 88 },
          { type: "Casual Dress", avgHours: 18, efficiencyScore: 95 },
          { type: "Evening Gown", avgHours: 35, efficiencyScore: 85 },
        ],
        resourceUtilization: {
          overall: 78,
          peak: 95,
          offPeak: 45,
        },
        qualityMetrics: {
          avgClientRating: 4.8,
          avgRevisions: 1.2,
          firstFitSuccessRate: 96,
        },
      };

      return {
        success: true,
        statusCode: 200,
        message: "Analytics data retrieved successfully.",
        data: {
          keyMetrics: {
            totalRevenue: totalRevenue,
            totalRevenueChange: totalRevenueChange,
            activeClients: currentPeriodClients,
            activeClientsChange: activeClientsChange,
            projectsCompleted: currentPeriodCompletedProjects,
            projectsCompletedChange: projectsCompletedChange,
            avgProjectValue: avgProjectValue,
            avgProjectValueChange: avgProjectValueChange,
          },
          revenueAnalysis: {
            monthlyTrend: filledMonthlyRevenueTrend,
            byServiceType: revenueByServiceTypeFormatted,
          },
          projectPerformance: {
            statusDistribution: projectStatusDistributionFormatted,
            timelinePerformance: {
              onTimeDeliveryRate: onTimeDeliveryRate,
              avgDaysToComplete: avgDaysToComplete,
              projectsDelayed: projectsDelayed,
            },
          },
          efficiencyMetrics: efficiencyMetrics, // Mocked for now
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
