import Stripe from "stripe";
import dotenv from "dotenv";
import ApiError from "./apiError.js";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-04-10",
});

/**
 * Creates a new Stripe customer or retrieves an existing one.
 * @param {string} email - The user's email address.
 * @param {string} name - The user's name.
 * @param {string} [stripeCustomerId] - An optional existing Stripe customer ID.
 * @returns {Promise<string>} The Stripe customer ID.
 */
export const findOrCreateStripeCustomer = async (
  email,
  name,
  stripeCustomerId = null
) => {
  try {
    if (stripeCustomerId) {
      const customer = await stripe.customers.retrieve(stripeCustomerId);
      if (customer) {
        return customer.id;
      }
    }
    const customer = await stripe.customers.create({
      email,
      name,
    });
    return customer.id;
  } catch (error) {
    console.error("Stripe customer creation/retrieval failed:", error);
    throw ApiError.internalServerError("Failed to manage Stripe customer.");
  }
};

/**
 * Attaches a payment method to a Stripe customer.
 * @param {string} stripeCustomerId - The Stripe customer ID.
 * @param {string} paymentMethodId - The Stripe payment method ID.
 * @returns {Promise<void>}
 */
export const attachPaymentMethod = async (
  stripeCustomerId,
  paymentMethodId
) => {
  try {
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: stripeCustomerId,
    });

    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  } catch (error) {
    console.error("Stripe payment method attachment failed:", error);
    throw ApiError.internalServerError("Failed to attach payment method.");
  }
};

/**
 * Creates a new subscription in Stripe.
 * @param {string} stripeCustomerId - The Stripe customer ID.
 * @param {string} priceId - The Stripe price ID for the plan.
 * @param {string} [paymentMethodId] - The payment method ID for the first payment.
 * @returns {Promise<object>} The new Stripe subscription object.
 */
export const createStripeSubscription = async (stripeCustomerId, priceId) => {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
    });
    return subscription;
  } catch (error) {
    console.error("Stripe subscription creation failed:", error);
    throw ApiError.internalServerError("Failed to create Stripe subscription.");
  }
};

/**
 * Cancels a Stripe subscription.
 * @param {string} stripeSubscriptionId - The Stripe subscription ID.
 * @returns {Promise<object>} The canceled Stripe subscription object.
 */
export const cancelStripeSubscription = async (stripeSubscriptionId) => {
  try {
    const deletedSubscription = await stripe.subscriptions.del(
      stripeSubscriptionId
    );
    return deletedSubscription;
  } catch (error) {
    console.error("Stripe subscription cancellation failed:", error);
    throw ApiError.internalServerError("Failed to cancel Stripe subscription.");
  }
};

/**
 * Updates a Stripe subscription to a new plan.
 * @param {string} stripeSubscriptionId - The Stripe subscription ID.
 * @param {string} newPriceId - The new Stripe price ID.
 * @returns {Promise<object>} The updated Stripe subscription object.
 */
export const updateStripeSubscription = async (
  stripeSubscriptionId,
  newPriceId
) => {
  try {
    const subscription = await stripe.subscriptions.retrieve(
      stripeSubscriptionId
    );
    const updatedSubscription = await stripe.subscriptions.update(
      stripeSubscriptionId,
      {
        items: [{ id: subscription.items.data[0].id, price: newPriceId }],
      }
    );
    return updatedSubscription;
  } catch (error) {
    console.error("Stripe subscription update failed:", error);
    throw ApiError.internalServerError("Failed to update Stripe subscription.");
  }
};

export default stripe;
