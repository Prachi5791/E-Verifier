import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const abiPath = path.join(
  __dirname,
  "../../hardhat/artifacts/contracts/DocumentVerificationV2.sol/DocumentVerificationV2.json"
);
const json = JSON.parse(fs.readFileSync(abiPath, "utf8"));
export default json.abi;
