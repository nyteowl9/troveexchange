/**
 * Chase Hollow — Dispute Flow Test (Seller Wins)
 *
 * Flow:
 *   1. Mint test USDC to buyer + seller
 *   2. Buyer funds order
 *   3. Seller confirms + posts bond
 *   4. Operator marks delivered
 *   5. Buyer opens dispute during inspection window
 *   6. Owner resolves dispute → seller wins
 *   7. Verify:
 *        Buyer    → loses full escrow (no refund)
 *        Seller   → receives sellerPayout + bond returned
 *        Fee recip→ receives platformFee + creatorFee
 *        Escrow   → $0.00
 *
 * Usage:
 *   npx hardhat run scripts/testnet-dispute-seller.js --network baseSepolia
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

  const addresses = [deployer.address, buyer.address, seller.address];
  if (new Set(addresses.map(a => a.toLowerCase())).size !== 3) {
    throw new Error("Deployer, buyer, and seller must be three distinct wallets");
  }

  sep("Chase Hollow — Dispute Flow (Seller Wins)");
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
    "function markDelivered(bytes32) external",
    "function openDispute(bytes32) external",
    "function resolveDispute(bytes32,bool) external",
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

  // ── Step 1: Mint USDC ─────────────────────────────────────
  sep("Step 1 — Mint Test USDC");
  await (await usdc.mint(buyer.address,  u(2000))).wait();
  await (await usdc.mint(seller.address, u(500))).wait();
  const buyerStartBal  = await usdc.balanceOf(buyer.address);
  const sellerStartBal = await usdc.balanceOf(seller.address);
  const feeStartBal    = await usdc.balanceOf(deployment.feeRecipient);
  console.log(`Buyer  balance: $${fmt(buyerStartBal)} USDC`);
  console.log(`Seller balance: $${fmt(sellerStartBal)} USDC`);

  // ── Step 2: Build order amounts (Tier 2, $400 card) ──────
  sep("Step 2 — Order Parameters (Tier 2 Physical Auth)");

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
  const sellerBond   = BOND_FLOOR + (CARD_PRICE * 400n / 10000n); // $20 floor + 4% new seller

  const orderId = randomOrderId();

  console.log(`Card price:      $${fmt(CARD_PRICE)}`);
  console.log(`Platform fee:    $${fmt(platformFee)} (from seller)`);
  console.log(`Creator fee:     $${fmt(creatorFee)}  (from seller)`);
  console.log(`Label A:         $${fmt(LABEL_A_COST)}  (from seller)`);
  console.log(`Auth fee:        $${fmt(AUTH_FEE)}  (from buyer)`);
  console.log(`Label B:         $${fmt(LABEL_B_COST)}  (from buyer)`);
  console.log(`Seller payout:   $${fmt(sellerPayout)}`);
  console.log(`Buyer escrow:    $${fmt(escrowAmount)}`);
  console.log(`Seller bond:     $${fmt(sellerBond)}`);

  // ── Step 3: Buyer funds escrow ────────────────────────────
  sep("Step 3 — Buyer Funds Escrow");
  const buyerEscrow = new ethers.Contract(ESCROW_ADDRESS, escrowAbi, buyer);
  const buyerUsdc   = new ethers.Contract(USDC_ADDRESS,   usdcAbi,   buyer);
  await (await buyerUsdc.approve(ESCROW_ADDRESS, escrowAmount)).wait();
  const fundTx = await buyerEscrow.fundOrder(
    orderId, seller.address, ethers.ZeroAddress,
    escrowAmount, sellerBond, platformFee, creatorFee,
    AUTH_FEE, SHIPPING_FEE, SALES_TAX, sellerPayout
  );
  await fundTx.wait();
  console.log(`fundOrder tx:    ${fundTx.hash}`);
  console.log(`Escrow holds:    $${fmt(await usdc.balanceOf(ESCROW_ADDRESS))} USDC`);

  // ── Step 4: Seller confirms + posts bond ─────────────────
  sep("Step 4 — Seller Confirms (Posts Bond)");
  const sellerEscrow = new ethers.Contract(ESCROW_ADDRESS, escrowAbi, seller);
  const sellerUsdc   = new ethers.Contract(USDC_ADDRESS,   usdcAbi,   seller);
  await (await sellerUsdc.approve(ESCROW_ADDRESS, sellerBond)).wait();
  const confirmTx = await sellerEscrow.confirmOrder(orderId);
  await confirmTx.wait();
  console.log(`confirmOrder tx: ${confirmTx.hash}`);
  console.log(`Escrow holds:    $${fmt(await usdc.balanceOf(ESCROW_ADDRESS))} USDC (escrow + bond)`);

  // ── Step 5: Operator marks delivered ─────────────────────
  sep("Step 5 — Operator Marks Delivered");
  const deliverTx = await escrow.markDelivered(orderId);
  await deliverTx.wait();
  console.log(`markDelivered tx: ${deliverTx.hash}`);
  console.log("Inspection window open — buyer can now dispute.");

  // ── Step 6: Buyer opens dispute ───────────────────────────
  sep("Step 6 — Buyer Opens Dispute");
  const disputeTx = await buyerEscrow.openDispute(orderId);
  await disputeTx.wait();
  console.log(`openDispute tx:   ${disputeTx.hash}`);
  console.log("Order status → Disputed. Funds frozen.");

  // ── Snapshot balances before resolution ─────────────────
  const buyerBalBefore  = await usdc.balanceOf(buyer.address);
  const sellerBalBefore = await usdc.balanceOf(seller.address);
  const feeBalBefore    = await usdc.balanceOf(deployment.feeRecipient);

  // ── Step 7: Owner resolves — seller wins ──────────────────
  sep("Step 7 — Owner Resolves Dispute (Seller Wins)");
  const resolveTx = await escrow.resolveDispute(orderId, false); // false = seller wins
  await resolveTx.wait();
  console.log(`resolveDispute tx: ${resolveTx.hash}`);

  // ── Step 8: Verify final balances ────────────────────────
  sep("Step 8 — Final Balance Check");

  const buyerBalAfter  = await usdc.balanceOf(buyer.address);
  const sellerBalAfter = await usdc.balanceOf(seller.address);
  const feeBalAfter    = await usdc.balanceOf(deployment.feeRecipient);
  const escrowFinal    = await usdc.balanceOf(ESCROW_ADDRESS);

  const buyerNetChange  = buyerBalAfter  - buyerBalBefore;  // should be 0 (buyer loses)
  const sellerNetGain   = sellerBalAfter - sellerBalBefore; // should be sellerPayout + bond
  const feeReceived     = feeBalAfter    - feeBalBefore;    // should be platformFee + creatorFee

  // Expected: seller wins → seller gets payout + bond back, buyer gets nothing
  // Fee recipient gets everything else: platformFee + creatorFee + authFee + shippingFee
  // (auth and shipping are services already rendered — Chase Hollow keeps them)
  const expectedSellerGain = sellerPayout + sellerBond;
  const expectedFeeRecip   = platformFee + creatorFee + AUTH_FEE + SHIPPING_FEE;

  console.log(`\n  Outcome: SELLER WINS`);
  console.log(`  ─────────────────────────────────────────`);
  console.log(`  Buyer net change:    $${fmt(buyerNetChange)} USDC (should be $0.00 — no refund)`);
  console.log(`  Seller net gain:     $${fmt(sellerNetGain)} USDC (payout + bond returned)`);
  console.log(`  Fee recip received:  $${fmt(feeReceived)} USDC (platform + creator fee)`);
  console.log(`  Escrow remaining:    $${fmt(escrowFinal)} USDC`);

  console.log(`\n  Verification:`);
  console.log(`  Buyer no refund:          ${buyerNetChange === 0n                      ? `✓  $0.00`                                        : `✗  unexpected gain $${fmt(buyerNetChange)}`}`);
  console.log(`  Seller payout correct:    ${sellerNetGain === expectedSellerGain        ? `✓  $${fmt(sellerNetGain)} (payout + bond)`        : `✗  got $${fmt(sellerNetGain)}, expected $${fmt(expectedSellerGain)}`}`);
  console.log(`  Fee recip correct:        ${feeReceived   === expectedFeeRecip          ? `✓  $${fmt(feeReceived)}`                          : `✗  got $${fmt(feeReceived)}, expected $${fmt(expectedFeeRecip)}`}`);
  console.log(`  Escrow empty:             ${escrowFinal   === 0n                        ? `✓  $0.00`                                        : `✗  $${fmt(escrowFinal)} remaining`}`);
  const totalIn  = escrowAmount + sellerBond;
  const totalOut = sellerNetGain + feeReceived;
  console.log(`  Total in = total out:     ${totalIn === totalOut ? `✓  $${fmt(totalIn)}` : `✗  in $${fmt(totalIn)} vs out $${fmt(totalOut)}`}`);

  console.log("\n" + "═".repeat(60));
  console.log("  SELLER WINS DISPUTE TEST COMPLETE");
  console.log("═".repeat(60));
  console.log(`\n  https://sepolia.basescan.org/address/${ESCROW_ADDRESS}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
