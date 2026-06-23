/**
 * Read-only launch-readiness check for the live Base mainnet contract.
 * NO TRANSACTIONS, NO GAS. Reads owner, fees, operator/resolver auth,
 * pause state, and key params, and compares them to deployments/base.json.
 *
 * Uses ALCHEMY_BASE_MAINNET from .env.contracts (mainnet RPC).
 *
 * Usage:
 *   node scripts/check-mainnet-config.js
 */
require('dotenv').config({ path: '.env.contracts' })
const { ethers } = require('ethers')
const fs = require('fs')
const path = require('path')

const dep = JSON.parse(fs.readFileSync(path.join(__dirname, '../deployments/base.json')))

const ABI = [
  'function owner() view returns (address)',
  'function pendingOwner() view returns (address)',
  'function paused() view returns (bool)',
  'function platformFeeBps() view returns (uint256)',
  'function creatorFeeBps() view returns (uint256)',
  'function feeRecipient() view returns (address)',
  'function isOperator(address) view returns (bool)',
  'function isDisputeResolver(address) view returns (bool)',
  'function isGuardian(address) view returns (bool)',
  'function guardianCount() view returns (uint256)',
  'function maxOrderValue() view returns (uint256)',
  'function sellerShipDeadline() view returns (uint256)',
  'function buyerInspectWindow() view returns (uint256)',
  'function usdc() view returns (address)',
]

const eq = (a, b) => a && b && a.toLowerCase() === b.toLowerCase()
const ok = (c) => (c ? '✓' : '❌')

async function main() {
  const rpc = process.env.ALCHEMY_BASE_MAINNET
  if (!rpc) {
    console.error('❌ ALCHEMY_BASE_MAINNET not set in .env.contracts')
    process.exit(1)
  }
  const provider = new ethers.JsonRpcProvider(rpc)
  const net = await provider.getNetwork()
  console.log('='.repeat(64))
  console.log('Chase Hollow — Mainnet Contract Launch-Readiness Check')
  console.log('='.repeat(64))
  console.log(`Chain ID:   ${net.chainId} ${net.chainId === 8453n ? '(Base mainnet ✓)' : '❌ NOT Base mainnet'}`)
  console.log(`Contract:   ${dep.ChaseHollowEscrow}`)

  const c = new ethers.Contract(dep.ChaseHollowEscrow, ABI, provider)

  const [owner, pendingOwner, paused, pf, cf, feeRecip, usdc,
         isOp, isDr, gCount, maxVal, shipDl, inspWin] = await Promise.all([
    c.owner(), c.pendingOwner(), c.paused(), c.platformFeeBps(), c.creatorFeeBps(),
    c.feeRecipient(), c.usdc(),
    c.isOperator(dep.operator), c.isDisputeResolver(dep.disputeResolver),
    c.guardianCount(), c.maxOrderValue(), c.sellerShipDeadline(), c.buyerInspectWindow(),
  ])

  const g1 = await c.isGuardian(dep.guardian)
  const g2 = await c.isGuardian(dep.guardian2)

  console.log('\n── Ownership ─────────────────────────────────────────')
  console.log(`  owner:          ${owner}`)
  console.log(`  pendingOwner:   ${pendingOwner === ethers.ZeroAddress ? '— (none)' : pendingOwner}`)
  console.log(`  deployer:       ${dep.deployer}`)
  const ownedByDeployer = eq(owner, dep.deployer)
  console.log(`  ${ownedByDeployer ? '⚠' : '✓'} owner is ${ownedByDeployer ? 'STILL THE BURNER DEPLOYER — transfer to Safe before real volume' : 'NOT the deployer (transferred)'}`)

  console.log('\n── Fees ──────────────────────────────────────────────')
  console.log(`  ${ok(pf === 300n)} platformFeeBps = ${pf} (want 300)`)
  console.log(`  ${ok(cf === 50n)} creatorFeeBps  = ${cf} (want 50)  → total ${(Number(pf) + Number(cf)) / 100}%`)
  console.log(`  ${ok(eq(feeRecip, dep.feeRecipient))} feeRecipient   = ${feeRecip}`)

  console.log('\n── Roles ─────────────────────────────────────────────')
  console.log(`  ${ok(isOp)} operator authorized:        ${dep.operator}`)
  console.log(`  ${ok(isDr)} disputeResolver authorized: ${dep.disputeResolver}`)
  console.log(`  ${ok(g1)} guardian 1:  ${dep.guardian}`)
  console.log(`  ${ok(g2)} guardian 2:  ${dep.guardian2}`)
  console.log(`  guardianCount = ${gCount}`)

  console.log('\n── State & params ────────────────────────────────────')
  console.log(`  ${ok(!paused)} paused = ${paused}`)
  console.log(`  ${ok(eq(usdc, dep.USDC))} usdc = ${usdc}`)
  console.log(`  maxOrderValue       = ${ethers.formatUnits(maxVal, 6)} USDC`)
  console.log(`  sellerShipDeadline  = ${Number(shipDl) / 3600} hrs`)
  console.log(`  buyerInspectWindow  = ${Number(inspWin) / 3600} hrs`)
  console.log('='.repeat(64))
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
