import mongoose from "mongoose";

const { Schema } = mongoose;

const measurementDetailSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      default: "inches",
    },
  },
  { _id: false }
);

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
      type: [measurementDetailSchema],
      default: [],
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Measurements", MeasurementsSchema);
