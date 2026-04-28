/**
 * Mints MockUSDC to any address on Base Sepolia testnet.
 * Usage: npx hardhat run scripts/mint-test-usdc.js --network baseSepolia
 *
 * Set RECIPIENT and AMOUNT below before running.
 */

const fs = require("fs"), path = require("path")
const dep = JSON.parse(fs.readFileSync(path.join(__dirname, "../deployments/baseSepolia.json")))

const AMOUNT_USD = 10000  // dollars per recipient

// Add any wallet addresses you're using for testing here
const RECIPIENTS = [
  "0x332Ba86020aDED718Ce07ea2181c259EE7122f7e",  // test buyer
  "0x1B35Ac1eAC85844A738A406D4A4cF850B5614363",  // test seller
]

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer:  ${deployer.address}`)
  console.log(`MockUSDC:  ${dep.MockUSDC}`)

  const usdc = await ethers.getContractAt(
    ["function mint(address to, uint256 amount) external",
     "function balanceOf(address) view returns (uint256)"],
    dep.MockUSDC
  )

  const amount = BigInt(AMOUNT_USD) * 1_000_000n
  for (const recipient of RECIPIENTS) {
    console.log(`\nMinting $${AMOUNT_USD} to ${recipient}...`)
    const tx = await usdc.mint(recipient, amount)
    await tx.wait()
    const bal = await usdc.balanceOf(recipient)
    console.log(`  Balance: $${(Number(bal) / 1_000_000).toFixed(2)} USDC`)
  }
  console.log("\nDone.")
}

main().catch(console.error)
