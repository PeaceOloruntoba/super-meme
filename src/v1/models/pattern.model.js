import mongoose from "mongoose";

const { Schema } = mongoose;

const PatternSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Pattern name is required."],
    },
    description: String,
    garmentType: {
      type: String,
      enum: ["Dress", "Blouse", "Skirt", "Jacket", "Pants", "Other"],
      required: [true, "Garment type is required."],
    },
    style: {
      type: String,
      enum: [
        "Casual",
        "Formal",
        "Vintage",
        "Modern",
        "Sportswear",
        "Boho",
        "Other",
      ],
      required: [true, "Style is required."],
    },
    sizeRange: {
      type: String,
      enum: ["XS-S", "M-L", "XL-XXL", "All sizes", "Custom"],
      required: [true, "Size range is required."],
    },
    fabricType: {
      type: String,
      enum: [
        "Cotton",
        "Silk",
        "Wool",
        "Linen",
        "Denim",
        "Satin",
        "Leather",
        "Knit",
        "Other",
      ],
      required: [true, "Fabric type is required."],
    },
    occasion: String,
    additionalDetails: String,
    image_urls: {
      type: [String],
      default: [],
    },
    isAiGenerated: {
      type: Boolean,
      default: false,
    },
    difficulty: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
    },
    instructions: {
      type: Schema.Types.Mixed,
      default: [],
    },
    materials: {
      type: Schema.Types.Mixed,
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Pattern", PatternSchema);
