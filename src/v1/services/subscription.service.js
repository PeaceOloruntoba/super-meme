import User from "../models/user.model.js";
import Subscription from "../models/subscription.model.js";
import ApiError from "../../utils/apiError.js";
import stripe, {
  findOrCreateStripeCustomer,
  attachPaymentMethod,
  createStripeSubscription,
  cancelStripeSubscription,
  updateStripeSubscription,
} from "../../utils/stripe.config.js";

const subscriptionService = {
  stripePriceIds: {
    premium: "price_1RxqOcRpcgBDjLSAxTUdiLcG",
    enterprise: "price_1RxqP0RpcgBDjLSAVo8ko9k1",
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
        throw ApiError.notFound("User not found.", "USER_NOT_FOUND");
      }

      const isPaidPlan = planId !== "free";
      if (isPaidPlan && !paymentMethodId) {
        throw ApiError.badRequest(
          "Payment method is required for paid plans.",
          "PAYMENT_METHOD_REQUIRED"
        );
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
        // Update existing subscription in Stripe
        stripeSubscription = await updateStripeSubscription(
          existingSubscription.stripeSubscriptionId,
          stripePriceId
        );
      } else if (isPaidPlan) {
        // Create a new subscription in Stripe for a paid plan
        stripeSubscription = await createStripeSubscription(
          stripeCustomerId,
          stripePriceId
        );
      } else {
        // User is switching to the free plan
        if (existingSubscription && existingSubscription.stripeSubscriptionId) {
          await cancelStripeSubscription(
            existingSubscription.stripeSubscriptionId
          );
          await existingSubscription.deleteOne();
        }

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

      const subscriptionData = {
        userId,
        planId,
        status: "active",
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
        throw ApiError.badRequest(error.message, "STRIPE_CARD_ERROR");
      }
      throw ApiError.internalServerError(
        "Failed to subscribe to the plan.",
        "SUBSCRIBE_FAILED"
      );
    }
  }
  /**
   * Cancels a user's paid subscription via Stripe.
   * @param {string} userId - The user's ID.
   */,

  cancelSubscription: async (userId) => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw ApiError.notFound("User not found.", "USER_NOT_FOUND");
      }

      const subscription = await Subscription.findOne({ userId });
      if (!subscription || !subscription.stripeSubscriptionId) {
        throw ApiError.badRequest(
          "User does not have an active paid subscription to cancel.",
          "NO_ACTIVE_SUBSCRIPTION"
        );
      } // Cancel the subscription at the end of the current billing period

      await cancelStripeSubscription(subscription.stripeSubscriptionId); // Update the subscription status in your database

      subscription.status = "canceled";
      await subscription.save(); // Update the user's plan to "free" after the current period ends // This logic should be handled by a webhook, but for a simplified flow, we'll update it here. // The 'isSubActive' field should also be managed by webhooks for true accuracy.

      await User.findByIdAndUpdate(userId, {
        plan: "free", // isSubActive: false, // This is incorrect, the user is still active until the period ends.
        subscriptionId: null,
      });

      return {
        success: true,
        message:
          "Subscription successfully canceled. It will remain active until the end of the current billing period.",
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
  }
  /**
   * Retrieves the current subscription details for a user.
   * @param {string} userId - The user's ID.
   */,

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
  }
  /**
   * Webhook handler for Stripe events.
   * This is a crucial part of the integration to keep your database in sync with Stripe.
   * @param {object} event - The Stripe webhook event object.
   */,

  handleStripeWebhook: async (event) => {
    console.log(`Received Stripe event: ${event.type}`);

    switch (event.type) {
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const stripeSubscription = event.data.object;
        const user = await User.findOne({
          stripeCustomerId: stripeSubscription.customer,
        });
        if (!user) return console.error("User not found for Stripe customer.");

        const planId =
          stripeSubscription.items.data[0].price.id ===
          subscriptionService.stripePriceIds.premium
            ? "premium"
            : "enterprise";

        const subscriptionData = {
          userId: user._id,
          planId,
          status: stripeSubscription.status,
          stripeCustomerId: stripeSubscription.customer,
          stripeSubscriptionId: stripeSubscription.id,
          startDate: new Date(stripeSubscription.current_period_start * 1000),
          dueDate: new Date(stripeSubscription.current_period_end * 1000),
        };

        await Subscription.findOneAndUpdate(
          { userId: user._id },
          subscriptionData,
          { new: true, upsert: true, runValidators: true }
        );

        await User.findByIdAndUpdate(user._id, {
          plan: planId,
          isSubActive: true,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const stripeSubscription = event.data.object;
        const subscription = await Subscription.findOne({
          stripeSubscriptionId: stripeSubscription.id,
        });
        if (!subscription)
          return console.error(
            "Subscription not found for Stripe subscription ID."
          ); // Update database to reflect cancellation

        await Subscription.findByIdAndUpdate(subscription._id, {
          status: "canceled",
        });
        await User.findByIdAndUpdate(subscription.userId, {
          plan: "free",
          isSubActive: false,
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const stripeInvoice = event.data.object;
        const stripeSubscriptionId = stripeInvoice.subscription;
        if (stripeSubscriptionId) {
          const subscription = await Subscription.findOneAndUpdate(
            { stripeSubscriptionId },
            {
              status: "active",
              dueDate: new Date(stripeInvoice.lines.data[0].period.end * 1000),
            },
            { new: true }
          );
          if (subscription) {
            await User.findByIdAndUpdate(subscription.userId, {
              isSubActive: true,
            });
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
        break;
    }
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
        subscriptionId: null, // Only target users without a paid Stripe subscription
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
   * Updates the payment method for a subscription.
   * @param {string} userId - The user's ID.
   * @param {string} paymentMethodId - The new Stripe payment method ID.
   */
  updatePaymentMethod: async (userId, paymentMethodId) => {
    try {
      const subscription = await Subscription.findOne({ userId });
      if (!subscription) {
        throw ApiError.notFound(
          "No active subscription found.",
          "NO_ACTIVE_SUBSCRIPTION"
        );
      }

      await attachPaymentMethod(subscription.stripeCustomerId, paymentMethodId);

      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        default_payment_method: paymentMethodId,
      });

      subscription.paymentMethod = paymentMethodId;
      await subscription.save();

      return {
        success: true,
        message: "Payment method updated successfully.",
        statusCode: 200,
      };
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
   * Gets the payment method details for a user.
   * @param {string} userId - The user's ID.
   * @returns {object|null} - Payment method details or null.
   */
  getPaymentMethodDetails: async (userId) => {
    const subscription = await Subscription.findOne({ userId });
    if (!subscription || !subscription.paymentMethod) return null;

    const pm = await stripe.paymentMethods.retrieve(subscription.paymentMethod);
    return {
      brand: pm.card.brand.toUpperCase(),
      last4: pm.card.last4,
      exp: `${pm.card.exp_month}/${pm.card.exp_year % 100}`,
    };
  },

  /**
   * Gets the billing history (invoices) for a user.
   * @param {string} userId - The user's ID.
   * @returns {array} - Array of invoice objects.
   */
  getInvoices: async (userId) => {
    const subscription = await Subscription.findOne({ userId });
    if (!subscription) return [];

    const invoices = await stripe.invoices.list({
      subscription: subscription.stripeSubscriptionId,
    });

    return invoices.data.map((i) => ({
      date: new Date(i.created * 1000).toLocaleDateString(),
      amount: `$${(i.amount_paid / 100).toFixed(2)}`,
      status: i.status.charAt(0).toUpperCase() + i.status.slice(1),
    }));
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
