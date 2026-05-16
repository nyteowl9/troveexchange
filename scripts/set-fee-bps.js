/**
 * Set platform and creator fee basis points on the deployed ChaseHollowEscrow contract.
 *
 * Testnet: run with the deployer/operator key (same wallet that deployed).
 * Mainnet: ownership should be transferred to Safe multisig before launch —
 *          use Safe Transaction Builder to call setFeeBps instead.
 *
 * Usage:
 *   npx hardhat run scripts/set-fee-bps.js --network baseSepolia
 */

const { ethers } = require('hardhat')
require('dotenv').config({ path: '.env.local' })   // escrow address lives here

// ── Target values ─────────────────────────────────────────────────────────────
const PLATFORM_FEE_BPS = 350   // 3.5%  (was 300 = 3% at deploy time)
const CREATOR_FEE_BPS  =  50   // 0.5%  (unchanged)

async function main() {
  const contractAddress = process.env.NEXT_PUBLIC_ESCROW_ADDRESS
  if (!contractAddress) throw new Error('NEXT_PUBLIC_ESCROW_ADDRESS not set in .env')

  const [signer] = await ethers.getSigners()
  console.log(`Signer:   ${signer.address}`)
  console.log(`Contract: ${contractAddress}`)

  const escrow = await ethers.getContractAt('ChaseHollowEscrow', contractAddress, signer)

  // Read current values
  const currentPlatform = await escrow.platformFeeBps()
  const currentCreator  = await escrow.creatorFeeBps()
  const cp = Number(currentPlatform)
  const cc = Number(currentCreator)
  console.log(`\nCurrent: platformFeeBps=${cp} (${cp / 100}%) · creatorFeeBps=${cc} (${cc / 100}%)`)
  console.log(`Target:  platformFeeBps=${PLATFORM_FEE_BPS} (${PLATFORM_FEE_BPS / 100}%) · creatorFeeBps=${CREATOR_FEE_BPS} (${CREATOR_FEE_BPS / 100}%)`)

  if (cp === PLATFORM_FEE_BPS && cc === CREATOR_FEE_BPS) {
    console.log('\n✓ Already at target values — no change needed.')
    return
  }

  const tx = await escrow.setFeeBps(PLATFORM_FEE_BPS, CREATOR_FEE_BPS)
  console.log(`\nTx sent: ${tx.hash}`)
  await tx.wait()
  console.log('✓ setFeeBps confirmed')

  // Verify
  const newPlatform = Number(await escrow.platformFeeBps())
  const newCreator  = Number(await escrow.creatorFeeBps())
  console.log(`\nVerified: platformFeeBps=${newPlatform} (${newPlatform/100}%) · creatorFeeBps=${newCreator} (${newCreator/100}%)`)
}

main().catch(e => { console.error(e); process.exit(1) })
