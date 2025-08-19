import mongoose from "mongoose";

const { Schema } = mongoose;

const SubscriptionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    planId: {
      type: String,
      enum: ["premium", "enterprise"],
      required: true,
    },
    status: {
      type: String,
      enum: ["trialing", "active", "canceled", "overdue"],
      default: "trialing",
    },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    startDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    paymentMethod: String,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Subscription", SubscriptionSchema);
