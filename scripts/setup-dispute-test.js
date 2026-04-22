/**
 * Sets up a dispute walkthrough test:
 *   1. Creates a Supabase listing + order with status=inspection_window
 *   2. Funds + confirms + marks delivered on Base Sepolia testnet
 *
 * After running:
 *   - Log in as buyer (powertrade10k@gmail.com) at /buyer-dashboard
 *   - Go to Disputes tab → raise a dispute on this order
 *   - Log in as staff at /dispute-resolution → recommend outcome
 *   - Log in as owner → execute final decision
 *
 * Usage:
 *   node scripts/setup-dispute-test.js
 *
 * Reads .env.local (Supabase) and .env.contracts (chain keys)
 */

require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env.contracts' })

const { createClient } = require('@supabase/supabase-js')
const { ethers }       = require('ethers')
const fs               = require('fs')
const path             = require('path')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const deployment  = JSON.parse(fs.readFileSync(path.join(__dirname, '../deployments/baseSepolia.json')))
const USDC_ADDR   = deployment.MockUSDC
const ESCROW_ADDR = deployment.ChaseHollowEscrow

const USDC_ABI = [
  'function mint(address to, uint256 amount) external',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
]
const ESCROW_ABI = [
  'function fundOrder(bytes32,address,address,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256) external',
  'function confirmOrder(bytes32) external',
  'function markDelivered(bytes32) external',
  'function isOperator(address) view returns (bool)',
  'function addOperator(address) external',
  'function platformFeeBps() view returns (uint256)',
  'function creatorFeeBps() view returns (uint256)',
]

const u   = n => ethers.parseUnits(String(n), 6)
const fmt = bn => ethers.formatUnits(bn, 6)

const BUYER_EMAIL  = 'powertrade10k@gmail.com'
const SELLER_EMAIL = 'cryptofittrader@gmail.com'

async function main() {
  console.log('── Dispute test setup ─────────────────────────────────────')

  // ── 1. Look up users ──────────────────────────────────────────────────────
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id, email, full_name, wallet_address, street1, city, state, zip')
    .in('email', [BUYER_EMAIL, SELLER_EMAIL])

  if (usersErr) throw new Error('Could not fetch users: ' + usersErr.message)
  const buyer  = users.find(u => u.email === BUYER_EMAIL)
  const seller = users.find(u => u.email === SELLER_EMAIL)
  if (!buyer)  throw new Error(`Buyer not found: ${BUYER_EMAIL}`)
  if (!seller) throw new Error(`Seller not found: ${SELLER_EMAIL}`)

  console.log(`Buyer:          ${buyer.full_name || buyer.email} (${buyer.id})`)
  console.log(`Buyer wallet:   ${buyer.wallet_address || '(none)'}`)
  console.log(`Seller:         ${seller.full_name || seller.email} (${seller.id})`)

  if (!buyer.wallet_address) throw new Error('Buyer has no wallet_address — connect wallet at /buyer-dashboard first')

  // ── 2. Create listing ─────────────────────────────────────────────────────
  const cardPrice = 197  // Tier 1 — under $300, remote auth
  const { data: listing, error: listErr } = await supabase
    .from('listings')
    .insert({
      seller_id:    seller.id,
      game:         'Pokémon',
      set:          'Base Set',
      card_name:    'Blastoise',
      card_number:  '2/102',
      grade:        '8',
      grader:       'PSA',
      cert_number:  '99887766',
      condition:    'Near Mint',
      listing_type: 'graded',
      price:        cardPrice,
      auth_tier:    'remote',
      photos:       [],
      status:       'sold',
      expires_at:   new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('id').single()

  if (listErr) throw new Error('Could not create listing: ' + listErr.message)
  console.log(`\nListing created: ${listing.id}`)

  // ── 3. Compute amounts (Tier 1) ───────────────────────────────────────────
  const authFee      = 10
  const shippingCost = 12  // single label cheapest rate estimate
  const platformFee  = parseFloat((cardPrice * 0.03).toFixed(2))
  const creatorFee   = parseFloat((cardPrice * 0.005).toFixed(2))
  const bondAmount   = parseFloat((20 + cardPrice * 0.04).toFixed(2))  // $20 floor + 4% new seller
  const escrowAmount = cardPrice + authFee + shippingCost

  // ── 4. Create DB order ────────────────────────────────────────────────────
  const now = new Date()
  const deliveredAt    = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()  // 2hrs ago
  const autoReleaseAt  = new Date(now.getTime() + 70 * 60 * 60 * 1000).toISOString() // ~70hrs from now

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      listing_id:      listing.id,
      buyer_id:        buyer.id,
      seller_id:       seller.id,
      auth_tier:       'remote',
      escrow_amount:   escrowAmount,
      platform_fee:    platformFee,
      creator_fee:     creatorFee,
      auth_fee:        authFee,
      bond_amount:     bondAmount,
      shipping_cost:   shippingCost,
      declared_value:  cardPrice,
      status:          'inspection_window',
      shipped_at:      new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      delivered_at:    deliveredAt,
      auto_release_at: autoReleaseAt,
    })
    .select('id').single()

  if (orderErr) throw new Error('Could not create order: ' + orderErr.message)
  console.log(`Order created:   ${order.id}`)
  console.log(`Status:          inspection_window`)
  console.log(`Auto-release:    ${autoReleaseAt}`)

  // ── 5. On-chain: fund + confirm + markDelivered ───────────────────────────
  console.log('\n── On-chain setup ─────────────────────────────────────────')

  const rpc         = process.env.ALCHEMY_BASE_SEPOLIA
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY
  const buyerKey    = process.env.BUYER_PRIVATE_KEY
  const sellerKey   = process.env.SELLER_PRIVATE_KEY

  if (!rpc || !deployerKey || !buyerKey || !sellerKey) {
    console.warn('⚠  Missing chain keys — skipping on-chain setup. Set DEPLOYER_PRIVATE_KEY, BUYER_PRIVATE_KEY, SELLER_PRIVATE_KEY, ALCHEMY_BASE_SEPOLIA in .env.contracts')
    console.log('\nDB order is ready. To fully test on-chain dispute:')
    console.log('  1. Manually update onchain_order_id in Supabase, or')
    console.log('  2. Add the missing keys to .env.contracts and re-run.')
    console.log('\nOrder ID:', order.id)
    return
  }

  const provider  = new ethers.JsonRpcProvider(rpc)
  const deployer  = new ethers.Wallet(deployerKey, provider)
  const buyerWal  = new ethers.Wallet(buyerKey,    provider)
  const sellerWal = new ethers.Wallet(sellerKey,   provider)

  console.log(`Deployer:  ${deployer.address}`)
  console.log(`Buyer:     ${buyerWal.address}`)
  console.log(`Seller:    ${sellerWal.address}`)

  if (buyerWal.address.toLowerCase() !== buyer.wallet_address?.toLowerCase()) {
    console.warn(`⚠  BUYER_PRIVATE_KEY address (${buyerWal.address}) doesn't match Supabase buyer wallet (${buyer.wallet_address})`)
    console.warn('   The buyer cannot call openDispute from the UI unless they match.')
  }

  const usdc       = new ethers.Contract(USDC_ADDR,   USDC_ABI,   deployer)
  const escrowDep  = new ethers.Contract(ESCROW_ADDR, ESCROW_ABI, deployer)
  const escrowBuy  = new ethers.Contract(ESCROW_ADDR, ESCROW_ABI, buyerWal)
  const escrowSell = new ethers.Contract(ESCROW_ADDR, ESCROW_ABI, sellerWal)
  const usdcBuy    = new ethers.Contract(USDC_ADDR,   USDC_ABI,   buyerWal)
  const usdcSell   = new ethers.Contract(USDC_ADDR,   USDC_ABI,   sellerWal)

  // Ensure deployer is operator
  const isOp = await escrowDep.isOperator(deployer.address)
  if (!isOp) {
    console.log('Registering operator...')
    await (await escrowDep.addOperator(deployer.address)).wait()
  }

  // Fetch on-chain fee bps to derive exact amounts
  const platformBps = await escrowDep.platformFeeBps()
  const creatorBps  = await escrowDep.creatorFeeBps()

  const CARD = u(cardPrice)
  const pfee = CARD * platformBps / 10000n
  const cfee = CARD * creatorBps  / 10000n
  const LABEL_A = u(0)   // Tier 1 — no Label A
  const spayout = CARD - pfee - cfee - LABEL_A
  const SHIPPING = u(shippingCost)
  const AUTH     = u(authFee)
  const TAX      = u(0)
  const ESCROW   = spayout + pfee + cfee + AUTH + SHIPPING + TAX
  const BOND     = u(20) + CARD * 400n / 10000n  // $20 floor + 4%

  const onchainOrderId = ethers.hexlify(ethers.randomBytes(32))
  console.log(`\nonchain_order_id: ${onchainOrderId}`)

  // Mint USDC
  console.log('\nMinting USDC...')
  await (await usdc.mint(buyerWal.address,  ESCROW + u(100))).wait()
  await (await usdc.mint(sellerWal.address, BOND   + u(100))).wait()
  console.log(`Buyer  USDC: $${fmt(await usdc.balanceOf(buyerWal.address))}`)
  console.log(`Seller USDC: $${fmt(await usdc.balanceOf(sellerWal.address))}`)

  // Fund order (buyer)
  console.log('\nFunding order (buyer)...')
  await (await usdcBuy.approve(ESCROW_ADDR, ESCROW)).wait()
  const fundTx = await escrowBuy.fundOrder(
    onchainOrderId, sellerWal.address, ethers.ZeroAddress,
    ESCROW, BOND, pfee, cfee, AUTH, SHIPPING, TAX, spayout,
    { gasLimit: 400000n }
  )
  await fundTx.wait()
  console.log(`fundOrder:    ${fundTx.hash}`)

  // Confirm + bond (seller)
  console.log('\nConfirming + posting bond (seller)...')
  await (await usdcSell.approve(ESCROW_ADDR, BOND)).wait()
  const confirmTx = await escrowSell.confirmOrder(onchainOrderId, { gasLimit: 200000n })
  await confirmTx.wait()
  console.log(`confirmOrder: ${confirmTx.hash}`)

  // markDelivered (operator) — leaves on-chain status at Delivered (2)
  console.log('\nMarking delivered (operator)...')
  const deliverTx = await escrowDep.markDelivered(onchainOrderId, { gasLimit: 150000n })
  await deliverTx.wait()
  console.log(`markDelivered: ${deliverTx.hash}`)
  console.log('On-chain status: Delivered (2) — buyer can now openDispute')

  // Save onchain_order_id to DB
  await supabase.from('orders').update({ onchain_order_id: onchainOrderId }).eq('id', order.id)
  console.log('\nonchain_order_id saved to DB ✓')

  console.log('\n── Done ────────────────────────────────────────────────────')
  console.log('Order ID (DB):    ', order.id)
  console.log('onchain_order_id: ', onchainOrderId)
  console.log('\nNext steps:')
  console.log('1. Log in as buyer (powertrade10k@gmail.com) at /buyer-dashboard')
  console.log('2. Go to Disputes tab → raise a dispute on this order')
  console.log('   (wallet must be connected — it calls openDispute on-chain)')
  console.log('3. Log in as staff → /dispute-resolution → recommend outcome')
  console.log('4. Log in as owner → execute final decision → resolveDispute fires on-chain')
  console.log(`\nBaseScan: https://sepolia.basescan.org/address/${ESCROW_ADDR}`)
}

main().catch(err => { console.error(err.message); process.exit(1) })
