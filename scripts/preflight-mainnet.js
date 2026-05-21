/**
 * Mainnet deploy preflight check — NO TRANSACTIONS, NO GAS SPENT.
 *
 * Validates that everything in .env.contracts is set correctly and the
 * deployer wallet is funded before you actually run deploy.js.
 *
 * Usage:
 *   npx hardhat run scripts/preflight-mainnet.js --network base
 */

const { ethers, network } = require('hardhat')

const BASE_USDC_MAINNET = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

function assertAddress(name, value) {
  if (!value || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    return `❌ ${name} — missing or invalid (got: ${value || '<empty>'})`
  }
  return `✓ ${name} = ${value}`
}

async function main() {
  console.log('='.repeat(60))
  console.log(`Chase Hollow — Mainnet Deploy Preflight (${network.name})`)
  console.log('='.repeat(60))

  let errors = 0

  if (network.name !== 'base') {
    console.log(`❌ Network must be 'base' (mainnet). Got: ${network.name}`)
    console.log('   Run with: npx hardhat run scripts/preflight-mainnet.js --network base')
    process.exit(1)
  }

  // ── 1. Env var presence + format ────────────────────────────────────────
  console.log('\n[1/4] Env var checks:')
  const checks = [
    ['MAINNET_FEE_RECIPIENT',    process.env.MAINNET_FEE_RECIPIENT],
    ['MAINNET_GUARDIAN',         process.env.MAINNET_GUARDIAN],
    ['MAINNET_GUARDIAN2',        process.env.MAINNET_GUARDIAN2],
    ['MAINNET_OPERATOR',         process.env.MAINNET_OPERATOR],
    ['MAINNET_DISPUTE_RESOLVER', process.env.MAINNET_DISPUTE_RESOLVER],
  ]
  for (const [name, val] of checks) {
    const result = assertAddress(name, val)
    console.log('  ' + result)
    if (result.startsWith('❌')) errors++
  }

  // ── 2. Sanity rules ─────────────────────────────────────────────────────
  console.log('\n[2/4] Sanity rules:')
  const G1 = process.env.MAINNET_GUARDIAN?.toLowerCase()
  const G2 = process.env.MAINNET_GUARDIAN2?.toLowerCase()
  if (G1 && G2 && G1 === G2) {
    console.log('  ❌ G1 and G2 are the same address — must be different')
    errors++
  } else if (G1 && G2) {
    console.log('  ✓ G1 ≠ G2 (separate guardian wallets)')
  }

  const operator        = process.env.MAINNET_OPERATOR?.toLowerCase()
  const disputeResolver = process.env.MAINNET_DISPUTE_RESOLVER?.toLowerCase()
  if (operator && disputeResolver) {
    if (operator === disputeResolver) {
      console.log('  ⚠ Operator and Dispute Resolver are the same wallet (intentional per project notes)')
    } else {
      console.log('  ✓ Operator and Dispute Resolver are different wallets')
    }
  }

  // ── 3. Deployer wallet ──────────────────────────────────────────────────
  console.log('\n[3/4] Deployer wallet:')
  let signer
  try {
    [signer] = await ethers.getSigners()
    const bal = await ethers.provider.getBalance(signer.address)
    const balEth = parseFloat(ethers.formatEther(bal))
    console.log(`  Address: ${signer.address}`)
    console.log(`  Balance: ${balEth.toFixed(6)} ETH on Base mainnet`)

    if (balEth < 0.005) {
      console.log('  ❌ Balance too low — recommend at least 0.01 ETH for deploy + verification gas')
      errors++
    } else if (balEth < 0.01) {
      console.log('  ⚠ Balance is below the recommended 0.01 ETH. Should be enough, but cutting it close.')
    } else {
      console.log('  ✓ Balance is sufficient for deploy')
    }

    if (operator && signer.address.toLowerCase() === operator) {
      console.log('  ❌ Deployer is the SAME wallet as MAINNET_OPERATOR — must be separate')
      errors++
    }

    if (G1 && signer.address.toLowerCase() === G1) {
      console.log('  ❌ Deployer is the SAME wallet as MAINNET_GUARDIAN — must be separate')
      errors++
    }
    if (G2 && signer.address.toLowerCase() === G2) {
      console.log('  ❌ Deployer is the SAME wallet as MAINNET_GUARDIAN2 — must be separate')
      errors++
    }
  } catch (e) {
    console.log(`  ❌ Could not load deployer: ${e.message}`)
    console.log('     Check DEPLOYER_PRIVATE_KEY and ALCHEMY_BASE_MAINNET in .env.contracts')
    errors++
  }

  // ── 4. Real Base USDC reachability ──────────────────────────────────────
  console.log('\n[4/4] Real Base USDC reachability:')
  try {
    const usdc = await ethers.getContractAt(
      ['function symbol() view returns (string)', 'function decimals() view returns (uint8)'],
      BASE_USDC_MAINNET
    )
    const sym = await usdc.symbol()
    const dec = await usdc.decimals()
    console.log(`  ✓ Contract at ${BASE_USDC_MAINNET} responds (symbol=${sym}, decimals=${dec})`)
    if (sym !== 'USDC') {
      console.log(`  ⚠ Symbol mismatch (expected USDC, got ${sym}) — verify this is actually USDC`)
    }
  } catch (e) {
    console.log(`  ❌ Could not read USDC at ${BASE_USDC_MAINNET}: ${e.message}`)
    console.log('     Check ALCHEMY_BASE_MAINNET RPC URL — may be wrong or not Base mainnet')
    errors++
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60))
  if (errors === 0) {
    console.log('✅ PREFLIGHT PASSED — ready to deploy')
    console.log('\nNext: npx hardhat run scripts/deploy.js --network base')
  } else {
    console.log(`❌ ${errors} ERROR(S) — fix before running deploy.js`)
    process.exit(1)
  }
  console.log('='.repeat(60))
}

main().catch(e => { console.error(e); process.exit(1) })
