/**
 * Mints MockUSDC to any address on Base Sepolia testnet.
 * Usage: npx hardhat run scripts/mint-test-usdc.js --network baseSepolia
 *
 * Set RECIPIENT and AMOUNT below before running.
 */

const RECIPIENT = "0x1B35Ac1eAC85844A738A406D4A4cF850B5614363"
const AMOUNT_USD = 10000  // dollars to mint

const MOCK_USDC_ADDRESS = "0x20999D752c6C19094230206426e952bC64eE0DfC"

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const usdc = await ethers.getContractAt(
    ["function mint(address to, uint256 amount) external",
     "function balanceOf(address) view returns (uint256)"],
    MOCK_USDC_ADDRESS
  )

  const amount = BigInt(AMOUNT_USD) * 1_000_000n  // 6 decimals
  console.log(`Minting $${AMOUNT_USD} USDC to ${RECIPIENT}...`)
  const tx = await usdc.mint(RECIPIENT, amount)
  await tx.wait()

  const balance = await usdc.balanceOf(RECIPIENT)
  console.log(`Done. Balance: $${(Number(balance) / 1_000_000).toFixed(2)} USDC`)
}

main().catch(console.error)
