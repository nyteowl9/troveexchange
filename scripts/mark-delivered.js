const ESCROW_ADDRESS  = "0xdA2a50d6EcC7DCc579DAF3aa306bb42Af2d09ba4"
const ONCHAIN_ORDER_ID = "0x164a7251139a6b43a94adb5323d0279339e01d6bf976ed0de6200917d9de01dc"

async function main() {
  const [operator] = await ethers.getSigners()
  console.log(`Operator: ${operator.address}`)

  const escrow = await ethers.getContractAt(
    ["function markDelivered(bytes32 orderId) external"],
    ESCROW_ADDRESS
  )

  console.log(`Calling markDelivered for order ${ONCHAIN_ORDER_ID}...`)
  const tx = await escrow.markDelivered(ONCHAIN_ORDER_ID)
  await tx.wait()
  console.log(`Done. Tx: ${tx.hash}`)
}

main().catch(console.error)
