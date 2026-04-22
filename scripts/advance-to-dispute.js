/**
 * Advances an existing funded+confirmed order to Disputed state on-chain.
 * Use when the DB was updated manually (bypassing webhooks) and the contract
 * state needs to catch up: markDelivered → openDispute.
 *
 * Usage:
 *   node scripts/advance-to-dispute.js <onchain_order_id>
 *
 * Example:
 *   node scripts/advance-to-dispute.js 0x2397f3b7f91a01a1fd7077b4a204ddd9ea6b156e2d6cb99fe3bc70e885d525fc
 */

const { ethers } = require('ethers')
require('dotenv').config({ path: '.env.contracts' })

const ESCROW_ADDRESS = '0xdA2a50d6EcC7DCc579DAF3aa306bb42Af2d09ba4'

const ESCROW_ABI = [
  'function markDelivered(bytes32 orderId) external',
  'function openDispute(bytes32 orderId) external',
  'function orders(bytes32) view returns (address buyer, address seller, address creator, uint256 escrowAmount, uint256 sellerBond, uint256 sellerBondRequired, uint256 platformFee, uint256 creatorFee, uint256 authFee, uint256 shippingFee, uint256 salesTax, uint256 sellerPayout, uint8 status, uint256 fundedAt, uint256 deliveredAt, uint256 autoReleaseAt)',
]

async function main() {
  const orderId = process.argv[2]
  if (!orderId) {
    console.error('Usage: node scripts/advance-to-dispute.js <onchain_order_id>')
    process.exit(1)
  }

  const rpc         = process.env.ALCHEMY_BASE_SEPOLIA
  const operatorKey = process.env.OPERATOR_PRIVATE_KEY
  const buyerKey    = process.env.BUYER_PRIVATE_KEY

  if (!rpc || !operatorKey || !buyerKey) {
    throw new Error('Missing ALCHEMY_BASE_SEPOLIA, OPERATOR_PRIVATE_KEY, or BUYER_PRIVATE_KEY in .env.contracts')
  }

  const provider  = new ethers.JsonRpcProvider(rpc)
  const operator  = new ethers.Wallet(operatorKey, provider)
  const buyer     = new ethers.Wallet(buyerKey, provider)

  console.log(`Operator: ${operator.address}`)
  console.log(`Buyer:    ${buyer.address}`)
  console.log(`Order:    ${orderId}`)

  const escrowOp    = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, operator)
  const escrowBuyer = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, buyer)

  // Check current on-chain order status
  const order = await escrowOp.orders(orderId)
  console.log(`\nOn-chain status: ${order.status} (0=AwaitingConfirmation, 1=Active, 2=Delivered, 3=Released, 4=Disputed, 5=RefundedToBuyer, 6=Cancelled)`)

  // 0=AwaitingConfirmation, 1=Active, 2=Delivered, 3=Released, 4=Disputed, 5=RefundedToBuyer, 6=Cancelled
  if (order.status < 1n) {
    console.error('Order not confirmed on-chain yet — bond not posted.')
    process.exit(1)
  }
  if (order.status > 4n) {
    console.error(`Order already resolved on-chain (status ${order.status}) — cannot dispute.`)
    process.exit(1)
  }

  // Step 1: markDelivered (if not already delivered)
  if (order.status < 2n) {
    console.log('\nCalling markDelivered...')
    const tx = await escrowOp.markDelivered(orderId, { gasLimit: 150000n })
    const receipt = await tx.wait()
    if (receipt.status === 0) throw new Error('markDelivered reverted')
    console.log(`markDelivered tx: ${tx.hash}`)
  } else {
    console.log('\nmarkDelivered already done — skipping.')
  }

  // Step 2: openDispute (buyer)
  if (order.status < 4n) {
    console.log('\nCalling openDispute (as buyer)...')
    const tx = await escrowBuyer.openDispute(orderId, { gasLimit: 150000n })
    const receipt = await tx.wait()
    if (receipt.status === 0) throw new Error('openDispute reverted')
    console.log(`openDispute tx:   ${tx.hash}`)
  } else {
    console.log('\nopenDispute already done — skipping.')
  }

  console.log('\nDone. Order is now in Disputed state on-chain.')
  console.log('You can now execute resolveDispute from the dispute portal.')
}

main().catch(err => { console.error(err.message); process.exit(1) })
