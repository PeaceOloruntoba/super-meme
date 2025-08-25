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
      enum: ["pending", "trialing", "active", "canceled", "overdue"],
      default: "pending",
    },
    // Flutterwave specific fields
    flwSubscriptionId: String, // Flutterwave subscription id
    flwTxRef: String, // transaction reference used during init
    startDate: {
      type: Date,
      required: false,
    },
    dueDate: {
      type: Date,
      required: false,
    },
    paymentMethod: String,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Subscription", SubscriptionSchema);
