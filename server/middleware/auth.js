import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { getRoleFromContract } from "../utils/eth.js";
import User from "../model/user.js";

dotenv.config();

export const cookieOptions = {
  httpOnly: true,
  secure: false,
  sameSite: "lax",
  maxAge: 60 * 60 * 1000,
  domain: "localhost",
};

export const authMiddleware = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const token = req.cookies?.token;

      if (!token) return res.status(401).json({ error: "Not authenticated" });

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const walletAddress = payload.walletAddress;
      const onChainRole = await getRoleFromContract(walletAddress);
      const user = await User.findOne({ walletAddress });
      const isApproved = user?.isApproved || false;

      const effectiveRole =
        onChainRole || (isApproved ? "verifier" : "uploader");

      if (allowedRoles.length && !allowedRoles.includes(effectiveRole))
        return res.status(403).json({ error: "Forbidden" });

      req.user = { walletAddress, role: effectiveRole };
      next();
    } catch (err) {
      console.error("auth error", err);
      res.status(401).json({ error: "Not authenticated" });
    }
  };
};
