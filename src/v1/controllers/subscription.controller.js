import asyncWrapper from "../../middlewares/asyncWrapper.js";
import subscriptionService from "../services/subscription.service.js";
import ApiError from "../../utils/apiError.js";

/**
 * @desc    Controller to handle user subscription or plan upgrade/downgrade.
 * @route   POST /api/v1/subscriptions
 * @access  Private (Authenticated User)
 * @param   {object} req - Express request object.
 * @param   {object} res - Express response object.
 * @param   {function} next - Express next middleware function.
 */
export const subscribe = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const { planId, paymentMethodId } = req.body;
  if (!planId) {
    throw ApiError.badRequest("Plan ID is required.");
  }

  const result = await subscriptionService.subscribe(
    userId,
    planId,
    paymentMethodId
  );

  res.status(result.statusCode).json(result);
});

/**
 * @desc    Controller to handle user subscription cancellation.
 * @route   POST /api/v1/subscriptions/cancel
 * @access  Private (Authenticated User)
 * @param   {object} req - Express request object.
 * @param   {object} res - Express response object.
 * @param   {function} next - Express next middleware function.
 */
export const cancelSubscription = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const result = await subscriptionService.cancelSubscription(userId);
  res.status(result.statusCode).json(result);
});

/**
 * @desc    Controller to get the authenticated user's current subscription status and details.
 * @route   GET /api/v1/subscriptions
 * @access  Private (Authenticated User)
 * @param   {object} req - Express request object.
 * @param   {object} res - Express response object.
 * @param   {function} next - Express next middleware function.
 */
export const getSubscriptionStatus = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const result = await subscriptionService.getSubscriptionStatus(userId);
  res.status(result.statusCode).json(result);
});
