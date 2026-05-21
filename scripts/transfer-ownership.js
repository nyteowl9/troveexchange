/**
 * Transfer ChaseHollowEscrow ownership to the Safe multisig.
 *
 * Run as the deployer (the current owner). After this completes, the burner
 * deployer wallet should be retired — it has no more privileges on the contract.
 *
 * Pre-requisites:
 *   - Contract is deployed (deployments/<network>.json exists)
 *   - Fee structure is set via scripts/set-fee-bps.js
 *   - MAINNET_FEE_RECIPIENT (the Safe address) is set in .env.contracts
 *
 * Usage:
 *   npx hardhat run scripts/transfer-ownership.js --network base
 */

const { ethers, network } = require('hardhat')
const fs = require('fs')
const path = require('path')

async function main() {
  const deploymentFile = path.join(__dirname, `../deployments/${network.name}.json`)
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`No deployment found at deployments/${network.name}.json`)
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'))

  const newOwner = process.env.MAINNET_FEE_RECIPIENT  // Safe address — same as feeRecipient
  if (!newOwner || !/^0x[a-fA-F0-9]{40}$/.test(newOwner)) {
    throw new Error('MAINNET_FEE_RECIPIENT must be set in .env.contracts (Safe multisig address)')
  }

  const [signer] = await ethers.getSigners()
  const escrow = await ethers.getContractAt('ChaseHollowEscrow', deployment.ChaseHollowEscrow, signer)

  const currentOwner = await escrow.owner()
  console.log(`Network:        ${network.name}`)
  console.log(`Contract:       ${deployment.ChaseHollowEscrow}`)
  console.log(`Signer:         ${signer.address}`)
  console.log(`Current owner:  ${currentOwner}`)
  console.log(`New owner:      ${newOwner} (Safe multisig)`)

  if (currentOwner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`Signer is NOT the current owner. Owner: ${currentOwner}, Signer: ${signer.address}`)
  }
  if (currentOwner.toLowerCase() === newOwner.toLowerCase()) {
    console.log('\n✓ Already owned by the target address — no change needed.')
    return
  }

  console.log('\n⚠  ABOUT TO TRANSFER OWNERSHIP — IRREVERSIBLE without Safe consensus to transfer back.')
  console.log('   Press Ctrl+C within 10 seconds to abort...')
  await new Promise(r => setTimeout(r, 10000))

  const tx = await escrow.transferOwnership(newOwner)
  console.log(`\nTx sent: ${tx.hash}`)
  const receipt = await tx.wait()
  if (!receipt || receipt.status === 0) {
    throw new Error('Transfer ownership tx REVERTED')
  }
  console.log('✓ Ownership transferred')

  // Verify
  const ownerAfter = await escrow.owner()
  console.log(`\nVerified new owner: ${ownerAfter}`)
  if (ownerAfter.toLowerCase() !== newOwner.toLowerCase()) {
    throw new Error('Owner mismatch after transfer')
  }
  console.log('\n✓ Done. Burner deployer is now retired.')
}

main().catch(e => { console.error('\n' + e.message); process.exit(1) })
