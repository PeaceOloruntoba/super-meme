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
    type: {
      type: String,
      required: [true, "Pattern type is required."],
    },
    difficulty: {
      type: String,
      required: [true, "Difficulty is required."],
    },
    instructions: {
      type: Schema.Types.Mixed,
      default: [],
    },
    materials: {
      type: Schema.Types.Mixed,
      default: [],
    },
    image_url: String,
    isAiGenerated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Pattern", PatternSchema);
