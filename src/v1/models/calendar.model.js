import mongoose from "mongoose";

const { Schema } = mongoose;

const CalendarSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },
    title: {
      type: String,
      required: [true, "Event title is required."],
    },
    description: String,
    type: {
      type: String,
      enum: ["fitting", "consultation", "delivery", "deadline", "meeting"],
      required: [true, "Event type is required."],
    },
    startTime: {
      type: Date,
      required: [true, "Start time is required."],
    },
    endTime: {
      type: Date,
      required: [true, "End time is required."],
    },
    location: String,
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Calendar", CalendarSchema);
