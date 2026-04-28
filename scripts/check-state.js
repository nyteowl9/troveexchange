const { ethers } = require("hardhat");
const fs = require("fs"), path = require("path");
const dep = JSON.parse(fs.readFileSync(path.join(__dirname, "../deployments/baseSepolia.json")));
const fmt = (bn) => (Number(bn) / 1e6).toFixed(2);
const STATUS = ["AwaitingConfirmation","Active","Delivered","Released","Disputed","RefundedToBuyer","Cancelled"];

async function main() {
  const usdc = await ethers.getContractAt(
    ["function balanceOf(address) view returns (uint256)"],
    dep.MockUSDC
  );
  const wallets = {
    "Buyer":    "0x332Ba86020aDED718Ce07ea2181c259EE7122f7e",
    "Seller":   "0x1B35Ac1eAC85844A738A406D4A4cF850B5614363",
    "FeeRecip": dep.feeRecipient,
    "Escrow":   dep.ChaseHollowEscrow,
  };
  console.log("\n── USDC Balances ─────────────────────────────");
  for (const [name, addr] of Object.entries(wallets)) {
    const bal = await usdc.balanceOf(addr);
    console.log(`  ${name.padEnd(12)} $${fmt(bal)}`);
  }
  console.log("──────────────────────────────────────────────\n");
}
main().catch(console.error);
