import mongoose from "mongoose";

const { Schema } = mongoose;

const ProjectSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Project name is required."],
    },
    description: String,
    type: {
      type: String,
      required: [true, "Project type is required."],
    },
    status: {
      type: String,
      enum: ["planning", "in-progress", "review", "completed"],
      default: "planning",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    dueDate: Date,
    budget: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Project", ProjectSchema);
