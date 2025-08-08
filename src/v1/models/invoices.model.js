import mongoose from "mongoose";

const { Schema } = mongoose;

const InvoiceSchema = new Schema(
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
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    invoiceNumber: {
      type: String,
      required: [true, "Invoice number is required."],
      unique: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required."],
    },
    status: {
      type: String,
      enum: ["draft", "sent", "paid", "overdue"],
      default: "draft",
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required."],
    },
    items: {
      type: Schema.Types.Mixed,
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Invoice", InvoiceSchema);
