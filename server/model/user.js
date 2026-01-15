import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    walletAddress: { type: String, index: true, unique: true, required: true },
    role: {
      type: String,
      enum: ["uploader", "verifier", "domain_admin", "super_admin"],
      default: "uploader",
    },
    nonce: { type: Number, default: () => Math.floor(Math.random() * 1000000) },
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
