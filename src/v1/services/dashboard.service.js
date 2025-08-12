import User from "../models/user.model.js";
import Client from "../models/client.model.js";
import Project from "../models/projects.model.js";
import Pattern from "../models/pattern.model.js";
import Invoice from "../models/invoice.model.js";
import Calendar from "../models/calendar.model.js";
import ApiError from "../../utils/apiError.js";
import mongoose from "mongoose";

const dashboardService = {
  /**
   * Retrieves comprehensive dashboard statistics for a given user.
   * @param {string} userId - The ID of the authenticated user.
   * @returns {Promise<object>} An object containing various dashboard statistics.
   */
  getDashboardStats: async (userId) => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw ApiError.notFound("User not found.");
      }

      const today = new Date();

      const firstDayOfCurrentMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

      const firstDayOfNextMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        1
      );

      const firstDayOfLastMonth = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1
      );

      const activeClientsCurrentMonth = await Client.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        status: "active",
        createdAt: { $gte: firstDayOfCurrentMonth, $lt: firstDayOfNextMonth },
      });

      const activeClientsLastMonth = await Client.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        status: "active",
        createdAt: { $gte: firstDayOfLastMonth, $lt: firstDayOfCurrentMonth },
      });

      const activeClientsChange =
        activeClientsCurrentMonth - activeClientsLastMonth;

      const activeProjectsCount = await Project.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        status: { $in: ["planning", "in-progress", "review"] },
      });

      const patternsCreatedCount = await Pattern.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
      });

      const currentMonthRevenuePipeline = await Invoice.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            status: "paid",
            createdAt: {
              $gte: firstDayOfCurrentMonth,
              $lt: firstDayOfNextMonth,
            },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$amount" },
          },
        },
      ]);
      const currentMonthRevenue =
        currentMonthRevenuePipeline.length > 0
          ? currentMonthRevenuePipeline[0].totalRevenue
          : 0;

      const lastMonthRevenuePipeline = await Invoice.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            status: "paid",
            createdAt: {
              $gte: firstDayOfLastMonth,
              $lt: firstDayOfCurrentMonth,
            },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$amount" },
          },
        },
      ]);
      const lastMonthRevenue =
        lastMonthRevenuePipeline.length > 0
          ? lastMonthRevenuePipeline[0].totalRevenue
          : 0;

      const revenueChangePercentage =
        lastMonthRevenue > 0
          ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
          : currentMonthRevenue > 0
          ? 100
          : 0;

      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(today.getDate() + 7);

      const upcomingDeadlines = await Calendar.find({
        userId: new mongoose.Types.ObjectId(userId),
        type: "deadline",
        status: "scheduled",
        endTime: { $gte: today, $lte: sevenDaysFromNow },
      })
        .populate("clientId", "name")
        .sort({ endTime: 1 })
        .limit(3);

      const recentProjects = await Project.find({
        userId: new mongoose.Types.ObjectId(userId),
      })
        .sort({ createdAt: -1 })
        .limit(2);
      const recentClients = await Client.find({
        userId: new mongoose.Types.ObjectId(userId),
      })
        .sort({ createdAt: -1 })
        .limit(1);
      const recentPatterns = await Pattern.find({
        userId: new mongoose.Types.ObjectId(userId),
      })
        .sort({ createdAt: -1 })
        .limit(2);

      const recentActivity = [
        ...recentProjects.map((p) => ({
          type: "Project",
          description: `New project "${p.name}" created.`,
          createdAt: p.createdAt,
          id: p._id,
        })),
        ...recentClients.map((c) => ({
          type: "Client",
          description: `New client "${c.name}" added.`,
          createdAt: c.createdAt,
          id: c._id,
        })),
        ...recentPatterns.map((pa) => ({
          type: "Pattern",
          description: `Pattern "${pa.name}" created.`,
          createdAt: pa.createdAt,
          id: pa._id,
        })),
      ]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5);

      return {
        success: true,
        statusCode: 200,
        message: "Dashboard statistics retrieved successfully.",
        data: {
          activeClients: {
            currentMonthCount: activeClientsCurrentMonth,
            changeFromLastMonth: activeClientsChange,
          },
          activeProjects: activeProjectsCount,
          patternsCreated: patternsCreatedCount,
          revenue: {
            currentMonth: currentMonthRevenue,
            lastMonth: lastMonthRevenue,
            changePercentage: revenueChangePercentage,
          },
          upcomingDeadlines: upcomingDeadlines.map((event) => ({
            id: event._id,
            title: event.title,
            clientName: event.clientId ? event.clientId.name : "N/A",
            dueDate: event.endTime,
            priority: event.priority || "medium",
          })),
          recentActivity: recentActivity,
        },
      };
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internalServerError(
        "Failed to retrieve dashboard statistics."
      );
    }
  },
};

export default dashboardService;
