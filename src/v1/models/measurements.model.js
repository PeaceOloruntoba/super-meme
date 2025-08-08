import mongoose from "mongoose";

const { Schema } = mongoose;

const MeasurementsSchema = new Schema(
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
    garmentType: {
      type: String,
      required: [true, "Garment type is required."],
    },
    measurements: {
      type: Schema.Types.Mixed,
      default: {},
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Measurements", MeasurementsSchema);
