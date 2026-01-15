
import mongoose from "mongoose";

const VerifierRequestSchema = new mongoose.Schema(
  {
    walletAddress: { type: String, required: true, index: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    organization: { type: String },
    note: { type: String },
    domain: { type: String, required: true }, 
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    requestedAt: { type: Date, default: Date.now },
    decidedAt: { type: Date },
  },
  { timestamps: true }
);

const VerifierRequest = mongoose.model(
  "VerifierRequest",
  VerifierRequestSchema
);
export default VerifierRequest;
