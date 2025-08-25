import asyncWrapper from "./asyncWrapper.js";
import User from "../v1/models/user.model.js";
import Client from "../v1/models/client.model.js";
import Project from "../v1/models/projects.model.js";
import ApiError from "../utils/apiError.js";

const PLAN_LIMITS = {
  free: {
    maxClients: 3,
    maxProjects: 5,
    maxAIGenerationsPerMonth: 5,
    hasAdvancedMeasurements: false,
    hasProfessionalPatternDesigner: false,
    hasCalendarScheduling: false,
    hasInvoiceGeneration: false,
    hasAnalyticsDashboard: false,
    hasClientPortal: false,
    hasTeamCollaboration: false,
    hasCustomBranding: false,
  },
  premium: {
    maxClients: Infinity,
    maxProjects: Infinity,
    maxAIGenerationsPerMonth: Infinity,
    hasAdvancedMeasurements: true,
    hasProfessionalPatternDesigner: true,
    hasCalendarScheduling: true,
    hasInvoiceGeneration: true,
    hasAnalyticsDashboard: true,
    hasClientPortal: true,
    hasTeamCollaboration: false,
    hasCustomBranding: false,
  },
  enterprise: {
    maxClients: Infinity,
    maxProjects: Infinity,
    maxAIGenerationsPerMonth: Infinity,
    hasAdvancedMeasurements: true,
    hasProfessionalPatternDesigner: true,
    hasCalendarScheduling: true,
    hasInvoiceGeneration: true,
    hasAnalyticsDashboard: true,
    hasClientPortal: true,
    hasTeamCollaboration: true,
    hasCustomBranding: true,
  },
};

export const requireFeature = (feature) => async (req, res, next) => {
  const { userId } = req.user;
  const user = await User.findById(userId);
  if (!user) return next(ApiError.notFound("User not found", "USER_NOT_FOUND"));

  if (!user.isSubActive) {
    return next(
      ApiError.forbidden(
        "Subscription is inactive. Please renew or upgrade.",
        "SUBSCRIPTION_INACTIVE"
      )
    );
  }

  const limits = PLAN_LIMITS[user.plan];
  if (!limits[feature]) {
    return next(
      ApiError.forbidden(
        `Feature '${feature.replace("has", "")}' requires a higher plan.`,
        "FEATURE_NOT_AVAILABLE"
      )
    );
  }

  next();
};

export const checkClientLimit = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const user = await User.findById(userId);
  if (!user) return next(ApiError.notFound("User not found", "USER_NOT_FOUND"));

  const limits = PLAN_LIMITS[user.plan];
  const clientCount = await Client.countDocuments({ userId });

  if (clientCount >= limits.maxClients) {
    return next(
      ApiError.forbidden(
        `You have reached the maximum number of clients (${limits.maxClients}) for your plan. Upgrade to add more.`,
        "PLAN_CLIENT_LIMIT_REACHED"
      )
    );
  }

  next();
});

export const checkProjectLimit = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const user = await User.findById(userId);
  if (!user) return next(ApiError.notFound("User not found", "USER_NOT_FOUND"));

  const limits = PLAN_LIMITS[user.plan];
  const projectCount = await Project.countDocuments({ userId });

  if (projectCount >= limits.maxProjects) {
    return next(
      ApiError.forbidden(
        `You have reached the maximum number of projects (${limits.maxProjects}) for your plan. Upgrade to add more.`,
        "PLAN_PROJECT_LIMIT_REACHED"
      )
    );
  }

  next();
});

export const checkAIGenerationLimit = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const user = await User.findById(userId);
  if (!user) return next(ApiError.notFound("User not found", "USER_NOT_FOUND"));

  const limits = PLAN_LIMITS[user.plan];

  if (user.aiGenerationsThisMonth >= limits.maxAIGenerationsPerMonth) {
    return next(
      ApiError.forbidden(
        `You have reached the maximum AI generations (${limits.maxAIGenerationsPerMonth}) for this month. Upgrade or wait for reset.`,
        "PLAN_AI_LIMIT_REACHED"
      )
    );
  }

  next();
});
