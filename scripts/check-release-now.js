const { ethers } = require("ethers");
require("dotenv").config({ path: ".env.local" });

const ONCHAIN_ORDER_ID = "0x21c46238ec991771207632e3ebfaeaf01c26df14b38437657f24716f91cce661";

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_RPC_URL);
  const escrow = new ethers.Contract(
    process.env.NEXT_PUBLIC_ESCROW_ADDRESS,
    [
      "function isAutoReleaseReady(bytes32 orderId) view returns (bool)",
      "function getOrder(bytes32 orderId) view returns (tuple(address buyer, address seller, address creator, uint256 escrowAmount, uint256 sellerBond, uint256 sellerBondRequired, uint256 platformFee, uint256 creatorFee, uint256 authFee, uint256 shippingFee, uint256 salesTax, uint256 sellerPayout, uint8 status, uint256 fundedAt, uint256 deliveredAt, uint256 autoReleaseAt))",
      "function buyerInspectWindow() view returns (uint256)"
    ],
    provider
  );

  const ready = await escrow.isAutoReleaseReady(ONCHAIN_ORDER_ID);
  const order = await escrow.getOrder(ONCHAIN_ORDER_ID);
  const window = await escrow.buyerInspectWindow();
  const now = Math.floor(Date.now() / 1000);

  console.log("isAutoReleaseReady:", ready);
  console.log("status:", order.status.toString()); // 3 = Delivered
  console.log("autoReleaseAt:", order.autoReleaseAt.toString(), "vs now:", now);
  console.log("diff (now - autoReleaseAt):", now - Number(order.autoReleaseAt), "seconds");
  console.log("buyerInspectWindow:", window.toString(), "seconds");
}

main().catch(console.error);
