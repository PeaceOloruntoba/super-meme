import mongoose from "mongoose";

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    firstName: {
      type: String,
      required: [true, "Please provide a firstName"],
    },
    lastName: {
      type: String,
      required: [true, "Please provide a lastName"],
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
      required: [true, "Please provide a password"],
      select: false,
    },
    address: {
      type: String,
      select: false,
    },
    bio: {
      type: String,
      select: false,
    },
    website: {
      type: String,
      select: false,
    },
    businessName: {
      type: String,
    },
    businessType: {
      type: String,
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
        "https://res.cloudinary.com/demmgc49v/image/upload/v1695969739/default-avatar_scnpps.jpg",
    },
    // NEW: User settings object
    settings: {
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: false },
      projectDeadlines: { type: Boolean, default: false },
      clientMessages: { type: Boolean, default: false },
      paymentReminders: { type: Boolean, default: false },
      marketingEmails: { type: Boolean, default: false },
      theme: { type: String, default: "light", enum: ["light", "dark"] },
      language: { type: String, default: "en" },
      timezone: { type: String, default: "America/New_York" },
      currency: { type: String, default: "USD" },
      measurementUnit: {
        type: String,
        default: "inches",
        enum: ["inches", "cm"],
      },
      defaultProjectDuration: { type: String, default: "14" },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", UserSchema);
