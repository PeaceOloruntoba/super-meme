import Flutterwave from "flutterwave-node-v3";
import dotenv from "dotenv";
import ApiError from "./apiError.js";

dotenv.config();

if (!process.env.FLW_PUBLIC_KEY || !process.env.FLW_SECRET_KEY) {
  console.warn("[Flutterwave] FLW_PUBLIC_KEY/FLW_SECRET_KEY not set. Add them to your .env");
}

export const flw = new Flutterwave(
  process.env.FLW_PUBLIC_KEY || "",
  process.env.FLW_SECRET_KEY || ""
);

// Map your internal plans -> Flutterwave Payment Plan IDs (configure in .env)
export const flutterwavePlanIds = {
  premium: process.env.FLW_PLAN_PREMIUM_ID || "",
  enterprise: process.env.FLW_PLAN_ENTERPRISE_ID || "",
};

export const createTxRef = (prefix = "SM") =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const verifyWebhookSignature = (req) => {
  // Flutterwave sends a hash in 'verif-hash' header equal to FLW_WEBHOOK_SECRET (v3)
  const signature = req.headers["verif-hash"]; // lowercased by Node
  const secret = process.env.FLW_WEBHOOK_SECRET;
  if (!secret) {
    throw ApiError.internalServerError(
      "Webhook secret not configured.",
      "FLW_WEBHOOK_SECRET_MISSING"
    );
  }
  if (!signature || signature !== secret) {
    throw ApiError.unauthorized("Invalid webhook signature.", "FLW_WEBHOOK_INVALID_SIG");
  }
};

/**
 * Initialize a hosted payment for a subscription (uses Payment Plan on Flutterwave)
 * Returns a link the client should be redirected to.
 */
export const initializeSubscriptionPayment = async ({
  amount,
  currency = "USD",
  customer,
  planKey, // "premium" | "enterprise"
  redirect_url, // optional, but recommended
  meta = {},
}) => {
  try {
    const payment_plan = flutterwavePlanIds[planKey];
    if (!payment_plan) {
      throw ApiError.badRequest("Invalid or missing Flutterwave payment plan.", "FLW_PLAN_MISSING");
    }

    const tx_ref = createTxRef();

    const payload = {
      tx_ref,
      amount,
      currency,
      payment_plan,
      customer, // { email, name }
      redirect_url,
      meta,
    };

    const response = await flw.Transaction.initialize(payload);
    if (response.status !== "success") {
      throw ApiError.internalServerError(
        "Failed to initialize Flutterwave payment.",
        "FLW_INIT_FAILED",
        response
      );
    }

    return { tx_ref, link: response.data.link };
  } catch (error) {
    console.error("Flutterwave init payment failed:", error);
    if (error instanceof ApiError) throw error;
    throw ApiError.internalServerError(
      "Failed to initialize payment.",
      "FLW_INIT_ERROR"
    );
  }
};

export const verifyTransaction = async (tx_ref) => {
  try {
    const res = await flw.Transaction.verify({ id: tx_ref, tx_ref });
    return res;
  } catch (error) {
    console.error("Flutterwave transaction verify failed:", error);
    throw ApiError.internalServerError(
      "Failed to verify transaction.",
      "FLW_VERIFY_FAILED"
    );
  }
};

export const cancelFlutterwaveSubscription = async (subscription_id) => {
  try {
    const res = await flw.Subscription.cancel({ id: subscription_id });
    return res;
  } catch (error) {
    console.error("Flutterwave subscription cancel failed:", error);
    throw ApiError.internalServerError(
      "Failed to cancel subscription on Flutterwave.",
      "FLW_CANCEL_FAILED"
    );
  }
};
