/**
 * Chase Hollow — Full Testnet Flow Script
 *
 * Walks through the complete happy-path escrow lifecycle on Base Sepolia:
 *   1. Mint test USDC to buyer + seller
 *   2. Buyer approves escrow + funds order
 *   3. Seller approves escrow + confirms order (posts bond)
 *   4. Operator marks delivered
 *   5. Buyer releases early  (or wait 72hrs for auto-release)
 *   6. Verify final balances
 *
 * Usage:
 *   npx hardhat run scripts/testnet-flow.js --network baseSepolia
 *
 * NOTE: The deployer wallet acts as owner + operator for this test.
 *       A second wallet (BUYER_PRIVATE_KEY in .env.contracts) acts as buyer.
 *       The deployer wallet also acts as seller for simplicity.
 */

const { ethers, network } = require("hardhat");
const fs  = require("fs");
const path = require("path");

// ─── Load deployment addresses ───────────────────────────────
const deployment = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../deployments/baseSepolia.json"))
);

const USDC_ADDRESS   = deployment.MockUSDC;
const ESCROW_ADDRESS = deployment.ChaseHollowEscrow;

// ─── USDC helpers (6 decimals) ───────────────────────────────
const u = (n) => ethers.parseUnits(String(n), 6);
const fmt = (bn) => ethers.formatUnits(bn, 6);

// ─── Random order ID ─────────────────────────────────────────
function randomOrderId() {
  return ethers.hexlify(ethers.randomBytes(32));
}

// ─── Separator ───────────────────────────────────────────────
function sep(title) {
  console.log("\n" + "─".repeat(60));
  console.log(`  ${title}`);
  console.log("─".repeat(60));
}

async function main() {
  const [deployer] = await ethers.getSigners();

  // Load buyer + seller from .env.contracts
  const buyerKey  = process.env.BUYER_PRIVATE_KEY;
  const sellerKey = process.env.SELLER_PRIVATE_KEY;

  if (!buyerKey)  throw new Error("BUYER_PRIVATE_KEY not set in .env.contracts");
  if (!sellerKey) throw new Error("SELLER_PRIVATE_KEY not set in .env.contracts");

  const buyer  = new ethers.Wallet(buyerKey,  ethers.provider);
  const seller = new ethers.Wallet(sellerKey, ethers.provider);

  // Sanity check — all three wallets must be distinct
  const addresses = [deployer.address, buyer.address, seller.address];
  if (new Set(addresses.map(a => a.toLowerCase())).size !== 3) {
    throw new Error("Deployer, buyer, and seller must be three distinct wallets");
  }

  sep("Chase Hollow — Testnet Flow");
  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Buyer:    ${buyer.address}`);
  console.log(`Seller:   ${seller.address}`);
  console.log(`USDC:     ${USDC_ADDRESS}`);
  console.log(`Escrow:   ${ESCROW_ADDRESS}`);

  // ── Attach contracts ──────────────────────────────────────
  const usdcAbi = [
    "function mint(address to, uint256 amount) external",
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)",
  ];
  const escrowAbi = [
    "function fundOrder(bytes32,address,address,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256) external",
    "function confirmOrder(bytes32) external",
    "function markDelivered(bytes32) external",
    "function releaseEscrow(bytes32) external",
    "function addOperator(address) external",
    "function isOperator(address) view returns (bool)",
    "function orders(bytes32) view returns (address,address,address,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint8,uint256,uint256,uint256)",
    "function platformFeeBps() view returns (uint256)",
    "function creatorFeeBps() view returns (uint256)",
    "function buyerInspectWindow() view returns (uint256)",
  ];

  const usdc   = new ethers.Contract(USDC_ADDRESS,   usdcAbi,   deployer);
  const escrow = new ethers.Contract(ESCROW_ADDRESS, escrowAbi, deployer);

  // ── Step 0: Add deployer as operator ─────────────────────
  sep("Step 0 — Register Operator");
  const isOp = await escrow.isOperator(deployer.address);
  if (!isOp) {
    console.log("Adding deployer as operator...");
    const tx = await escrow.addOperator(deployer.address);
    await tx.wait();
    console.log("Operator added.");
  } else {
    console.log("Deployer already registered as operator.");
  }

  // ── Step 1: Mint USDC ─────────────────────────────────────
  sep("Step 1 — Mint Test USDC");
  const MINT_BUYER  = u(2000);  // $2,000 for buyer
  const MINT_SELLER = u(500);   // $500 for seller (bond)

  console.log(`Minting $2,000 USDC → buyer  (${buyer.address})`);
  await (await usdc.mint(buyer.address,  MINT_BUYER)).wait();

  console.log(`Minting $500  USDC → seller (${seller.address})`);
  await (await usdc.mint(seller.address, MINT_SELLER)).wait();

  const buyerBal  = await usdc.balanceOf(buyer.address);
  const sellerBal = await usdc.balanceOf(seller.address);
  console.log(`Buyer  balance: $${fmt(buyerBal)} USDC`);
  console.log(`Seller balance: $${fmt(sellerBal)} USDC`);

  // ── Step 2: Calculate order amounts ──────────────────────
  sep("Step 2 — Build Order Parameters (Tier 2 Physical Auth)");

  // $400 card → Tier 2 (physical auth, $301–$50k)
  const CARD_PRICE    = u(400);  // listing price
  const AUTH_FEE      = u(25);   // buyer pays — physical auth fee
  const LABEL_A_COST  = u(12);   // seller → auth center (deducted from seller payout)
  const LABEL_B_COST  = u(15);   // auth center → buyer   (buyer pays as shippingFee)
  const SALES_TAX     = u(0);    // $0 until TaxJar

  const platformBps = await escrow.platformFeeBps();
  const creatorBps  = await escrow.creatorFeeBps();

  const cardValue    = CARD_PRICE;
  const platformFee  = cardValue * platformBps / 10000n;
  const creatorFee   = cardValue * creatorBps  / 10000n;

  // Tier 2: Label A cost comes OUT of seller payout
  const sellerPayout = CARD_PRICE - platformFee - creatorFee - LABEL_A_COST;

  // shippingFee in escrow = Label B only (buyer-facing)
  const SHIPPING_FEE = LABEL_B_COST;

  // Total buyer funds: payout + all fees + auth + shipping(LabelB) + tax
  const escrowAmount = sellerPayout + platformFee + creatorFee + AUTH_FEE + SHIPPING_FEE + SALES_TAX;

  // Bond = $20 floor + 4% (new seller)
  // Formula matches checkout: bond = min_bond_floor_usd + round(price × bondBps / 10000)
  const BOND_RATE       = 400n;
  const BOND_FLOOR      = u(20);
  const sellerBond      = BOND_FLOOR + (cardValue * BOND_RATE / 10000n);

  const orderId = randomOrderId();

  console.log(`Order ID:        ${orderId}`);
  console.log(`Auth tier:       Tier 2 — Physical ($301+)`);
  console.log(`Card price:      $${fmt(CARD_PRICE)}`);
  console.log(`Platform fee:    $${fmt(platformFee)} (${platformBps} BPS) ← from seller`);
  console.log(`Creator fee:     $${fmt(creatorFee)}  (${creatorBps} BPS) ← from seller`);
  console.log(`Label A cost:    $${fmt(LABEL_A_COST)}              ← from seller (seller→auth)`);
  console.log(`Auth fee:        $${fmt(AUTH_FEE)}              ← from buyer`);
  console.log(`Label B cost:    $${fmt(LABEL_B_COST)}              ← from buyer (auth→buyer)`);
  console.log(`Sales tax:       $${fmt(SALES_TAX)}`);
  console.log(`─────────────────────────────────────────`);
  console.log(`Seller payout:   $${fmt(sellerPayout)}  (card - 3.5% - Label A)`);
  console.log(`Buyer escrow:    $${fmt(escrowAmount)}  (payout + all fees)`);
  console.log(`Seller bond:     $${fmt(sellerBond)}  (4% new seller tier)`);
  console.log(`Escrow total:  $${fmt(escrowAmount)}`);
  console.log(`Seller bond:   $${fmt(sellerBond)}`);

  // Verify sum
  const sum = platformFee + creatorFee + AUTH_FEE + SHIPPING_FEE + SALES_TAX + sellerPayout;
  console.log(`Sum check:     ${sum === escrowAmount ? "✓ OK" : "✗ MISMATCH — fix before calling fundOrder"}`);

  // ── Step 3: Buyer funds escrow ────────────────────────────
  sep("Step 3 — Buyer Funds Escrow");

  const buyerEscrow = new ethers.Contract(ESCROW_ADDRESS, escrowAbi, buyer);
  const buyerUsdc   = new ethers.Contract(USDC_ADDRESS,   usdcAbi,   buyer);

  console.log(`Approving escrow to spend $${fmt(escrowAmount)} USDC...`);
  await (await buyerUsdc.approve(ESCROW_ADDRESS, escrowAmount)).wait();

  console.log("Calling fundOrder...");
  const fundTx = await buyerEscrow.fundOrder(
    orderId,
    seller.address,      // seller
    ethers.ZeroAddress,  // no creator/affiliate
    escrowAmount,
    sellerBond,
    platformFee,
    creatorFee,
    AUTH_FEE,
    SHIPPING_FEE,
    SALES_TAX,
    sellerPayout
  );
  const fundReceipt = await fundTx.wait();
  console.log(`fundOrder tx:  ${fundTx.hash}`);
  console.log(`Gas used:      ${fundReceipt.gasUsed.toLocaleString()}`);

  const buyerBalAfterFund = await usdc.balanceOf(buyer.address);
  const escrowBal         = await usdc.balanceOf(ESCROW_ADDRESS);
  console.log(`Buyer balance: $${fmt(buyerBalAfterFund)} (deducted $${fmt(escrowAmount)})`);
  console.log(`Escrow holds:  $${fmt(escrowBal)} USDC`);

  // ── Step 4: Seller confirms + posts bond ─────────────────
  sep("Step 4 — Seller Confirms Order (Posts Bond)");

  const sellerEscrow = new ethers.Contract(ESCROW_ADDRESS, escrowAbi, seller);
  const sellerUsdc   = new ethers.Contract(USDC_ADDRESS,   usdcAbi,   seller);

  console.log(`Approving escrow to spend $${fmt(sellerBond)} bond USDC...`);
  await (await sellerUsdc.approve(ESCROW_ADDRESS, sellerBond)).wait();

  console.log("Calling confirmOrder...");
  const confirmTx = await sellerEscrow.confirmOrder(orderId);
  await confirmTx.wait();
  console.log(`confirmOrder tx: ${confirmTx.hash}`);

  const escrowBalAfterConfirm = await usdc.balanceOf(ESCROW_ADDRESS);
  const sellerBalAfterConfirm = await usdc.balanceOf(seller.address);
  console.log(`Escrow holds:   $${fmt(escrowBalAfterConfirm)} (buyer escrow + seller bond)`);
  console.log(`Seller balance: $${fmt(sellerBalAfterConfirm)} (bond deducted)`);

  // ── Step 5: Operator marks delivered ─────────────────────
  sep("Step 5 — Operator Marks Delivered");
  console.log("Calling markDelivered (simulates Shippo delivery webhook)...");
  const deliverTx = await escrow.markDelivered(orderId);
  await deliverTx.wait();
  console.log(`markDelivered tx: ${deliverTx.hash}`);

  const inspectWindow = await escrow.buyerInspectWindow();
  console.log(`72hr inspection window open. Auto-releases in ${Number(inspectWindow) / 3600}hrs on mainnet.`);
  console.log("(On testnet we'll release early in the next step.)");

  // ── Step 6: Buyer releases early ─────────────────────────
  sep("Step 6 — Buyer Releases Escrow Early");

  const buyerBalBefore  = await usdc.balanceOf(buyer.address);
  const sellerBalBefore = await usdc.balanceOf(seller.address);
  const feeRecip        = deployment.feeRecipient;
  const feeBalBefore    = await usdc.balanceOf(feeRecip);

  console.log("Calling releaseEscrow (buyer approves early)...");
  const releaseTx = await buyerEscrow.releaseEscrow(orderId);
  await releaseTx.wait();
  console.log(`releaseEscrow tx: ${releaseTx.hash}`);

  // ── Step 7: Verify final balances ────────────────────────
  sep("Step 7 — Final Balance Check");

  const buyerBalAfter  = await usdc.balanceOf(buyer.address);
  const sellerBalAfter = await usdc.balanceOf(seller.address);
  const feeBalAfter    = await usdc.balanceOf(feeRecip);
  const escrowBalFinal = await usdc.balanceOf(ESCROW_ADDRESS);

  // Net gain for seller = balance after minus balance before releaseEscrow
  // (bond was deducted in confirmOrder, returned in releaseEscrow — both captured in delta)
  const sellerNetGain = sellerBalAfter - sellerBalBefore;

  console.log("\n  Distributions:");
  console.log(`  Seller received:      $${fmt(sellerNetGain)} USDC`);
  console.log(`    (payout $${fmt(sellerPayout)} + bond $${fmt(sellerBond)} returned)`);
  console.log(`    payout = $${fmt(CARD_PRICE)} card - $${fmt(platformFee)} platform - $${fmt(creatorFee)} creator - $${fmt(LABEL_A_COST)} Label A`);
  console.log(`  Fee recipient got:    $${fmt(feeBalAfter - feeBalBefore)} USDC`);
  console.log(`    (platform $${fmt(platformFee)} + creator $${fmt(creatorFee)} + auth $${fmt(AUTH_FEE)} + shipping $${fmt(SHIPPING_FEE)} + tax $${fmt(SALES_TAX)})`);

  const expectedFees      = platformFee + creatorFee + AUTH_FEE + SHIPPING_FEE + SALES_TAX;
  const expectedSellerNet = sellerPayout + sellerBond;

  console.log(`  Escrow remaining:     $${fmt(escrowBalFinal)} USDC (should be $0.00)`);

  console.log("\n  Verification:");
  console.log(`  Seller net correct:  ${sellerNetGain === expectedSellerNet ? `✓  $${fmt(sellerNetGain)}` : `✗  got $${fmt(sellerNetGain)}, expected $${fmt(expectedSellerNet)}`}`);
  console.log(`  Fees correct:        ${(feeBalAfter - feeBalBefore) === expectedFees ? `✓  $${fmt(feeBalAfter - feeBalBefore)}` : `✗  got $${fmt(feeBalAfter - feeBalBefore)}, expected $${fmt(expectedFees)}`}`);
  console.log(`  Escrow empty:        ${escrowBalFinal === 0n ? "✓  $0.00" : `✗  $${fmt(escrowBalFinal)} remaining`}`);
  const totalIn  = escrowAmount + sellerBond;
  const totalOut = sellerNetGain + (feeBalAfter - feeBalBefore);
  console.log(`  Total in = total out: ${totalIn === totalOut ? `✓  $${fmt(totalIn)}` : `✗  in $${fmt(totalIn)} vs out $${fmt(totalOut)}`}`);

  console.log("\n" + "═".repeat(60));
  console.log("  TESTNET FLOW COMPLETE");
  console.log("═".repeat(60));
  console.log(`\n  View on BaseScan:`);
  console.log(`  https://sepolia.basescan.org/address/${ESCROW_ADDRESS}`);
  console.log(`  https://sepolia.basescan.org/address/${USDC_ADDRESS}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
