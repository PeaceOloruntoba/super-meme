import mongoose from "mongoose";

const { Schema } = mongoose;

const InvoiceItemSchema = new Schema(
  {
    description: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
    },
    amount: {
      type: Number,
      default: 0,
    },
  },
  { _id: false } // Prevents Mongoose from creating an _id for each subdocument
);

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
      min: 0,
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
      type: [InvoiceItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Invoice", InvoiceSchema);
