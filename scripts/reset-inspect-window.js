const { ethers } = require("ethers");
require("dotenv").config({ path: ".env.local" });

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_RPC_URL);
  const signer = new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY, provider);
  const escrow = new ethers.Contract(
    process.env.NEXT_PUBLIC_ESCROW_ADDRESS,
    ["function setBuyerInspectWindow(uint256) external", "function buyerInspectWindow() view returns (uint256)"],
    signer
  );

  console.log("Setting buyerInspectWindow back to 259200 (72h)...");
  const tx = await escrow.setBuyerInspectWindow(259200);
  const receipt = await tx.wait();
  console.log("tx status:", receipt.status, "hash:", receipt.hash);

  const val = await escrow.buyerInspectWindow();
  console.log("buyerInspectWindow now:", val.toString(), "seconds");
}

main().catch(console.error);
