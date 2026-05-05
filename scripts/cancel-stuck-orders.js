// Run this AFTER 2026-05-06 17:59 UTC to cancel stuck test orders on-chain
// and return USDC to the buyer wallet.
//
// Usage: node scripts/cancel-stuck-orders.js

const { ethers } = require('ethers')

const RPC         = process.env.ALCHEMY_RPC_URL        || 'https://base-sepolia.g.alchemy.com/v2/fBBbFQjrjb72Fp8mpj5mB'
const ESCROW      = process.env.NEXT_PUBLIC_ESCROW_ADDRESS || '0x1962292C6a5ef10615B84E373a0c2A294fb1B162'
const OPERATOR_KEY = process.env.OPERATOR_PRIVATE_KEY   || '544e7ee2a40c31089ea39338a048ad385a3b10b972c1fff76cb63f8049d1d2d9'

const ORDERS = [
  { db_id: 'ea1abb09', onchain: '0x6f81c0fcc289b02292021eb513e9262cef0ef3d629eb9130ed3cd30f89357a6d', canCancelAfter: '2026-05-06T17:59:56Z' },
  { db_id: '29b16adf', onchain: '0xa0bccc81b747c4d2276ea0fba206875be63e9f4182c8f660d31a5beef1b55b50', canCancelAfter: '2026-05-06T16:14:48Z' },
]

const ABI = [
  'function cancelOrder(bytes32 orderId) external',
  'function getOrder(bytes32) external view returns (tuple(address buyer,address seller,address feeRecipient,address creatorWallet,uint256 escrowAmount,uint256 sellerBond,uint256 sellerBondRequired,uint256 platformFee,uint256 creatorFee,uint256 authFee,uint256 shippingFee,uint256 salesTax,uint256 sellerPayout,uint8 status,uint256 fundedAt,uint256 deliveredAt,uint256 autoReleaseAt))',
]

const STATUS = ['AwaitingConfirmation','Active','Delivered','Released','Disputed','RefundedToBuyer','Cancelled']

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC)
  const wallet   = new ethers.Wallet(OPERATOR_KEY, provider)
  const escrow   = new ethers.Contract(ESCROW, ABI, wallet)
  const now      = Math.floor(Date.now() / 1000)

  for (const o of ORDERS) {
    const order = await escrow.getOrder(o.onchain)
    console.log(`\n${o.db_id} — on-chain status: ${STATUS[order.status]}`)

    if (Number(order.status) >= 3) {
      console.log('  Already terminal — skip')
      continue
    }

    const windowExpires = Number(order.fundedAt) + 24 * 3600
    if (now < windowExpires) {
      const remaining = Math.ceil((windowExpires - now) / 60)
      console.log(`  Confirm window still open — try again in ${remaining} minutes`)
      continue
    }

    console.log(`  Cancelling — ${(Number(order.escrowAmount)/1e6).toFixed(2)} USDC returns to buyer ${order.buyer}`)
    const tx = await escrow.cancelOrder(o.onchain, { gasLimit: 200000n })
    console.log(`  Submitted: ${tx.hash}`)
    await tx.wait()
    console.log(`  Confirmed ✓`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
