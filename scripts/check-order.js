const ESCROW_ADDRESS   = "0xdA2a50d6EcC7DCc579DAF3aa306bb42Af2d09ba4"
const ONCHAIN_ORDER_ID = "0xb9a1f685198ebdf9bdeeee2deccae670b24f6e87cea613381fcafde266a779da"

const STATUS = ["AwaitingConfirmation", "Active", "Delivered", "Released", "Disputed", "RefundedToBuyer", "Cancelled"]

async function main() {
  const escrow = await ethers.getContractAt(
    ["function getOrder(bytes32) external view returns (address buyer, address seller, address creator, uint256 escrowAmount, uint256 sellerBond, uint256 sellerBondRequired, uint256 platformFee, uint256 creatorFee, uint256 authFee, uint256 shippingFee, uint256 salesTax, uint256 sellerPayout, uint8 status, uint256 fundedAt, uint256 deliveredAt, uint256 autoReleaseAt)"],
    ESCROW_ADDRESS
  )
  const o = await escrow.getOrder(ONCHAIN_ORDER_ID)
  console.log("buyer:        ", o.buyer)
  console.log("seller:       ", o.seller)
  console.log("status:       ", STATUS[Number(o.status)] ?? o.status.toString())
  console.log("autoReleaseAt:", Number(o.autoReleaseAt) === 0 ? "not set" : new Date(Number(o.autoReleaseAt) * 1000).toISOString())
}

main().catch(console.error)
