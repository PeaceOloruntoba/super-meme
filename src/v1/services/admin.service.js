import User from "../models/user.model.js";
import Subscription from "../models/subscription.model.js";
import Pattern from "../models/pattern.model.js";
import ApiError from "../../utils/apiError.js";
import subscriptionService from "./subscription.service.js";

const adminService = {
  // Users
  getUsers: async ({ page = 1, limit = 20, search = "", plan, status }) => {
    const query = {};
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (plan) query.plan = plan;
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(query),
    ]);

    const data = items.map((u) => {
      const obj = u.toObject();
      delete obj.password;
      return obj;
    });

    return {
      success: true,
      statusCode: 200,
      message: "Users fetched successfully",
      data: { items: data, page: Number(page), limit: Number(limit), total },
    };
  },

  getUserById: async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound("User not found", "USER_NOT_FOUND");
    user.password = undefined;
    return { success: true, statusCode: 200, data: { user } };
  },

  // Subscriptions
  listSubscriptions: async ({ page = 1, limit = 20, status, planId }) => {
    const query = {};
    if (status) query.status = status;
    if (planId) query.planId = planId;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Subscription.find(query)
        .populate("userId", "firstName lastName email plan")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Subscription.countDocuments(query),
    ]);
    return {
      success: true,
      statusCode: 200,
      data: { items, page: Number(page), limit: Number(limit), total },
    };
  },

  changeUserPlan: async ({ userId, planId }) => {
    if (!planId) throw ApiError.badRequest("planId is required", "PLAN_REQUIRED");
    // Reuse existing subscriptionService logic
    const result = await subscriptionService.subscribe(userId, planId);
    return result;
  },

  cancelUserSubscription: async ({ userId }) => {
    const result = await subscriptionService.cancelSubscription(userId);
    return result;
  },

  // Patterns management (lightweight)
  listPatterns: async ({ page = 1, limit = 20, search = "" }) => {
    const query = {};
    if (search) query.title = { $regex: search, $options: "i" };
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Pattern.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Pattern.countDocuments(query),
    ]);
    return {
      success: true,
      statusCode: 200,
      data: { items, page: Number(page), limit: Number(limit), total },
    };
  },

  deletePattern: async ({ patternId }) => {
    const deleted = await Pattern.findByIdAndDelete(patternId);
    if (!deleted) throw ApiError.notFound("Pattern not found", "PATTERN_NOT_FOUND");
    return { success: true, statusCode: 200, message: "Pattern deleted" };
  },

  // Platform-wide analytics
  getUserAnalytics: async ({ period = "daily" }) => {
    const now = new Date();

    const getRange = (p) => {
      const end = now;
      let start, prevStart, prevEnd;
      if (p === "daily") {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        prevStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
        prevEnd = new Date(start.getTime() - 1);
      } else if (p === "weekly") {
        const day = now.getDay();
        const diffToMonday = (day + 6) % 7; // 0..6
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
        prevStart = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
        prevEnd = new Date(start.getTime() - 1);
      } else if (p === "monthly") {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevEnd = new Date(start.getTime() - 1);
      } else if (p === "yearly") {
        start = new Date(now.getFullYear(), 0, 1);
        prevStart = new Date(now.getFullYear() - 1, 0, 1);
        prevEnd = new Date(start.getTime() - 1);
      } else {
        start = new Date(0);
        prevStart = new Date(0);
        prevEnd = new Date(0);
      }
      return { start, end, prevStart, prevEnd };
    };

    const { start, end, prevStart, prevEnd } = getRange(period);

    const [totalUsers, prevTotalUsers, freeNow, freePrev, premiumNow, premiumPrev, enterpriseNow, enterprisePrev] =
      await Promise.all([
        User.countDocuments({ createdAt: { $gte: start, $lte: end } }),
        User.countDocuments({ createdAt: { $gte: prevStart, $lte: prevEnd } }),
        User.countDocuments({ plan: "free", createdAt: { $lte: end } }),
        User.countDocuments({ plan: "free", createdAt: { $lte: prevEnd } }),
        User.countDocuments({ plan: "premium", createdAt: { $lte: end } }),
        User.countDocuments({ plan: "premium", createdAt: { $lte: prevEnd } }),
        User.countDocuments({ plan: "enterprise", createdAt: { $lte: end } }),
        User.countDocuments({ plan: "enterprise", createdAt: { $lte: prevEnd } }),
      ]);

    const pct = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    return {
      success: true,
      statusCode: 200,
      message: "User analytics computed",
      data: {
        users: {
          period,
          total: totalUsers,
          changePct: Number(pct(totalUsers, prevTotalUsers).toFixed(1)),
        },
        plans: {
          free: {
            total: freeNow,
            changePct: Number(pct(freeNow, freePrev).toFixed(1)),
          },
          premium: {
            total: premiumNow,
            changePct: Number(pct(premiumNow, premiumPrev).toFixed(1)),
          },
          enterprise: {
            total: enterpriseNow,
            changePct: Number(pct(enterpriseNow, enterprisePrev).toFixed(1)),
          },
        },
      },
    };
  },
};

export default adminService;
