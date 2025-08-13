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
      // Ensure the user exists
      const user = await User.findById(userId);
      if (!user) {
        throw ApiError.notFound("User not found.");
      }

      const today = new Date();
      // Set to the first day of the current month
      const firstDayOfCurrentMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );
      // Set to the first day of the next month (exclusive end date for current month data)
      const firstDayOfNextMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        1
      );
      // Set to the first day of the previous month
      const firstDayOfLastMonth = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1
      );

      // Calculate start of current week (e.g., Sunday 00:00:00)
      const startOfCurrentWeek = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - today.getDay()
      );
      startOfCurrentWeek.setHours(0, 0, 0, 0); // Set to start of the day

      // Calculate 7 days ago for "created this week" metrics
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);

      // Calculate 7 days from now for "due this week" metrics (CORRECTED LOCATION)
      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(today.getDate() + 7);

      // --- 1. Active Clients Count (Current Month vs. Last Month) ---
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

      // --- 2. Active Projects Count & Projects Due This Week ---
      const activeProjectsCount = await Project.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        status: { $in: ["planning", "in-progress", "review"] },
      });

      const projectsDueThisWeek = await Project.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        status: { $in: ["planning", "in-progress", "review"] },
        dueDate: { $gte: startOfCurrentWeek, $lte: sevenDaysFromNow }, // Projects due from start of week to 7 days from now
      });

      // --- 3. Total Patterns Created & Patterns Created This Week ---
      const patternsCreatedCount = await Pattern.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
      });

      const patternsCreatedThisWeek = await Pattern.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: sevenDaysAgo, $lte: today },
      });

      // --- 4. Revenue Stats (Current Month vs. Last Month) ---
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
          : 0; // If last month was 0, and current is > 0, it's 100% growth

      // --- 5. Upcoming Deadlines (within next 7 days) ---
      // The declaration of sevenDaysFromNow is now here and also at the top.
      // Keeping it at the top is cleaner.

      const upcomingDeadlines = await Calendar.find({
        userId: new mongoose.Types.ObjectId(userId),
        type: "deadline",
        status: "scheduled",
        endTime: { $gte: today, $lte: sevenDaysFromNow },
      })
        .populate("clientId", "name")
        .sort({ endTime: 1 })
        .limit(3);

      // --- 6. Recent Activity ---
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
          projectsDueThisWeek: projectsDueThisWeek, // NEW
          patternsCreated: patternsCreatedCount,
          patternsCreatedThisWeek: patternsCreatedThisWeek, // NEW
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
