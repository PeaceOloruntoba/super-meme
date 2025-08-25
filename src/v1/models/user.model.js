// Updated user.model.js
// Added status, lastLogin, activeSessions, is2FAEnabled

import mongoose from "mongoose";

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    firstName: {
      type: String,
      required: [function () {
        return !this.provider; // Required only for email/password users
      }, "Please provide a firstName"],
    },
    lastName: {
      type: String,
      required: [function () {
        return !this.provider; // Required only for email/password users
      }, "Please provide a lastName"],
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      trim: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
        "Please provide a valid email",
      ],
      unique: [true, "User with this email already exists"],
    },
    password: {
      type: String,
      required: [function () {
        return !this.provider; // No password required for social accounts
      }, "Please provide a password"],
      select: false,
      minlength: [6, "Password must be at least 6 characters long"],
      maxlength: [1024, "Password must not exceed 1024 characters"],
    },
    provider: {
      type: String,
      enum: [null, "google", "facebook"],
      default: null,
    },
    providerId: {
      type: String,
      default: null,
      index: true,
    },
    address: {
      type: String,
    },
    bio: {
      type: String,
    },
    website: {
      type: String,
      match: [
        /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/,
        "Please provide a valid URL",
      ],
    },
    phone: {
      type: String,
    },
    businessName: {
      type: String,
    },
    businessType: {
      type: [String],
      enum: [
        "Independent Designer",
        "Fashion Studio",
        "Alterations Service",
        "Costume Design",
        "Bridal Boutique",
        "Fashion School",
        "Other",
      ],
      default: "Other",
    },
    roles: {
      type: [String],
      enum: ["user", "admin", "designer"],
      default: ["designer"],
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    sendNewsletter: {
      type: Boolean,
      default: false,
    },
    image: {
      type: String,
      default:
        "https://cdn.vectorstock.com/i/500p/45/59/profile-photo-placeholder-icon-design-in-gray-vector-37114559.jpg",
    },
    settings: {
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: false },
      projectDeadlines: { type: Boolean, default: false },
      clientMessages: { type: Boolean, default: false },
      paymentReminders: { type: Boolean, default: false },
      marketingEmails: { type: Boolean, default: false },
      theme: {
        type: String,
        default: "light",
        enum: ["light", "dark", "system"],
      },
      language: { type: String, default: "en" },
      timezone: { type: String, default: "Europe/Berlin" },
      currency: { type: String, default: "USD" },
      measurementUnit: {
        type: String,
        default: "inches",
        enum: ["inches", "cm"],
      },
      defaultProjectDuration: { type: String, default: "14" },
    },
    plan: {
      type: String,
      enum: ["free", "premium", "enterprise"],
      default: "free",
    },
    isSubActive: {
      type: Boolean,
      default: true,
    },
    trialEndDate: {
      type: Date,
      default: () => new Date(+new Date() + 14 * 24 * 60 * 60 * 1000),
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
    },
    revenueGoals: {
      monthly: {
        type: Number,
        default: 0,
      },
      yearly: {
        type: Number,
        default: 0,
      },
    },
    status: {
      type: String,
      enum: ["active", "deleted"],
      default: "active",
    },
    lastLogin: {
      type: Date,
    },
    activeSessions: [
      {
        device: String,
        location: String,
        lastActive: Date,
        current: Boolean,
      },
    ],
    is2FAEnabled: {
      type: Boolean,
      default: false,
    },
    aiGenerationsThisMonth: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", UserSchema);
