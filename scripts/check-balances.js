const USDC     = "0x20999D752c6C19094230206426e952bC64eE0DfC"
const ESCROW   = "0xdA2a50d6EcC7DCc579DAF3aa306bb42Af2d09ba4"

const WALLETS = {
  "Buyer":         "0x332Ba86020aDED718Ce07ea2181c259EE7122f7e",
  "Seller":        "0x1B35Ac1eAC85844A738A406D4A4cF850B5614363",
  "Creator":       "0xf91dda9227e3593e9336aeed081a90cd81aa136f",
  "Fee Recipient": "0xE39a2128b7CeA98992E59ae3a7Ab2669E5801983",
  "Escrow":        ESCROW,
}

async function main() {
  const usdc = await ethers.getContractAt(
    ["function balanceOf(address) view returns (uint256)"],
    USDC
  )

  console.log("\n── USDC Balances ──────────────────────────────")
  for (const [name, addr] of Object.entries(WALLETS)) {
    const bal = await usdc.balanceOf(addr)
    console.log(`${name.padEnd(16)} ${addr}  $${(Number(bal) / 1_000_000).toFixed(2)}`)
  }
  console.log("───────────────────────────────────────────────\n")
}

main().catch(console.error)
