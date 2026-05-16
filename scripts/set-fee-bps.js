/**
 * Set platform and creator fee basis points on the deployed ChaseHollowEscrow contract.
 *
 * Fees are ADDITIVE — total charged to seller = platformFeeBps + creatorFeeBps
 *   Business design: 3.5% total = 300 (platform) + 50 (creator)
 *   Creator order:    3% → Safe,  0.5% → creator wallet
 *   No-creator order: 3.5% → Safe (0.5% creator slot also flows to Safe)
 *
 * Testnet:  deployer key in .env.contracts is the owner — run directly.
 * Mainnet:  after transferOwnership to Safe, use Safe Transaction Builder instead.
 *
 * Usage:
 *   npx hardhat run scripts/set-fee-bps.js --network baseSepolia
 */

const { ethers } = require('hardhat')
require('dotenv').config({ path: '.env.local' })   // loads NEXT_PUBLIC_ESCROW_ADDRESS

// ── Target values ─────────────────────────────────────────────────────────────
const PLATFORM_FEE_BPS = 300   // 3%   → Chase Hollow (Safe)
const CREATOR_FEE_BPS  =  50   // 0.5% → creator (or Safe if no creator)
// Total: 350 bps = 3.5%

async function main() {
  const contractAddress = process.env.NEXT_PUBLIC_ESCROW_ADDRESS
  if (!contractAddress) throw new Error('NEXT_PUBLIC_ESCROW_ADDRESS not set in .env.local')

  const [signer] = await ethers.getSigners()
  console.log(`Signer:   ${signer.address}`)
  console.log(`Contract: ${contractAddress}`)

  const escrow = await ethers.getContractAt('ChaseHollowEscrow', contractAddress, signer)

  // Confirm signer is the owner
  const owner = await escrow.owner()
  console.log(`Owner:    ${owner}`)
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`Signer is NOT the contract owner.\nOwner: ${owner}\nSigner: ${signer.address}\nAdd the owner private key as DEPLOYER_PRIVATE_KEY in .env.contracts`)
  }

  // Read current values
  const cp = Number(await escrow.platformFeeBps())
  const cc = Number(await escrow.creatorFeeBps())
  console.log(`\nCurrent: platformFeeBps=${cp} (${cp/100}%) + creatorFeeBps=${cc} (${cc/100}%) = total ${(cp+cc)/100}%`)
  console.log(`Target:  platformFeeBps=${PLATFORM_FEE_BPS} (${PLATFORM_FEE_BPS/100}%) + creatorFeeBps=${CREATOR_FEE_BPS} (${CREATOR_FEE_BPS/100}%) = total ${(PLATFORM_FEE_BPS+CREATOR_FEE_BPS)/100}%`)

  if (cp === PLATFORM_FEE_BPS && cc === CREATOR_FEE_BPS) {
    console.log('\n✓ Already at target values — no change needed.')
    return
  }

  const tx = await escrow.setFeeBps(PLATFORM_FEE_BPS, CREATOR_FEE_BPS)
  console.log(`\nTx sent: ${tx.hash}`)
  const receipt = await tx.wait()

  if (!receipt || receipt.status === 0) {
    throw new Error(`Transaction REVERTED. Check tx: ${tx.hash}`)
  }
  console.log('✓ setFeeBps confirmed')

  // Verify on-chain
  const np = Number(await escrow.platformFeeBps())
  const nc = Number(await escrow.creatorFeeBps())
  console.log(`\nVerified: platformFeeBps=${np} (${np/100}%) + creatorFeeBps=${nc} (${nc/100}%) = total ${(np+nc)/100}%`)

  if (np !== PLATFORM_FEE_BPS || nc !== CREATOR_FEE_BPS) {
    throw new Error('On-chain values do not match target after tx — check the transaction')
  }
  console.log('✓ On-chain values match target')
}

main().catch(e => { console.error('\n' + e.message); process.exit(1) })
