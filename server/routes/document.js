import express from "express";
import multer from "multer";
import crypto from "crypto";
import KeyStore from "../model/keyStore.js";
import { pinBuffer } from "../utils/ipfs.js";
import { readContract, writeContract } from "../utils/eth.js";
import { authMiddleware } from "../middleware/auth.js";
import documentRoot from "../model/documentRoot.js";
import VerifierRequest from "../model/verifierRequest.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const hexify = (buffer) => "0x" + buffer.toString("hex");

router.post("/pin", upload.single("encrypted"), async (req, res) => {
  try {
    const {
      rootHash,
      aesKeyBase64,
      ivBase64,
      domain,
      title,
      description,
      fileName,
      fileType,
    } = req.body;

    if (!req.file) return res.status(400).json({ error: "No encrypted file" });

    // Pin encrypted file
    const fileCid = await pinBuffer(req.file.buffer);

    // Build metadata.json
    const metadataObj = {
      fileCid,
      rootHash,
      ivBase64,
      title,
      domain,
      description,
      fileName,
      fileType,
    };
    const metaCid = await pinBuffer(
      Buffer.from(JSON.stringify(metadataObj)),
      "metadata.json",
      "application/json"
    );

    // ✅ Store AES key securely
    if (aesKeyBase64 && ivBase64) {
      await KeyStore.create({
        versionHash: rootHash,
        aesKeyBase64,
        uploader: req.user?.walletAddress || "frontend",
        ivBase64,
      });
    }

    res.json({ fileCid, metaCid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Pin failed", details: err.message });
  }
});

// 2️⃣ Save after contract confirmation
router.post("/save", async (req, res) => {
  console.log("Cookies:", req.cookies);
  console.log("Token:", req.cookies?.token);

  try {
    const {
      rootHash,
      domain,
      title,
      description,
      fileCid,
      metaCid,
      fileName,
      fileType,
      txHash,
    } = req.body;

    const uploaderAddress = req.body.uploaderAddress;

    await documentRoot.create({
      rootHash,
      // uploaderAddress: req.user?.walletAddress || "frontend",
      uploaderAddress,
      revoked: false,
      createdAt: new Date(),
      domain,
      title,
      description,
      versions: [
        {
          hash: rootHash,
          fileCid,
          metaCid,
          fileName,
          fileType,
          verified: false,
          uploadedAt: new Date(),
        },
      ],
      txHash,
    });

    res.json({ message: "Saved to DB" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Save failed", details: err.message });
  }
});

router.get("/exists", async (req, res) => {
  try {
    const rootHash = req.query.rootHash;
    if (!rootHash)
      return res.status(400).json({ error: "Missing rootHash parameter" });

    const exists = await documentRoot.exists({ rootHash });
    res.json({ exists: !!exists });
  } catch (err) {
    console.error("Error checking document existence:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// pending docs for verifiers
router.get(
  "/pending-docs",
  authMiddleware(["verifier", "admin"]),
  async (req, res) => {
    try {
      let userDomain = null;

      // console.log(req.user.role);

      if (req.user.role === "verifier") {
        const vr = await VerifierRequest.findOne({
          walletAddress: req.user.walletAddress,
        });
        if (!vr)
          return res.status(403).json({ error: "Verifier domain not found" });
        userDomain = vr.domain;
      }

      const domainFilter =
        req.user.role === "admin" ? {} : { domain: userDomain };

      const docs = await documentRoot
        .find({
          revoked: false,
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: { $gt: new Date() } },
          ],
          ...domainFilter,
        })
        .lean();

      const pending = docs
        .map((d) => ({
          rootHash: d.rootHash,
          title: d.title,
          domain: d.domain,
          versions: d.versions
            .filter((v) => !v.verified)
            .map((v) => ({
              hash: v.hash,
              cid: v.metaCid,
            })),
        }))
        .filter((d) => d.versions.length > 0);

      res.json({ docs: pending });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "pending-docs failed" });
    }
  }
);

// get key for version
router.get(
  "/key/:versionHash",
  authMiddleware(["verifier", "admin"]),
  async (req, res) => {
    try {
      const versionHash = req.params.versionHash;
      const record = await KeyStore.findOne({ versionHash });
      if (!record) return res.status(404).json({ error: "Key not found" });
      res.json({
        aesKeyBase64: record.aesKeyBase64,
        ivBase64: record.ivBase64,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "get-key failed" });
    }
  }
);

// after verifier did on-chain tx, sync DB
router.post(
  "/sync-verified",
  authMiddleware(["verifier", "admin"]),
  async (req, res) => {
    try {
      const { versionHash, status } = req.body;
      const root = await documentRoot.findOne({ "versions.hash": versionHash });

      if (!root) return res.status(404).json({ error: "Root not found" });

      const v = root.versions.find(
        (x) => x.hash.toLowerCase() === versionHash.toLowerCase()
      );

      if (!v) return res.status(404).json({ error: "Version not found" });

      v.verified = !!status;
      v.verifier = req.user.walletAddress;
      await root.save();
      res.json({ message: "synced" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "sync failed" });
    }
  }
);

// revoke root (admin)
router.post("/revoke-root", authMiddleware(["admin"]), async (req, res) => {
  try {
    const { rootHash, reason } = req.body;
    if (!writeContract)
      return res.status(500).json({ error: "Server signer not configured" });
    const tx = await writeContract.revokeRoot(rootHash, reason || "");
    await tx.wait();
    await documentRoot.findOneAndUpdate({ rootHash }, { revoked: true });
    res.json({ message: "revoked", txHash: tx.hash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "revoke failed", details: err.message });
  }
});

router.get("/ipfs/:cid", async (req, res) => {
  try {
    const { cid } = req.params;
    const url = `https://gateway.pinata.cloud/ipfs/${cid}`;

    const r = await fetch(url);

    // console.log(
    //   "IPFS fetch:",
    //   url,
    //   "status:",
    //   r.status,
    //   "ctype:",
    //   r.headers.get("content-type")
    // );

    if (!r.ok) {
      const text = await r.text();
      console.error("IPFS error response:", text.substring(0, 200));
      return res.status(r.status).send(text);
    }

    const contentType = r.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      const data = await r.json();
      return res.json(data);
    } else {
      res.setHeader("Content-Type", contentType || "application/octet-stream");
      const buffer = await r.arrayBuffer();
      return res.send(Buffer.from(buffer));
    }
  } catch (err) {
    console.error("IPFS proxy error:", err);
    res.status(500).send("IPFS proxy error");
  }
});

router.get("/my-uploads", authMiddleware(), async (req, res) => {
  try {
    const walletAddress = req.user.walletAddress;
    // console.log(walletAddress);

    const uploads = await documentRoot
      .find({ uploaderAddress: walletAddress })
      .sort({
        createdAt: -1,
      });
    res.json({ uploads });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch uploads" });
  }
});

export default router;
