import express from "express";
import User from "../model/user.js";
import * as ethers from "ethers";
import { verifyMessage } from "ethers";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { cookieOptions } from "../middleware/auth.js";
import { getRoleFromContract } from "../utils/eth.js";

dotenv.config();
const router = express.Router();

router.post("/request-nonce", async (req, res) => {
  const { walletAddress } = req.body;

  if (!walletAddress)
    return res.status(400).json({ error: "walletAddress required" });

  let user = await User.findOne({ walletAddress });

  if (!user) user = await User.create({ walletAddress });

  res.json({ nonce: user.nonce });
});

router.post("/verify-signature", async (req, res) => {
  try {
    const { walletAddress, signature } = req.body;
    const user = await User.findOne({ walletAddress });

    if (!user) return res.status(400).json({ error: "User not found" });

    const message = `Login nonce: ${user.nonce}`;
    const signerAddress = verifyMessage(message, signature);

    if (signerAddress.toLowerCase() !== walletAddress.toLowerCase())
      return res.status(400).json({ error: "Signature verification failed" });

    user.nonce = Math.floor(Math.random() * 1000000);

    await user.save();

    const token = jwt.sign({ walletAddress }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // console.log("JWT_SECRET in verify-signature:", process.env.JWT_SECRET);

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      domain: "localhost",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });

    // console.log(`token while verify: ${token}`);

    const onChainRole = await getRoleFromContract(walletAddress);
    res.json({
      walletAddress,
      role: onChainRole || (user?.isApproved ? "verifier" : "uploader"),
      isApproved: user?.isApproved || false,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Verify failed" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", cookieOptions);
  res.json({ ok: true });
});

router.get("/me", async (req, res) => {
  try {
    const token = req.cookies?.token;

    if (!token) return res.status(401).json({ error: "Not authenticated" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const walletAddress = payload.walletAddress;

    const user = await User.findOne({ walletAddress });
    const onChainRole = await getRoleFromContract(walletAddress);

    res.json({
      walletAddress,
      role: onChainRole || (user?.isApproved ? "verifier" : "uploader"),
      isApproved: user?.isApproved || false,
    });
  } catch (err) {
    console.error("Error in /me:", err);
    res.status(401).json({ error: "Not authenticated" });
  }
});

export default router;
