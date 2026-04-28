const { ethers, run, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

// ─── Deployment Parameters ───────────────────────────────────────────────────

const FEE_RECIPIENT = "0xE39a2128b7CeA98992E59ae3a7Ab2669E5801983";
// G1: primary guardian (cold hardware wallet)
const GUARDIAN      = "0x14721FdFfBE152d7fAC3910870257e0B1b1078B3";
// G2: second guardian — MUST be a different address from G1.
// For testnet: the deployer key serves as G2 (set dynamically below).
// For mainnet: replace with the real second cold hardware wallet address.
const GUARDIAN2_MAINNET = null; // TODO: set real G2 address before mainnet deploy

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function verify(address, constructorArgs) {
  console.log(`\nVerifying ${address} on BaseScan...`);
  try {
    await run("verify:verify", {
      address,
      constructorArguments: constructorArgs,
    });
    console.log("Verified.");
  } catch (e) {
    if (e.message.includes("Already Verified") || e.message.includes("already verified")) {
      console.log("Already verified.");
    } else {
      console.error("Verification failed:", e.message);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const [deployer] = await ethers.getSigners();
  const bal = await ethers.provider.getBalance(deployer.address);

  console.log("=".repeat(60));
  console.log("Chase Hollow — Testnet Deployment");
  console.log("=".repeat(60));
  // Resolve GUARDIAN2: use mainnet address if set, otherwise fall back to deployer for testnet
  const isTestnet = network.name !== "base" && network.name !== "homestead";
  const GUARDIAN2 = GUARDIAN2_MAINNET || (isTestnet ? deployer.address : null);
  if (!GUARDIAN2) {
    throw new Error("GUARDIAN2_MAINNET must be set before mainnet deployment");
  }
  if (GUARDIAN2 === GUARDIAN) {
    throw new Error("GUARDIAN2 must be a different address from GUARDIAN");
  }

  console.log(`Network:   ${network.name}`);
  console.log(`Deployer:  ${deployer.address}`);
  console.log(`Balance:   ${ethers.formatEther(bal)} ETH`);
  console.log(`FeeRecip:  ${FEE_RECIPIENT}`);
  console.log(`Guardian:  ${GUARDIAN}`);
  console.log(`Guardian2: ${GUARDIAN2}${isTestnet ? " (testnet: deployer)" : ""}`);
  console.log("=".repeat(60));

  // ── 1. Deploy MockUSDC ───────────────────────────────────────
  console.log("\n[1/2] Deploying MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc     = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log(`MockUSDC deployed: ${usdcAddress}`);

  // ── 2. Deploy ChaseHollowEscrow ──────────────────────────────
  console.log("\n[2/2] Deploying ChaseHollowEscrow...");
  const Escrow = await ethers.getContractFactory("ChaseHollowEscrow");
  const escrow = await Escrow.deploy(usdcAddress, FEE_RECIPIENT, GUARDIAN, GUARDIAN2);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log(`ChaseHollowEscrow deployed: ${escrowAddress}`);

  // ── 3. Register deployer as operator + dispute resolver (testnet) ──
  // On mainnet: Safe calls addOperator() and addDisputeResolver()
  // with separate dedicated hot wallets. On testnet deployer fills both.
  console.log("\n[post-deploy] Registering deployer as operator...");
  await (await escrow.addOperator(deployer.address)).wait();
  console.log("  ✓ Operator added:", deployer.address);

  console.log("[post-deploy] Registering deployer as dispute resolver...");
  await (await escrow.addDisputeResolver(deployer.address)).wait();
  console.log("  ✓ Dispute resolver added:", deployer.address);

  // ── Summary ──────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log(`MockUSDC:          ${usdcAddress}`);
  console.log(`ChaseHollowEscrow: ${escrowAddress}`);
  console.log(`FeeRecipient:      ${FEE_RECIPIENT}`);
  console.log(`Guardian:          ${GUARDIAN}`);
  console.log(`Guardian2:         ${GUARDIAN2}`);
  console.log("=".repeat(60));

  // ── Save addresses to file ───────────────────────────────────
  const deployment = {
    network:           network.name,
    deployedAt:        new Date().toISOString(),
    deployer:          deployer.address,
    MockUSDC:          usdcAddress,
    ChaseHollowEscrow: escrowAddress,
    feeRecipient:      FEE_RECIPIENT,
    guardian:          GUARDIAN,
    guardian2:         GUARDIAN2,
  };

  const outDir  = path.join(__dirname, "../deployments");
  const outFile = path.join(outDir, `${network.name}.json`);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  fs.writeFileSync(outFile, JSON.stringify(deployment, null, 2));
  console.log(`\nAddresses saved to deployments/${network.name}.json`);

  // ── Verify on BaseScan ───────────────────────────────────────
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\nWaiting 15s for BaseScan to index contracts...");
    await new Promise(r => setTimeout(r, 15000));

    await verify(usdcAddress, []);
    await verify(escrowAddress, [usdcAddress, FEE_RECIPIENT, GUARDIAN, GUARDIAN2]);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
