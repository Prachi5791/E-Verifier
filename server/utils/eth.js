
import { ethers } from "ethers";
import dotenv from "dotenv";
import contractAbi from "./loadAbi.js";
dotenv.config();

const RPC = process.env.ETHEREUM_RPC_URL || "http://127.0.0.1:7545";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

export const provider = new ethers.JsonRpcProvider(RPC);
export const readContract = new ethers.Contract(
  CONTRACT_ADDRESS,
  contractAbi,
  provider
);

let adminSigner = null;
export let writeContract = null;
if (process.env.PRIVATE_KEY_ADMIN) {
  adminSigner = new ethers.Wallet(process.env.PRIVATE_KEY_ADMIN, provider);
  writeContract = new ethers.Contract(
    CONTRACT_ADDRESS,
    contractAbi,
    adminSigner
  );
} else {
  console.warn("PRIVATE_KEY_ADMIN not set; admin write operations disabled.");
}

export const getRoles = async () => {
  const ADMIN_ROLE = await readContract.ADMIN_ROLE();
  const VERIFIER_ROLE = await readContract.VERIFIER_ROLE();
  return { ADMIN_ROLE, VERIFIER_ROLE };
};

export const getRoleFromContract = async (walletAddress) => {
  const { ADMIN_ROLE, VERIFIER_ROLE } = await getRoles();
  if (await readContract.hasRole(ADMIN_ROLE, walletAddress)) return "admin";
  if (await readContract.hasRole(VERIFIER_ROLE, walletAddress))
    return "verifier";
  return "uploader";
};

export const grantVerifierOnChain = async (walletAddress) => {
  if (!writeContract) throw new Error("Server admin signer not configured");
  const { VERIFIER_ROLE } = await getRoles();
  const tx = await writeContract.grantRole(VERIFIER_ROLE, walletAddress);
  await tx.wait();
  return tx.hash;
};
