import mongoose from "mongoose";
const VersionSchema = new mongoose.Schema(
  {
    hash: { type: String, index: true },
    fileCid: String,
    metaCid: String,
    verified: { type: Boolean, default: false },
    verifier: String,
    uploadedAt: { type: Date, default: Date.now },
    ivBase64: String,
    fileName: String,
    fileType: String,
  },
  { _id: false }
);

const DocRootSchema = new mongoose.Schema(
  {
    rootHash: { type: String, index: true, unique: true },
    uploaderAddress: String,
    revoked: { type: Boolean, default: false },
    createdAt: Date,
    domain: String,
    title: String,
    description: String,
    expiresAt: Date,
    versions: [VersionSchema],
  },
  { timestamps: true }
);

export default mongoose.model("DocumentRoot", DocRootSchema);
