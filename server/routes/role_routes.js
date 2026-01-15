import express from "express";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Admin-only
router.get("/admin/data", authMiddleware(["admin"]), (req, res) => {
  res.json({ message: "Secret admin data" });
});

// Verifier-only
router.get("/verifier/data", authMiddleware(["verifier"]), (req, res) => {
  res.json({ message: "Secret verifier data" });
});

// Uploader-only (example)
router.get("/uploader/data", authMiddleware(["uploader"]), (req, res) => {
  res.json({ message: "Secret uploader data" });
});

export default router;
