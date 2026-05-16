/**
 * Chase Hollow — Escrow contract helpers (frontend)
 *
 * ESCROW_ADDRESS and USDC_ADDRESS are set via env vars so that
 * switching from testnet → mainnet requires only an env var change.
 *
 * Testnet (Base Sepolia):
 *   NEXT_PUBLIC_ESCROW_ADDRESS = 0xdA2a50d6EcC7DCc579DAF3aa306bb42Af2d09ba4
 *   NEXT_PUBLIC_USDC_ADDRESS   = 0x20999D752c6C19094230206426e952bC64eE0DfC  (MockUSDC)
 *
 * Mainnet (Base):
 *   NEXT_PUBLIC_ESCROW_ADDRESS = <deployed address>
 *   NEXT_PUBLIC_USDC_ADDRESS   = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913  (native USDC)
 */

export const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_ADDRESS
export const USDC_ADDRESS   = process.env.NEXT_PUBLIC_USDC_ADDRESS

// Bond rates by seller tier (bps)
export const BOND_BPS = {
  new:     400,
  trusted: 300,
  pro:     200,
  elite:   100,
  legend:  100,
}

// Bond floor in USDC (whole dollars — matches tier_config.min_bond_floor_usd default)
export const BOND_FLOOR_USD = 20

/** Compute seller bond in USDC whole-number dollars (for display and contract call) */
export function calcSellerBond(cardPrice, sellerTier) {
  const bps = BOND_BPS[sellerTier] ?? BOND_BPS.new
  return BOND_FLOOR_USD + (cardPrice * bps / 10000)
}

// Minimal ABI — only the functions checkout needs
export const USDC_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
]

export const ESCROW_ABI = [
  'function fundOrder(bytes32,address,address,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256) external',
  'function confirmOrder(bytes32) external',
  'function markDelivered(bytes32 orderId) external',
  'function releaseEscrow(bytes32 orderId) external',
  'function openDispute(bytes32 orderId) external',
  'function platformFeeBps() view returns (uint256)',
  'function creatorFeeBps() view returns (uint256)',
]

/**
 * Server-side helper — calls markDelivered on-chain as operator.
 * Safe to call from any API route. Silently no-ops if env vars are missing
 * or if onchainOrderId is null (pre-Phase-3 orders).
 */
export async function callMarkDelivered(onchainOrderId) {
  if (!onchainOrderId) return
  const rpc         = process.env.ALCHEMY_RPC_URL
  const escrowAddr  = process.env.NEXT_PUBLIC_ESCROW_ADDRESS
  const operatorKey = process.env.OPERATOR_PRIVATE_KEY
  if (!rpc || !escrowAddr || !operatorKey) return

  try {
    const { ethers } = await import('ethers')
    const provider = new ethers.JsonRpcProvider(rpc)
    const wallet   = new ethers.Wallet(operatorKey, provider)
    const escrow   = new ethers.Contract(escrowAddr, ['function markDelivered(bytes32 orderId) external'], wallet)
    const tx = await escrow.markDelivered(onchainOrderId)
    await tx.wait()
  } catch (err) {
    console.error('[escrow] callMarkDelivered failed:', err.message)
  }
}

/**
 * Server-side helper — calls releaseEscrow on-chain as operator.
 * Returns { ok, txHash, error }. Caller must inspect `ok` before mutating DB —
 * a chain failure must NOT silently lead to a DB-marked-released order.
 */
export async function callReleaseEscrow(onchainOrderId) {
  if (!onchainOrderId)   return { ok: false, error: 'Missing onchain_order_id' }
  const rpc         = process.env.ALCHEMY_RPC_URL
  const escrowAddr  = process.env.NEXT_PUBLIC_ESCROW_ADDRESS
  const operatorKey = process.env.OPERATOR_PRIVATE_KEY
  if (!rpc || !escrowAddr || !operatorKey) {
    return { ok: false, error: 'Missing ALCHEMY_RPC_URL, NEXT_PUBLIC_ESCROW_ADDRESS, or OPERATOR_PRIVATE_KEY' }
  }

  try {
    const { ethers } = await import('ethers')
    const provider = new ethers.JsonRpcProvider(rpc)
    const wallet   = new ethers.Wallet(operatorKey, provider)
    const escrow   = new ethers.Contract(escrowAddr, ['function releaseEscrow(bytes32 orderId) external'], wallet)
    const tx = await escrow.releaseEscrow(onchainOrderId, { gasLimit: 300000n })
    const receipt = await tx.wait()
    if (!receipt || receipt.status === 0) {
      return { ok: false, error: 'Transaction reverted', txHash: tx.hash }
    }
    return { ok: true, txHash: tx.hash }
  } catch (err) {
    console.error('[escrow] callReleaseEscrow failed:', err.message)
    return { ok: false, error: err.message }
  }
}
