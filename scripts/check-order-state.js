/**
 * Reads the on-chain state of an order from ChaseHollowEscrow.
 * Useful for diagnosing why releaseEscrow / markDelivered / refundBuyer revert.
 *
 * The on-chain order ID is a random bytes32 (generated at checkout via
 * ethers.randomBytes(32)) and stored in orders.onchain_order_id in Supabase.
 * It is NOT derived from the UUID order.id. Pass the bytes32 directly.
 *
 * Get it from Supabase:
 *   SELECT onchain_order_id FROM orders WHERE id = '<uuid>';
 *
 * Usage:
 *   node scripts/check-order-state.js 0x<onchain_order_id-bytes32>
 */
require('dotenv').config({ path: '.env.local' })
const { ethers } = require('ethers')

const STATUS_NAMES = [
  'AwaitingConfirmation',  // 0
  'Active',                // 1
  'Delivered',             // 2
  'Released',              // 3
  'Disputed',              // 4
  'RefundedToBuyer',       // 5
  'Cancelled',             // 6
]

const ABI = [
  'function orders(bytes32) view returns (address buyer, address seller, address creator, uint256 escrowAmount, uint256 sellerBond, uint256 sellerBondRequired, uint256 platformFee, uint256 creatorFee, uint256 authFee, uint256 shippingFee, uint256 salesTax, uint256 sellerPayout, uint8 status, uint256 fundedAt, uint256 deliveredAt, uint256 autoReleaseAt)',
  'function isOperator(address) view returns (bool)',
  'function isDisputeResolver(address) view returns (bool)',
  'function owner() view returns (address)',
]

async function main() {
  const onchainOrderId = process.argv[2]
  if (!onchainOrderId || !onchainOrderId.startsWith('0x') || onchainOrderId.length !== 66) {
    console.error('Usage: node scripts/check-order-state.js 0x<bytes32>')
    console.error('Get the bytes32 from Supabase: SELECT onchain_order_id FROM orders WHERE id = \'<uuid>\';')
    process.exit(1)
  }

  const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_RPC_URL)
  const escrow   = new ethers.Contract(process.env.NEXT_PUBLIC_ESCROW_ADDRESS, ABI, provider)

  console.log(`\nContract:        ${process.env.NEXT_PUBLIC_ESCROW_ADDRESS}`)
  console.log(`onchain_order_id: ${onchainOrderId}\n`)

  const order = await escrow.orders(onchainOrderId)

  if (order.buyer === ethers.ZeroAddress) {
    console.log('❌ Order does NOT exist on chain (buyer is zero address)')
    return
  }

  console.log('On-chain order state:')
  console.log(`  buyer:        ${order.buyer}`)
  console.log(`  seller:       ${order.seller}`)
  console.log(`  escrow:       ${ethers.formatUnits(order.escrowAmount, 6)} USDC`)
  console.log(`  status:       ${order.status} (${STATUS_NAMES[order.status] || '?'})`)
  console.log(`  fundedAt:     ${order.fundedAt > 0n ? new Date(Number(order.fundedAt) * 1000).toISOString() : '—'}`)
  console.log(`  confirmedAt:  ${order.confirmedAt > 0n ? new Date(Number(order.confirmedAt) * 1000).toISOString() : '—'}`)
  console.log(`  deliveredAt:  ${order.deliveredAt > 0n ? new Date(Number(order.deliveredAt) * 1000).toISOString() : '—'}`)

  // Check operator wallet authorization
  const opKey = process.env.OPERATOR_PRIVATE_KEY
  if (opKey) {
    const opAddr = new ethers.Wallet(opKey).address
    const isOp = await escrow.isOperator(opAddr)
    console.log(`\nOperator wallet: ${opAddr}`)
    console.log(`isOperator:      ${isOp ? '✓ yes' : '❌ NO — not authorized to call markDelivered'}`)
    const bal = await provider.getBalance(opAddr)
    console.log(`ETH balance:     ${ethers.formatEther(bal)} ETH`)
  }

  console.log()
  // Diagnosis
  if (order.status === 1n) {
    console.log('💡 Order is Active on-chain. To release, markDelivered() must be called first.')
    console.log('   If your webhook handler calls callMarkDelivered() but the state is still Active,')
    console.log('   the markDelivered tx is reverting (operator not authorized, or already in another state).')
  } else if (order.status === 2n) {
    console.log('✅ Order is Delivered. releaseEscrow() by buyer should succeed.')
  } else if (order.status === 3n) {
    console.log('✅ Order already Released.')
  }
}

main().catch(e => { console.error(e); process.exit(1) })
