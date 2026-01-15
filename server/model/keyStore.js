import mongoose from "mongoose";
const KeySchema = new mongoose.Schema({
  versionHash: { type: String, index: true, unique: true },
  aesKeyBase64: { type: String, required: true },
  uploader: String,
  ivBase64: String,
  createdAt: { type: Date, default: Date.now },
});
export default mongoose.model("KeyStore", KeySchema);
