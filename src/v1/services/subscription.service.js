import User from "../models/user.model.js";
import Subscription from "../models/subscription.model.js";
import ApiError from "../../utils/apiError.js";
import {
  initializeSubscriptionPayment,
  cancelFlutterwaveSubscription,
  verifyTransaction,
} from "../../utils/flutterwave.config.js";

const subscriptionService = {
  planConfigs: {
    premium: {
      amount: Number(process.env.FLW_AMOUNT_PREMIUM || 1000),
      intervalDays: Number(process.env.FLW_INTERVAL_DAYS_PREMIUM || 30),
    },
    enterprise: {
      amount: Number(process.env.FLW_AMOUNT_ENTERPRISE || 3000),
      intervalDays: Number(process.env.FLW_INTERVAL_DAYS_ENTERPRISE || 30),
    },
  },
  /**
   * Subscribes a user to a new plan using Flutterwave.
   * For paid plans, returns a hosted payment link the client should open to complete payment.
   * @param {string} userId - The user's ID.
   * @param {string} planId - The ID of the plan to subscribe to.
   * @param {string} [paymentMethodId] - Ignored for Flutterwave hosted payment.
   */

  subscribe: async (userId, planId, paymentMethodId = null) => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw ApiError.notFound("User not found.", "USER_NOT_FOUND");
      }

      const isPaidPlan = planId !== "free";
      const existingSubscription = await Subscription.findOne({ userId });

      if (!isPaidPlan) {
        // User is switching to the free plan
        if (existingSubscription) await existingSubscription.deleteOne();

        await User.findByIdAndUpdate(userId, {
          plan: "free",
          isSubActive: true,
          subscriptionId: null,
        });

        return {
          success: true,
          message: "Successfully switched to the Free plan.",
          statusCode: 200,
        };
      }

      const cfg = subscriptionService.planConfigs[planId];
      if (!cfg) {
        throw ApiError.badRequest("Invalid planId.", "INVALID_PLAN");
      }

      const { tx_ref, link } = await initializeSubscriptionPayment({
        amount: cfg.amount,
        currency: process.env.FLW_CURRENCY || "USD",
        customer: {
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim(),
        },
        planKey: planId,
        redirect_url: process.env.FLW_REDIRECT_URL || undefined,
        meta: { userId: user._id.toString(), planId },
      });

      const pending = await Subscription.findOneAndUpdate(
        { userId },
        {
          userId,
          planId,
          status: "pending",
          flwTxRef: tx_ref,
        },
        { new: true, upsert: true, runValidators: true }
      );

      await User.findByIdAndUpdate(userId, {
        plan: planId,
        isSubActive: false,
        subscriptionId: pending._id,
      });

      return {
        success: true,
        message: `Proceed to payment for the ${planId} plan.`,
        statusCode: 200,
        data: { paymentLink: link, tx_ref },
      };
    } catch (error) {
      console.error("Subscription failed:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internalServerError(
        "Failed to subscribe to the plan.",
        "SUBSCRIBE_FAILED"
      );
    }
  },
  /**
   * Cancels a user's paid subscription via Flutterwave.
   * @param {string} userId - The user's ID.
   */
  cancelSubscription: async (userId) => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw ApiError.notFound("User not found.", "USER_NOT_FOUND");
      }

      const subscription = await Subscription.findOne({ userId });
      if (!subscription) {
        throw ApiError.badRequest(
          "User does not have an active paid subscription to cancel.",
          "NO_ACTIVE_SUBSCRIPTION"
        );
      }

      if (subscription.flwSubscriptionId) {
        await cancelFlutterwaveSubscription(subscription.flwSubscriptionId);
      }

      subscription.status = "canceled";
      await subscription.save();

      await User.findByIdAndUpdate(userId, {
        plan: "free",
        subscriptionId: null,
      });

      return {
        success: true,
        message:
          "Subscription successfully canceled.",
        statusCode: 200,
      };
    } catch (error) {
      console.error("Subscription cancellation failed:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internalServerError(
        "Failed to cancel subscription.",
        "CANCEL_SUBSCRIPTION_FAILED"
      );
    }
  },
  /**
   * Retrieves the current subscription details for a user.
   * @param {string} userId - The user's ID.
   */

  getSubscriptionStatus: async (userId) => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw ApiError.notFound("User not found.", "USER_NOT_FOUND");
      }

      const subscription = await Subscription.findOne({ userId }); // If no paid subscription is found, they are on the free plan.

      if (!subscription) {
        return {
          success: true,
          statusCode: 200,
          data: {
            planId: "free",
            status: "active",
            startDate: null,
            dueDate: null,
          },
        };
      }

      return {
        success: true,
        statusCode: 200,
        data: {
          planId: subscription.planId,
          status: subscription.status,
          startDate: subscription.startDate,
          dueDate: subscription.dueDate,
        },
      };
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internalServerError(
        "Failed to retrieve subscription status.",
        "SUBSCRIPTION_STATUS_FAILED"
      );
    }
  },
  /**
   * Webhook handler for Flutterwave events.
   * @param {object} payload - The Flutterwave webhook payload.
   */

  handleFlutterwaveWebhook: async (payload) => {
    const event = payload?.event;
    console.log(`Received Flutterwave event: ${event}`);

    if (event === "charge.completed") {
      const data = payload.data || {};
      if (data.status === "successful") {
        const tx_ref = data.tx_ref;
        const meta = data.meta || {};
        const userId = meta.userId;
        const planId = meta.planId;
        if (!userId || !planId) return;

        const cfg = subscriptionService.planConfigs[planId];
        if (!cfg) return;

        const startDate = new Date();
        const dueDate = new Date(startDate.getTime() + cfg.intervalDays * 24 * 60 * 60 * 1000);

        const updated = await Subscription.findOneAndUpdate(
          { userId },
          {
            planId,
            status: "active",
            flwTxRef: tx_ref,
            startDate,
            dueDate,
          },
          { new: true, upsert: true, runValidators: true }
        );

        await User.findByIdAndUpdate(userId, {
          plan: planId,
          isSubActive: true,
          subscriptionId: updated._id,
        });
      }
      return;
    }

    if (event === "subscription.cancelled") {
      const subId = payload?.data?.id;
      if (!subId) return;
      const subscription = await Subscription.findOneAndUpdate(
        { flwSubscriptionId: subId },
        { status: "canceled" },
        { new: true }
      );
      if (subscription) {
        await User.findByIdAndUpdate(subscription.userId, {
          plan: "free",
          isSubActive: false,
        });
      }
      return;
    }

    console.log(`Unhandled Flutterwave event ${event}`);
  },

  checkAndDeactivateExpiredSubscriptions: async () => {
    // Existing logic is fine, but it's important to rely on webhooks for paid subscriptions.
    // This function is better suited for handling trials or non-Stripe managed subscriptions.
    // For the purposes of this response, I've left it as is.
    try {
      const now = new Date();
      const usersToDeactivate = await User.find({
        plan: { $ne: "free" },
        trialEndDate: { $lt: now },
        isSubActive: true,
        subscriptionId: null,
      });

      if (usersToDeactivate.length > 0) {
        for (const user of usersToDeactivate) {
          console.log(
            `Trial expired for user ${user._id}. Deactivating subscription.`
          );
          await User.findByIdAndUpdate(user._id, {
            plan: "free",
            isSubActive: false,
          });
        }
        console.log(`Deactivated ${usersToDeactivate.length} expired trials.`);
      }

      return { success: true, message: "Subscription check completed." };
    } catch (error) {
      console.error("Error running subscription cron job:", error);
    }
  },

  /**
   * Updates the payment method for a subscription (unsupported for Flutterwave in this setup).
   * @param {string} userId - The user's ID.
   * @param {string} paymentMethodId - ignored
   */
  updatePaymentMethod: async (userId, paymentMethodId) => {
    try {
      throw ApiError.badRequest(
        "Updating payment method is not supported via API for Flutterwave in this setup.",
        "FLW_PM_UPDATE_UNSUPPORTED"
      );
    } catch (error) {
      console.error("Payment method update failed:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internalServerError(
        "Failed to update payment method.",
        "UPDATE_PAYMENT_METHOD_FAILED"
      );
    }
  },

  /**
   * Gets the payment method details for a user (unsupported; returns null).
   * @param {string} userId - The user's ID.
   * @returns {object|null}
   */
  getPaymentMethodDetails: async (userId) => {
    return null;
  },

  /**
   * Gets the billing history (invoices) for a user (unsupported; returns empty list).
   */
  getInvoices: async (userId) => {
    return [];
  },

  /**
   * Verifies Flutterwave redirect using transaction_id or tx_ref and activates subscription.
   * Expects a pending Subscription with matching flwTxRef created during subscribe().
   */
  verifyAndActivateFromCallback: async ({ status, tx_ref, transaction_id }) => {
    try {
      const verifyKey = transaction_id || tx_ref;
      if (!verifyKey) {
        throw ApiError.badRequest(
          "transaction_id or tx_ref is required.",
          "VERIFY_MISSING_KEY"
        );
      }

      const verification = await verifyTransaction(verifyKey);
      const verifiedStatus = verification?.data?.status || verification?.status;
      const verifiedTxRef = verification?.data?.tx_ref || tx_ref;

      if (verifiedStatus !== "successful") {
        return {
          success: false,
          statusCode: 400,
          message: "Payment not successful yet. Please wait or retry.",
          data: { status: verifiedStatus, tx_ref: verifiedTxRef },
        };
      }

      // Try to locate the pending subscription by tx_ref first
      let subscription = await Subscription.findOne({ flwTxRef: verifiedTxRef });
      let planId;
      let userId;

      if (!subscription) {
        const meta = verification?.data?.meta || {};
        userId = meta.userId;
        planId = meta.planId;
        if (!userId || !planId) {
          throw ApiError.notFound(
            "Pending subscription or verification meta not found.",
            "SUB_PENDING_NOT_FOUND"
          );
        }
      } else {
        userId = subscription.userId;
        planId = subscription.planId;
      }

      const cfg = subscriptionService.planConfigs[planId];
      if (!cfg) {
        throw ApiError.badRequest("Invalid plan.", "VERIFY_INVALID_PLAN");
      }

      const startDate = new Date();
      const dueDate = new Date(startDate.getTime() + cfg.intervalDays * 24 * 60 * 60 * 1000);

      const updated = await Subscription.findOneAndUpdate(
        { userId },
        {
          userId,
          planId,
          status: "active",
          flwTxRef: verifiedTxRef,
          startDate,
          dueDate,
        },
        { new: true, upsert: true, runValidators: true }
      );

      await User.findByIdAndUpdate(userId, {
        plan: planId,
        isSubActive: true,
        subscriptionId: updated._id,
      });

      return {
        success: true,
        statusCode: 200,
        message: "Subscription activated.",
        data: { planId, startDate: updated.startDate, dueDate: updated.dueDate },
      };
    } catch (error) {
      console.error("Verify & activate from callback failed:", error);
      if (error instanceof ApiError) throw error;
      throw ApiError.internalServerError(
        "Failed to verify and activate subscription.",
        "VERIFY_ACTIVATE_FAILED"
      );
    }
  },

  /**
   * Retrieves detailed subscription information for a user.
   * @param {string} userId - The user's ID.
   */
  getSubscriptionDetails: async (userId) => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw ApiError.notFound("User not found.", "USER_NOT_FOUND");
      }

      const subscription = await Subscription.findOne({ userId });

      const data = {
        planId: user.plan,
        status: subscription ? subscription.status : "active",
        startDate: subscription ? subscription.startDate : null,
        dueDate: subscription ? subscription.dueDate : null,
        paymentMethod: await subscriptionService.getPaymentMethodDetails(
          userId
        ),
        invoices: await subscriptionService.getInvoices(userId),
      };

      return {
        success: true,
        statusCode: 200,
        data,
      };
    } catch (error) {
      console.error("Error fetching subscription details:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internalServerError(
        "Failed to retrieve subscription details.",
        "SUBSCRIPTION_DETAILS_FAILED"
      );
    }
  },
};

export default subscriptionService;
