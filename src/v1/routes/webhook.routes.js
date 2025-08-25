import express from "express";
import subscriptionService from "../services/subscription.service.js";
import { verifyWebhookSignature } from "../../utils/flutterwave.config.js";

const router = express.Router();

router.post(
  "/",
  express.json({ type: "application/json" }),
  async (req, res) => {
    try {
      verifyWebhookSignature(req);
    } catch (err) {
      console.error("Flutterwave webhook verification failed:", err.message);
      return res.status(401).send(`Webhook Error: ${err.message}`);
    }

    try {
      await subscriptionService.handleFlutterwaveWebhook(req.body);
      res.json({ received: true });
    } catch (err) {
      console.error("Webhook processing failed:", err);
      res.status(500).json({ success: false, message: "Webhook processing failed" });
    }
  }
);

export default router;
