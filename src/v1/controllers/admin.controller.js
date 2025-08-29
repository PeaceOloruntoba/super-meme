import asyncWrapper from "../../middlewares/asyncWrapper.js";
import adminService from "../services/admin.service.js";

// Users
export const getUsers = asyncWrapper(async (req, res) => {
  const { page, limit, search, plan, status } = req.query;
  const result = await adminService.getUsers({ page, limit, search, plan, status });
  res.status(200).json(result);
});

export const getUserById = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const result = await adminService.getUserById(id);
  res.status(200).json(result);
});

// Subscriptions
export const listSubscriptions = asyncWrapper(async (req, res) => {
  const { page, limit, status, planId } = req.query;
  const result = await adminService.listSubscriptions({ page, limit, status, planId });
  res.status(200).json(result);
});

export const changeUserPlan = asyncWrapper(async (req, res) => {
  const { id } = req.params; // userId
  const { planId } = req.body;
  const result = await adminService.changeUserPlan({ userId: id, planId });
  res.status(200).json(result);
});

export const cancelUserSubscription = asyncWrapper(async (req, res) => {
  const { id } = req.params; // userId
  const result = await adminService.cancelUserSubscription({ userId: id });
  res.status(200).json(result);
});

// Patterns
export const listPatterns = asyncWrapper(async (req, res) => {
  const { page, limit, search } = req.query;
  const result = await adminService.listPatterns({ page, limit, search });
  res.status(200).json(result);
});

export const deletePattern = asyncWrapper(async (req, res) => {
  const { id } = req.params; // patternId
  const result = await adminService.deletePattern({ patternId: id });
  res.status(200).json(result);
});

// Platform analytics
export const getUserAnalytics = asyncWrapper(async (req, res) => {
  const { period } = req.query; // daily|weekly|monthly|yearly
  const result = await adminService.getUserAnalytics({ period });
  res.status(200).json(result);
});
