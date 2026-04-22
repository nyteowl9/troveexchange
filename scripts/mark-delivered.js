const { ethers } = require("ethers")
require("dotenv").config({ path: ".env.contracts" })

const ESCROW_ADDRESS   = "0xdA2a50d6EcC7DCc579DAF3aa306bb42Af2d09ba4"
const ONCHAIN_ORDER_ID = process.argv[2] || "0x2397f3b7f91a01a1fd7077b4a204ddd9ea6b156e2d6cb99fe3bc70e885d525fc"

async function main() {
  const rpc         = process.env.ALCHEMY_BASE_SEPOLIA
  const operatorKey = process.env.OPERATOR_PRIVATE_KEY
  if (!rpc || !operatorKey) throw new Error("Missing ALCHEMY_BASE_SEPOLIA or OPERATOR_PRIVATE_KEY in .env.contracts")

  const provider = new ethers.JsonRpcProvider(rpc)
  const wallet   = new ethers.Wallet(operatorKey, provider)
  console.log(`Operator: ${wallet.address}`)

  const escrow = new ethers.Contract(
    ESCROW_ADDRESS,
    ["function markDelivered(bytes32 orderId) external"],
    wallet
  )

  console.log(`Calling markDelivered for order ${ONCHAIN_ORDER_ID}...`)
  const tx = await escrow.markDelivered(ONCHAIN_ORDER_ID, { gasLimit: 100000n })
  const receipt = await tx.wait()
  if (receipt.status === 0) throw new Error("Transaction reverted on-chain")
  console.log(`Done. Tx: ${tx.hash}`)
}

main().catch(console.error)
