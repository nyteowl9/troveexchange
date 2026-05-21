const { ethers, run, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

// ─── Network-aware Deployment ────────────────────────────────────────────────
//
// Testnet (baseSepolia):
//   - Deploys MockUSDC
//   - Uses testnet defaults below for fee recipient + guardian
//   - Registers deployer as operator + dispute resolver (single key fills all roles)
//
// Mainnet (base):
//   - Uses real Base USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
//   - Requires the addresses below to be set as env vars in .env.contracts:
//       MAINNET_FEE_RECIPIENT     — Safe multisig address (receives all fees)
//       MAINNET_GUARDIAN          — G1 cold wallet
//       MAINNET_GUARDIAN2         — G2 cold wallet (must differ from G1)
//       MAINNET_OPERATOR          — Hot wallet that calls markDelivered/releaseEscrow
//       MAINNET_DISPUTE_RESOLVER  — Hot wallet that calls resolveDispute
//   - Registers the dedicated hot wallets (NOT the deployer)
//
// Post-deploy on mainnet, also run:
//   1. scripts/set-fee-bps.js  (sets 300/50 fee structure)
//   2. transferOwnership(Safe) — there's no script yet; call via Safe Tx Builder or a tiny CLI
//
// The deployer wallet should be a fresh burner — it becomes useless after
// transferOwnership and never needs to be used again.

// ─── Testnet defaults (do not change) ────────────────────────────────────────
const TESTNET_FEE_RECIPIENT = "0xE39a2128b7CeA98992E59ae3a7Ab2669E5801983";
const TESTNET_GUARDIAN      = "0x14721FdFfBE152d7fAC3910870257e0B1b1078B3";

// ─── Mainnet config from .env.contracts ──────────────────────────────────────
const BASE_USDC_MAINNET          = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const MAINNET_FEE_RECIPIENT      = process.env.MAINNET_FEE_RECIPIENT;
const MAINNET_GUARDIAN           = process.env.MAINNET_GUARDIAN;
const MAINNET_GUARDIAN2          = process.env.MAINNET_GUARDIAN2;
const MAINNET_OPERATOR           = process.env.MAINNET_OPERATOR;
const MAINNET_DISPUTE_RESOLVER   = process.env.MAINNET_DISPUTE_RESOLVER;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function verify(address, constructorArgs) {
  console.log(`\nVerifying ${address} on BaseScan...`);
  try {
    await run("verify:verify", { address, constructorArguments: constructorArgs });
    console.log("Verified.");
  } catch (e) {
    if (e.message.includes("Already Verified") || e.message.includes("already verified")) {
      console.log("Already verified.");
    } else {
      console.error("Verification failed:", e.message);
    }
  }
}

function assertAddress(name, value) {
  if (!value || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`${name} must be set to a valid 0x address in .env.contracts`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const [deployer] = await ethers.getSigners();
  const bal        = await ethers.provider.getBalance(deployer.address);

  const isMainnet = network.name === "base";
  const isTestnet = network.name === "baseSepolia";

  if (!isMainnet && !isTestnet) {
    throw new Error(`Unsupported network: ${network.name}. Use --network base or --network baseSepolia.`);
  }

  // Resolve config
  let usdcAddress, feeRecipient, guardian, guardian2, operatorAddr, disputeResolverAddr;

  if (isMainnet) {
    assertAddress("MAINNET_FEE_RECIPIENT",    MAINNET_FEE_RECIPIENT);
    assertAddress("MAINNET_GUARDIAN",         MAINNET_GUARDIAN);
    assertAddress("MAINNET_GUARDIAN2",        MAINNET_GUARDIAN2);
    assertAddress("MAINNET_OPERATOR",         MAINNET_OPERATOR);
    assertAddress("MAINNET_DISPUTE_RESOLVER", MAINNET_DISPUTE_RESOLVER);
    if (MAINNET_GUARDIAN2.toLowerCase() === MAINNET_GUARDIAN.toLowerCase()) {
      throw new Error("MAINNET_GUARDIAN2 must differ from MAINNET_GUARDIAN");
    }
    if (MAINNET_OPERATOR.toLowerCase() === deployer.address.toLowerCase()) {
      throw new Error("MAINNET_OPERATOR must differ from deployer (separation of concerns)");
    }

    usdcAddress         = BASE_USDC_MAINNET;
    feeRecipient        = MAINNET_FEE_RECIPIENT;
    guardian            = MAINNET_GUARDIAN;
    guardian2           = MAINNET_GUARDIAN2;
    operatorAddr        = MAINNET_OPERATOR;
    disputeResolverAddr = MAINNET_DISPUTE_RESOLVER;
  } else {
    // Testnet: deploy MockUSDC, use defaults, register deployer as ops
    feeRecipient        = TESTNET_FEE_RECIPIENT;
    guardian            = TESTNET_GUARDIAN;
    guardian2           = deployer.address;   // deployer fills G2 on testnet
    operatorAddr        = deployer.address;
    disputeResolverAddr = deployer.address;
  }

  console.log("=".repeat(60));
  console.log(`Chase Hollow — ${isMainnet ? "MAINNET" : "Testnet"} Deployment`);
  console.log("=".repeat(60));
  console.log(`Network:             ${network.name}`);
  console.log(`Deployer:            ${deployer.address}`);
  console.log(`Balance:             ${ethers.formatEther(bal)} ETH`);
  console.log(`Fee recipient:       ${feeRecipient}`);
  console.log(`Guardian 1:          ${guardian}`);
  console.log(`Guardian 2:          ${guardian2}${isTestnet ? " (testnet: deployer)" : ""}`);
  console.log(`Operator:            ${operatorAddr}${isTestnet ? " (testnet: deployer)" : ""}`);
  console.log(`Dispute Resolver:    ${disputeResolverAddr}${isTestnet ? " (testnet: deployer)" : ""}`);
  console.log("=".repeat(60));

  if (isMainnet) {
    console.log("\n⚠  MAINNET DEPLOY — about to spend real ETH.");
    console.log("   Verify the addresses above are correct before continuing.");
    console.log("   Press Ctrl+C within 10 seconds to abort...");
    await new Promise(r => setTimeout(r, 10000));
  }

  // ── 1. MockUSDC (testnet only) ───────────────────────────────
  if (isTestnet) {
    console.log("\n[1/3] Deploying MockUSDC...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc     = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();
    console.log(`MockUSDC deployed: ${usdcAddress}`);
  } else {
    console.log(`\n[1/3] Skipping MockUSDC (mainnet uses real Base USDC: ${usdcAddress})`);
  }

  // ── 2. Deploy ChaseHollowEscrow ──────────────────────────────
  console.log("\n[2/3] Deploying ChaseHollowEscrow...");
  const Escrow = await ethers.getContractFactory("ChaseHollowEscrow");
  const escrow = await Escrow.deploy(usdcAddress, feeRecipient, guardian, guardian2);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log(`ChaseHollowEscrow deployed: ${escrowAddress}`);

  // ── 3. Register operator + dispute resolver ──────────────────
  console.log("\n[3/3] Registering operator + dispute resolver...");
  await (await escrow.addOperator(operatorAddr)).wait();
  console.log(`  ✓ Operator added: ${operatorAddr}`);

  await (await escrow.addDisputeResolver(disputeResolverAddr)).wait();
  console.log(`  ✓ Dispute resolver added: ${disputeResolverAddr}`);

  // ── Summary ──────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log(`USDC:                ${usdcAddress}`);
  console.log(`ChaseHollowEscrow:   ${escrowAddress}`);
  console.log(`FeeRecipient:        ${feeRecipient}`);
  console.log(`Guardian:            ${guardian}`);
  console.log(`Guardian2:           ${guardian2}`);
  console.log(`Operator:            ${operatorAddr}`);
  console.log(`Dispute Resolver:    ${disputeResolverAddr}`);
  console.log("=".repeat(60));

  if (isMainnet) {
    console.log("\nNEXT STEPS (mainnet):");
    console.log("  1. node scripts/set-fee-bps.js --network base");
    console.log("     (sets platformFeeBps=300, creatorFeeBps=50)");
    console.log("  2. Call transferOwnership(<Safe address>) from the deployer wallet");
    console.log("     (one-time, after which the burner deployer is retired)");
    console.log("  3. Update Vercel env vars and redeploy");
  }

  // ── Save addresses ───────────────────────────────────────────
  const deployment = {
    network:           network.name,
    deployedAt:        new Date().toISOString(),
    deployer:          deployer.address,
    USDC:              usdcAddress,
    ChaseHollowEscrow: escrowAddress,
    feeRecipient,
    guardian,
    guardian2,
    operator:          operatorAddr,
    disputeResolver:   disputeResolverAddr,
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

    if (isTestnet) await verify(usdcAddress, []);
    await verify(escrowAddress, [usdcAddress, feeRecipient, guardian, guardian2]);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
