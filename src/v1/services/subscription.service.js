import User from "../models/user.model.js";
import Subscription from "../models/subscription.model.js";
import ApiError from "../../utils/apiError.js";
import {
  findOrCreateStripeCustomer,
  attachPaymentMethod,
  createStripeSubscription,
  cancelStripeSubscription,
  updateStripeSubscription,
} from "../../utils/stripe.config.js";

const subscriptionService = {
  stripePriceIds: {
    premium: "price_1PXXXPXXXPXXXPXXX",
    enterprise: "price_1QXXXQXXXQXXXQXXX",
  },

  /**
   * Subscribes a user to a new plan using Stripe.
   * This function handles both upgrading and initial subscription.
   * @param {string} userId - The user's ID.
   * @param {string} planId - The ID of the plan to subscribe to.
   * @param {string} [paymentMethodId] - The Stripe payment method for paid plans.
   */
  subscribe: async (userId, planId, paymentMethodId = null) => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw ApiError.notFound("User not found.");
      }

      const isPaidPlan = planId !== "free";
      if (isPaidPlan && !paymentMethodId) {
        throw ApiError.badRequest("Payment method is required for paid plans.");
      }

      const stripeCustomerId = await findOrCreateStripeCustomer(
        user.email,
        `${user.firstName} ${user.lastName}`
      );

      if (isPaidPlan) {
        await attachPaymentMethod(stripeCustomerId, paymentMethodId);
      }

      let stripeSubscription;
      const stripePriceId = subscriptionService.stripePriceIds[planId];
      const existingSubscription = await Subscription.findOne({ userId });

      if (existingSubscription && existingSubscription.stripeSubscriptionId) {
        stripeSubscription = await updateStripeSubscription(
          existingSubscription.stripeSubscriptionId,
          stripePriceId
        );
      } else if (isPaidPlan) {
        stripeSubscription = await createStripeSubscription(
          stripeCustomerId,
          stripePriceId
        );
      } else {
        if (existingSubscription && existingSubscription.stripeSubscriptionId) {
          await cancelStripeSubscription(
            existingSubscription.stripeSubscriptionId
          );
        }

        await User.findByIdAndUpdate(userId, {
          plan: "free",
          isSubActive: true,
          subscriptionId: null,
        });

        if (existingSubscription) {
          await existingSubscription.deleteOne();
        }
        return {
          success: true,
          message: "Successfully switched to the Free plan.",
          statusCode: 200,
        };
      }

      const subscriptionData = {
        userId,
        planId,
        status: stripeSubscription.status,
        stripeCustomerId: stripeCustomerId,
        stripeSubscriptionId: stripeSubscription.id,
        startDate: new Date(stripeSubscription.current_period_start * 1000),
        dueDate: new Date(stripeSubscription.current_period_end * 1000),
        paymentMethod: paymentMethodId,
      };

      const newSubscription = await Subscription.findOneAndUpdate(
        { userId },
        subscriptionData,
        { new: true, upsert: true, runValidators: true }
      );

      await User.findByIdAndUpdate(userId, {
        plan: planId,
        isSubActive: true,
        subscriptionId: newSubscription._id,
      });

      return {
        success: true,
        message: `Successfully subscribed to the ${planId} plan.`,
        statusCode: 200,
        data: { subscription: newSubscription },
      };
    } catch (error) {
      console.error("Subscription failed:", error);
      if (error instanceof ApiError) {
        throw error;
      }

      if (error.type === "StripeCardError") {
        throw ApiError.badRequest(error.message);
      }
      throw ApiError.internalServerError("Failed to subscribe to the plan.");
    }
  },

  /**
   * Cancels a user's paid subscription via Stripe.
   * @param {string} userId - The user's ID.
   */
  cancelSubscription: async (userId) => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw ApiError.notFound("User not found.");
      }

      const subscription = await Subscription.findOne({ userId });
      if (!subscription || !subscription.stripeSubscriptionId) {
        throw ApiError.badRequest(
          "User does not have an active paid subscription to cancel."
        );
      }

      await cancelStripeSubscription(subscription.stripeSubscriptionId);

      subscription.status = "cancelled";
      await subscription.save();

      await User.findByIdAndUpdate(userId, {
        plan: "free",
        isSubActive: true,
        subscriptionId: null,
      });

      return {
        success: true,
        message:
          "Subscription successfully cancelled. You have been moved to the Free plan.",
        statusCode: 200,
      };
    } catch (error) {
      console.error("Subscription cancellation failed:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internalServerError("Failed to cancel subscription.");
    }
  },

  /**
   * Webhook handler for Stripe events.
   * This is a crucial part of the integration to keep your database in sync with Stripe.
   * @param {object} event - The Stripe webhook event object.
   */
  handleStripeWebhook: async (event) => {
    console.log(`Received Stripe event: ${event.type}`);

    if (event.type === "invoice.payment_succeeded") {
      const stripeSubscription = event.data.object.subscription;
      const subscription = await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: stripeSubscription },
        {
          status: "active",
          dueDate: new Date(event.data.object.lines.data[0].period.end * 1000),
        },
        { new: true }
      );
      if (subscription) {
        await User.findByIdAndUpdate(subscription.userId, {
          isSubActive: true,
        });
      }
    }
  },

  checkAndDeactivateExpiredSubscriptions: async () => {
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
};

export default subscriptionService;
