/**
 * Chase Hollow — Cancel Order Tests
 *
 * Scenario A — Cancel before seller confirms (AwaitingConfirmation):
 *   Buyer funds → operator cancels → buyer refunded in full, no bond posted
 *
 * Scenario B — Cancel after seller confirms (Active / no-show):
 *   Buyer funds → seller confirms + posts bond → operator cancels (no-show)
 *   → buyer refunded in full, seller bond forfeited to fee recipient
 *
 * Usage:
 *   npx hardhat run scripts/testnet-cancel.js --network baseSepolia
 */

const { ethers, network } = require("hardhat");
const fs   = require("fs");
const path = require("path");

const deployment  = JSON.parse(fs.readFileSync(path.join(__dirname, "../deployments/baseSepolia.json")));
const USDC_ADDRESS   = deployment.MockUSDC;
const ESCROW_ADDRESS = deployment.ChaseHollowEscrow;

const u   = (n) => ethers.parseUnits(String(n), 6);
const fmt = (bn) => ethers.formatUnits(bn, 6);

function randomOrderId() {
  return ethers.hexlify(ethers.randomBytes(32));
}

function sep(title) {
  console.log("\n" + "─".repeat(60));
  console.log(`  ${title}`);
  console.log("─".repeat(60));
}

async function main() {
  const [deployer] = await ethers.getSigners();

  const buyerKey  = process.env.BUYER_PRIVATE_KEY;
  const sellerKey = process.env.SELLER_PRIVATE_KEY;
  if (!buyerKey)  throw new Error("BUYER_PRIVATE_KEY not set in .env.contracts");
  if (!sellerKey) throw new Error("SELLER_PRIVATE_KEY not set in .env.contracts");

  const buyer  = new ethers.Wallet(buyerKey,  ethers.provider);
  const seller = new ethers.Wallet(sellerKey, ethers.provider);

  sep("Chase Hollow — Cancel Order Tests");
  console.log(`Network:        ${network.name}`);
  console.log(`Deployer/Owner: ${deployer.address}`);
  console.log(`Buyer:          ${buyer.address}`);
  console.log(`Seller:         ${seller.address}`);
  console.log(`Fee Recipient:  ${deployment.feeRecipient}`);

  // ── Attach contracts ──────────────────────────────────────
  const usdcAbi = [
    "function mint(address to, uint256 amount) external",
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
  ];
  const escrowAbi = [
    "function fundOrder(bytes32,address,address,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256) external",
    "function confirmOrder(bytes32) external",
    "function cancelOrder(bytes32) external",
    "function addOperator(address) external",
    "function isOperator(address) view returns (bool)",
    "function platformFeeBps() view returns (uint256)",
    "function creatorFeeBps() view returns (uint256)",
  ];

  const usdc   = new ethers.Contract(USDC_ADDRESS,   usdcAbi, deployer);
  const escrow = new ethers.Contract(ESCROW_ADDRESS, escrowAbi, deployer);

  // ── Step 0: Ensure operator registered ───────────────────
  sep("Step 0 — Operator Check");
  const isOp = await escrow.isOperator(deployer.address);
  if (!isOp) {
    await (await escrow.addOperator(deployer.address)).wait();
    console.log("Operator registered.");
  } else {
    console.log("Operator already registered.");
  }

  // ── Mint USDC ─────────────────────────────────────────────
  sep("Mint Test USDC");
  await (await usdc.mint(buyer.address,  u(2000))).wait();
  await (await usdc.mint(seller.address, u(500))).wait();
  console.log(`Buyer  balance: $${fmt(await usdc.balanceOf(buyer.address))} USDC`);
  console.log(`Seller balance: $${fmt(await usdc.balanceOf(seller.address))} USDC`);

  // ── Build shared order amounts ────────────────────────────
  const CARD_PRICE   = u(400);
  const AUTH_FEE     = u(25);
  const LABEL_A_COST = u(12);
  const LABEL_B_COST = u(15);
  const SALES_TAX    = u(0);

  const platformBps  = await escrow.platformFeeBps();
  const creatorBps   = await escrow.creatorFeeBps();
  const platformFee  = CARD_PRICE * platformBps / 10000n;
  const creatorFee   = CARD_PRICE * creatorBps  / 10000n;
  const sellerPayout = CARD_PRICE - platformFee - creatorFee - LABEL_A_COST;
  const SHIPPING_FEE = LABEL_B_COST;
  const escrowAmount = sellerPayout + platformFee + creatorFee + AUTH_FEE + SHIPPING_FEE + SALES_TAX;
  const BOND_FLOOR   = u(20);
  const sellerBond   = BOND_FLOOR + (CARD_PRICE * 400n / 10000n);

  const buyerEscrow  = new ethers.Contract(ESCROW_ADDRESS, escrowAbi, buyer);
  const buyerUsdc    = new ethers.Contract(USDC_ADDRESS,   usdcAbi,   buyer);
  const sellerEscrow = new ethers.Contract(ESCROW_ADDRESS, escrowAbi, seller);
  const sellerUsdc   = new ethers.Contract(USDC_ADDRESS,   usdcAbi,   seller);

  // ════════════════════════════════════════════════════════
  //  SCENARIO A — Cancel before seller confirms
  // ════════════════════════════════════════════════════════

  sep("SCENARIO A — Cancel Before Confirmation");
  console.log("Buyer funds → operator cancels immediately (seller never confirms)");

  const orderIdA = randomOrderId();

  await (await buyerUsdc.approve(ESCROW_ADDRESS, escrowAmount)).wait();
  const fundA = await buyerEscrow.fundOrder(
    orderIdA, seller.address, ethers.ZeroAddress,
    escrowAmount, sellerBond, platformFee, creatorFee,
    AUTH_FEE, SHIPPING_FEE, SALES_TAX, sellerPayout
  );
  await fundA.wait();
  console.log(`fundOrder tx:     ${fundA.hash}`);
  console.log(`Escrow holds:     $${fmt(await usdc.balanceOf(ESCROW_ADDRESS))} USDC`);

  const buyerBeforeA = await usdc.balanceOf(buyer.address);
  const feeBeforeA   = await usdc.balanceOf(deployment.feeRecipient);

  const cancelA = await escrow.cancelOrder(orderIdA);
  await cancelA.wait();
  console.log(`cancelOrder tx:   ${cancelA.hash}`);

  const buyerAfterA  = await usdc.balanceOf(buyer.address);
  const feeAfterA    = await usdc.balanceOf(deployment.feeRecipient);
  const escrowAfterA = await usdc.balanceOf(ESCROW_ADDRESS);

  const buyerRefundedA = buyerAfterA - buyerBeforeA;
  const feeGainA       = feeAfterA   - feeBeforeA;

  console.log(`\n  Result:`);
  console.log(`  Buyer refunded:     $${fmt(buyerRefundedA)} (should be full escrow $${fmt(escrowAmount)})`);
  console.log(`  Fee recip gained:   $${fmt(feeGainA)} (should be $0.00 — no bond posted)`);
  console.log(`  Escrow remaining:   $${fmt(escrowAfterA)}`);

  console.log(`\n  Verification:`);
  console.log(`  Buyer full refund:  ${buyerRefundedA === escrowAmount ? `✓  $${fmt(buyerRefundedA)}` : `✗  got $${fmt(buyerRefundedA)}, expected $${fmt(escrowAmount)}`}`);
  console.log(`  No bond forfeited:  ${feeGainA === 0n               ? `✓  $0.00`                   : `✗  unexpected fee gain $${fmt(feeGainA)}`}`);
  console.log(`  Escrow empty:       ${escrowAfterA === 0n            ? `✓  $0.00`                   : `✗  $${fmt(escrowAfterA)} remaining`}`);

  // ════════════════════════════════════════════════════════
  //  SCENARIO B — Cancel after seller confirms (no-show)
  // ════════════════════════════════════════════════════════

  sep("SCENARIO B — Cancel After Confirmation (No-Show)");
  console.log("Buyer funds → seller confirms + posts bond → operator cancels (no-show)");

  const orderIdB = randomOrderId();

  await (await buyerUsdc.approve(ESCROW_ADDRESS, escrowAmount)).wait();
  const fundB = await buyerEscrow.fundOrder(
    orderIdB, seller.address, ethers.ZeroAddress,
    escrowAmount, sellerBond, platformFee, creatorFee,
    AUTH_FEE, SHIPPING_FEE, SALES_TAX, sellerPayout
  );
  await fundB.wait();
  console.log(`fundOrder tx:     ${fundB.hash}`);

  await (await sellerUsdc.approve(ESCROW_ADDRESS, sellerBond)).wait();
  const confirmB = await sellerEscrow.confirmOrder(orderIdB);
  await confirmB.wait();
  console.log(`confirmOrder tx:  ${confirmB.hash}`);
  console.log(`Escrow holds:     $${fmt(await usdc.balanceOf(ESCROW_ADDRESS))} USDC (escrow + bond)`);

  const buyerBeforeB  = await usdc.balanceOf(buyer.address);
  const sellerBeforeB = await usdc.balanceOf(seller.address);
  const feeBeforeB    = await usdc.balanceOf(deployment.feeRecipient);

  const cancelB = await escrow.cancelOrder(orderIdB);
  await cancelB.wait();
  console.log(`cancelOrder tx:   ${cancelB.hash}`);

  const buyerAfterB  = await usdc.balanceOf(buyer.address);
  const sellerAfterB = await usdc.balanceOf(seller.address);
  const feeAfterB    = await usdc.balanceOf(deployment.feeRecipient);
  const escrowAfterB = await usdc.balanceOf(ESCROW_ADDRESS);

  const buyerRefundedB  = buyerAfterB  - buyerBeforeB;
  const sellerNetChangeB = sellerAfterB - sellerBeforeB; // should be 0 (bond not returned)
  const feeGainB         = feeAfterB   - feeBeforeB;    // should be bond

  const totalInB  = escrowAmount + sellerBond;
  const totalOutB = buyerRefundedB + feeGainB;

  console.log(`\n  Result:`);
  console.log(`  Buyer refunded:     $${fmt(buyerRefundedB)} (full escrow)`);
  console.log(`  Seller net change:  $${fmt(sellerNetChangeB)} (bond forfeited, not returned)`);
  console.log(`  Fee recip gained:   $${fmt(feeGainB)} (forfeited bond)`);
  console.log(`  Escrow remaining:   $${fmt(escrowAfterB)}`);

  console.log(`\n  Verification:`);
  console.log(`  Buyer full refund:  ${buyerRefundedB  === escrowAmount ? `✓  $${fmt(buyerRefundedB)}` : `✗  got $${fmt(buyerRefundedB)}, expected $${fmt(escrowAmount)}`}`);
  console.log(`  Bond forfeited:     ${feeGainB        === sellerBond  ? `✓  $${fmt(feeGainB)} (bond)` : `✗  got $${fmt(feeGainB)}, expected $${fmt(sellerBond)}`}`);
  console.log(`  Seller lost bond:   ${sellerNetChangeB === 0n          ? `✓  $0.00 net (bond gone)`   : `✗  unexpected change $${fmt(sellerNetChangeB)}`}`);
  console.log(`  Escrow empty:       ${escrowAfterB    === 0n           ? `✓  $0.00`                   : `✗  $${fmt(escrowAfterB)} remaining`}`);
  console.log(`  Total in = out:     ${totalInB === totalOutB           ? `✓  $${fmt(totalInB)}`       : `✗  in $${fmt(totalInB)} vs out $${fmt(totalOutB)}`}`);

  console.log("\n" + "═".repeat(60));
  console.log("  CANCEL ORDER TESTS COMPLETE");
  console.log("═".repeat(60));
  console.log(`\n  https://sepolia.basescan.org/address/${ESCROW_ADDRESS}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
