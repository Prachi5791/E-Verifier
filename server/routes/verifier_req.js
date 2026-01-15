import express from "express";
import VerifierRequest from "../model/verifierRequest.js";
import { authMiddleware } from "../middleware/auth.js";
import { grantVerifierOnChain, getRoleFromContract } from "../utils/eth.js";
import { sendEmail } from "../utils/email.js";

const router = express.Router();

router.post("/request-verifier", authMiddleware(), async (req, res) => {
  const walletAddress = req.user.walletAddress;
  const { name, email, organization, note, domain } = req.body;

  const role = await getRoleFromContract(walletAddress);
  if (role === "verifier" || role === "admin") {
    return res.json({ message: "Already has verifier/admin role" });
  }

  let existing = await VerifierRequest.findOne({ walletAddress });

  if (existing && existing.status === "pending") {
    return res.json({ message: "Request already pending" });
  }

  if (!domain) {
    return res.status(400).json({ error: "Domain is required" });
  }

  if (existing && existing.status !== "pending") {
    existing.name = name;
    existing.email = email;
    existing.organization = organization;
    existing.note = note;
    existing.domain = domain;
    existing.status = "pending";
    existing.requestedAt = new Date();
    existing.decidedAt = undefined;
    await existing.save();
    return res.json({ message: "Request re-submitted", request: existing });
  }

  // Create fresh request
  const reqDoc = await VerifierRequest.create({
    walletAddress,
    name,
    email,
    organization,
    note,
    domain,
    status: "pending",
  });

  res.json({ message: "Request submitted", request: reqDoc });
});

// Admin: list pending requests
router.get(
  "/pending-verifiers",
  authMiddleware(["admin"]),
  async (req, res) => {
    const list = await VerifierRequest.find({ status: "pending" }).sort({
      requestedAt: 1,
    });
    res.json({ requests: list });
  }
);

// Admin: approve request (calls contract.assignRole)
router.post("/approve-verifier", authMiddleware("admin"), async (req, res) => {
  const { walletAddress, decisionNote } = req.body;

  let request = await VerifierRequest.findOne({
    walletAddress,
    status: "pending",
  });
  if (!request) return res.status(404).json({ error: "Request not found" });

  // Grant on-chain
  await grantVerifierOnChain(walletAddress);

  request.status = "approved";
  request.decisionNote = decisionNote || "Approved by admin";
  request.decidedAt = new Date();
  await request.save();

  // Send email
  await sendEmail(
    request.email,
    "Verifier Request Approved",
    `<p>Hello ${request.name},</p>
     <p>Your request to become a verifier has been <b>approved</b>.</p>
     <p>Reason: ${request.decisionNote}</p>
     <p>You can now log in and use verifier privileges.</p>`
  );

  res.json({ message: "Verifier approved & email sent", request });
});

// Reject
router.post("/reject-verifier", authMiddleware("admin"), async (req, res) => {
  const { walletAddress, decisionNote } = req.body;

  let request = await VerifierRequest.findOne({
    walletAddress,
    status: "pending",
  });
  if (!request) return res.status(404).json({ error: "Request not found" });

  request.status = "rejected";
  request.decisionNote = decisionNote || "Rejected by admin";
  request.decidedAt = new Date();
  await request.save();

  // Send email
  await sendEmail(
    request.email,
    "Verifier Request Rejected",
    `<p>Hello ${request.name},</p>
     <p>Your request to become a verifier has been <b>rejected</b>.</p>
     <p>Reason: ${request.decisionNote}</p>
     <p>You may contact support if you believe this was a mistake.</p>`
  );

  res.json({ message: "Verifier rejected & email sent", request });
});

// For example, POST /admin/addVerifier
router.post("/admin/addVerifier", async (req, res) => {
  try {
    const { walletAddress, name, email, organization, domain, note } = req.body;

    // Upsert verifier details (approve immediately)
    const verifier = await VerifierRequest.findOneAndUpdate(
      { walletAddress },
      {
        walletAddress,
        name,
        email,
        organization,
        domain,
        note,
        status: "approved",
        decidedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({ message: "Verifier updated in DB", verifier });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update verifier in DB" });
  }
});

export default router;
