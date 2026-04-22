const { expect } = require("chai");
const { ethers }  = require("hardhat");
const { time }    = require("@nomicfoundation/hardhat-network-helpers");

// ─── Helpers ────────────────────────────────────────────────────────────────

const D = 6; // USDC decimals
const u = (n) => ethers.parseUnits(n.toString(), D);

// Standard order parameters (listing price = 1000 USDC, remote auth $10)
// platformFeeBps = 300 (3%), creatorFeeBps = 50 (0.5%)
// cardValue = escrow - authFee - shippingFee - salesTax = 1000
// platformFee = 1000 * 3% = 30, creatorFee = 1000 * 0.5% = 5
// sellerPayout = 1060 - 30 - 5 - 10 - 15 - 0 = 1000... let's calc:
//   escrow = 1000 + 10 + 15 + 5 + 30 + 5 = 1065... easier to define bottom-up:
//
// listing price = 1000 (card value / fee base)
// authFee       = 10
// shippingFee   = 15
// salesTax      = 5
// platformFee   = 30  (3% of 1000)
// creatorFee    = 5   (0.5% of 1000)
// sellerPayout  = 1000 - 30 - 5 = 965  (listing price minus fees)
// escrow        = 965 + 30 + 5 + 10 + 15 + 5 = 1030
const AUTH_FEE      = u(10);
const SHIPPING_FEE  = u(15);
const SALES_TAX     = u(5);
const PLATFORM_FEE  = u(30);
const CREATOR_FEE   = u(5);
const SELLER_PAYOUT = u(965);
const ESCROW        = SELLER_PAYOUT + PLATFORM_FEE + CREATOR_FEE + AUTH_FEE + SHIPPING_FEE + SALES_TAX; // 1030
const SELLER_BOND   = u(40);  // 4% new-seller bond

function makeId(label) {
  return ethers.id(label); // keccak256(utf8(label))
}

async function fundOrder(escrow, buyer, seller, creator, orderId, overrides = {}) {
  const params = {
    orderId:            orderId || makeId("order1"),
    seller:             seller.address,
    creator:            creator?.address ?? ethers.ZeroAddress,
    escrowAmount:       ESCROW,
    sellerBondRequired: SELLER_BOND,
    platformFee:        PLATFORM_FEE,
    creatorFee:         CREATOR_FEE,
    authFee:            AUTH_FEE,
    shippingFee:        SHIPPING_FEE,
    salesTax:           SALES_TAX,
    sellerPayout:       SELLER_PAYOUT,
    ...overrides,
  };
  return escrow.connect(buyer).fundOrder(
    params.orderId,
    params.seller,
    params.creator,
    params.escrowAmount,
    params.sellerBondRequired,
    params.platformFee,
    params.creatorFee,
    params.authFee,
    params.shippingFee,
    params.salesTax,
    params.sellerPayout,
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ChaseHollowEscrow", function () {
  // Signers
  let owner, operator, disputeResolver, buyer, seller, creator, feeRecipient, guardian, stranger;
  // Contracts
  let usdc, escrow;

  beforeEach(async function () {
    [owner, operator, disputeResolver, buyer, seller, creator, feeRecipient, guardian, stranger] =
      await ethers.getSigners();

    const USDC = await ethers.getContractFactory("MockUSDC");
    usdc = await USDC.deploy();

    const Escrow = await ethers.getContractFactory("ChaseHollowEscrow");
    escrow = await Escrow.deploy(await usdc.getAddress(), feeRecipient.address, guardian.address);

    // Fund wallets and approve
    await usdc.mint(buyer.address,  u(100_000));
    await usdc.mint(seller.address, u(10_000));

    await usdc.connect(buyer).approve(await escrow.getAddress(),  u(100_000));
    await usdc.connect(seller).approve(await escrow.getAddress(), u(10_000));

    // Register operator and dispute resolver
    await escrow.connect(owner).addOperator(operator.address);
    await escrow.connect(owner).addDisputeResolver(disputeResolver.address);
  });

  // ═══════════════════════════════════════════════════════════════
  // DEPLOYMENT
  // ═══════════════════════════════════════════════════════════════

  describe("Deployment", function () {
    it("sets owner correctly", async function () {
      expect(await escrow.owner()).to.equal(owner.address);
    });

    it("sets feeRecipient correctly", async function () {
      expect(await escrow.feeRecipient()).to.equal(feeRecipient.address);
    });

    it("sets default fee BPS", async function () {
      expect(await escrow.platformFeeBps()).to.equal(300n);
      expect(await escrow.creatorFeeBps()).to.equal(50n);
    });

    it("sets initial guardian correctly", async function () {
      expect(await escrow.isGuardian(guardian.address)).to.be.true;
      expect(await escrow.guardianCount()).to.equal(1n);
    });

    it("reverts with zero USDC address", async function () {
      const Escrow = await ethers.getContractFactory("ChaseHollowEscrow");
      await expect(
        Escrow.deploy(ethers.ZeroAddress, feeRecipient.address, guardian.address)
      ).to.be.revertedWith("Invalid USDC address");
    });

    it("reverts with zero fee recipient", async function () {
      const Escrow = await ethers.getContractFactory("ChaseHollowEscrow");
      await expect(
        Escrow.deploy(await usdc.getAddress(), ethers.ZeroAddress, guardian.address)
      ).to.be.revertedWith("Invalid fee recipient");
    });

    it("reverts with zero guardian address", async function () {
      const Escrow = await ethers.getContractFactory("ChaseHollowEscrow");
      await expect(
        Escrow.deploy(await usdc.getAddress(), feeRecipient.address, ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid guardian");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // OPERATOR MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  describe("Operator management", function () {
    it("owner can add an operator", async function () {
      await expect(escrow.connect(owner).addOperator(stranger.address))
        .to.emit(escrow, "OperatorAdded")
        .withArgs(stranger.address);
      expect(await escrow.isOperator(stranger.address)).to.be.true;
    });

    it("owner can remove an operator", async function () {
      await escrow.connect(owner).removeOperator(operator.address);
      expect(await escrow.isOperator(operator.address)).to.be.false;
    });

    it("non-owner cannot add operator", async function () {
      await expect(
        escrow.connect(stranger).addOperator(stranger.address)
      ).to.be.reverted;
    });

    it("cannot add same operator twice", async function () {
      await expect(
        escrow.connect(owner).addOperator(operator.address)
      ).to.be.revertedWith("Already an operator");
    });

    it("cannot remove non-operator", async function () {
      await expect(
        escrow.connect(owner).removeOperator(stranger.address)
      ).to.be.revertedWith("Not an operator");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DISPUTE RESOLVER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  describe("Dispute resolver management", function () {
    it("owner can add a dispute resolver", async function () {
      await expect(escrow.connect(owner).addDisputeResolver(stranger.address))
        .to.emit(escrow, "DisputeResolverAdded")
        .withArgs(stranger.address);
      expect(await escrow.isDisputeResolver(stranger.address)).to.be.true;
    });

    it("owner can remove a dispute resolver", async function () {
      await escrow.connect(owner).removeDisputeResolver(disputeResolver.address);
      expect(await escrow.isDisputeResolver(disputeResolver.address)).to.be.false;
    });

    it("non-owner cannot add dispute resolver", async function () {
      await expect(
        escrow.connect(stranger).addDisputeResolver(stranger.address)
      ).to.be.reverted;
    });

    it("cannot add same resolver twice", async function () {
      await expect(
        escrow.connect(owner).addDisputeResolver(disputeResolver.address)
      ).to.be.revertedWith("Already a dispute resolver");
    });

    it("cannot remove non-resolver", async function () {
      await expect(
        escrow.connect(owner).removeDisputeResolver(stranger.address)
      ).to.be.revertedWith("Not a dispute resolver");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FUND ORDER
  // ═══════════════════════════════════════════════════════════════

  describe("fundOrder", function () {
    it("locks buyer USDC and creates order", async function () {
      const orderId  = makeId("order1");
      const escrowAddr = await escrow.getAddress();
      const before   = await usdc.balanceOf(escrowAddr);

      await expect(fundOrder(escrow, buyer, seller, creator, orderId))
        .to.emit(escrow, "OrderFunded")
        .withArgs(orderId, buyer.address, seller.address, ESCROW, SELLER_BOND);

      expect(await usdc.balanceOf(escrowAddr)).to.equal(before + ESCROW);

      const order = await escrow.getOrder(orderId);
      expect(order.buyer).to.equal(buyer.address);
      expect(order.seller).to.equal(seller.address);
      expect(order.status).to.equal(0n); // AwaitingConfirmation
    });

    it("reverts on duplicate order ID", async function () {
      const orderId = makeId("dup");
      await fundOrder(escrow, buyer, seller, creator, orderId);
      await expect(
        fundOrder(escrow, buyer, seller, creator, orderId)
      ).to.be.revertedWith("Order already exists");
    });

    it("reverts when buyer == seller", async function () {
      await expect(
        fundOrder(escrow, buyer, { address: buyer.address }, null, makeId("x"))
      ).to.be.revertedWith("Buyer cannot be seller");
    });

    it("reverts when escrow exceeds maxOrderValue", async function () {
      const big = u(51_000);
      await usdc.mint(buyer.address, big);
      await usdc.connect(buyer).approve(await escrow.getAddress(), big);
      const pFee = u(1500);  // 3% of ~50k card value
      const cFee = u(250);   // 0.5%
      const aFee = u(10);
      const ship = u(15);
      const tax  = u(5);
      const payout = big - pFee - cFee - aFee - ship - tax;
      await expect(
        fundOrder(escrow, buyer, seller, null, makeId("big"), {
          escrowAmount: big,
          platformFee:  pFee,
          creatorFee:   cFee,
          authFee:      aFee,
          shippingFee:  ship,
          salesTax:     tax,
          sellerPayout: payout,
        })
      ).to.be.revertedWith("Exceeds max order value");
    });

    it("reverts when amounts don't sum to escrowAmount", async function () {
      await expect(
        fundOrder(escrow, buyer, seller, null, makeId("sum"), {
          sellerPayout: SELLER_PAYOUT - u(1), // off by 1
        })
      ).to.be.revertedWith("Amounts must sum to escrowAmount");
    });

    it("reverts when platformFee is below minimum BPS", async function () {
      await expect(
        fundOrder(escrow, buyer, seller, null, makeId("pfee"), {
          platformFee:  PLATFORM_FEE - u(1),
          sellerPayout: SELLER_PAYOUT + u(1),
        })
      ).to.be.revertedWith("Platform fee below minimum");
    });

    it("reverts when creatorFee is below minimum BPS", async function () {
      await expect(
        fundOrder(escrow, buyer, seller, null, makeId("cfee"), {
          creatorFee:   CREATOR_FEE - u(1),
          sellerPayout: SELLER_PAYOUT + u(1),
        })
      ).to.be.revertedWith("Creator fee below minimum");
    });

    it("reverts when paused", async function () {
      await escrow.connect(owner).pause();
      await expect(
        fundOrder(escrow, buyer, seller, null, makeId("paused"))
      ).to.be.reverted;
    });

    it("accepts zero creator address (no affiliate)", async function () {
      const orderId = makeId("nocreator");
      await fundOrder(escrow, buyer, seller, null, orderId);
      const order = await escrow.getOrder(orderId);
      expect(order.creator).to.equal(ethers.ZeroAddress);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CONFIRM ORDER
  // ═══════════════════════════════════════════════════════════════

  describe("confirmOrder", function () {
    let orderId;

    beforeEach(async function () {
      orderId = makeId("confirm1");
      await fundOrder(escrow, buyer, seller, null, orderId);
    });

    it("seller posts bond and order goes Active", async function () {
      const escrowAddr = await escrow.getAddress();
      const before     = await usdc.balanceOf(escrowAddr);

      await expect(escrow.connect(seller).confirmOrder(orderId))
        .to.emit(escrow, "OrderConfirmed")
        .withArgs(orderId, seller.address, SELLER_BOND);

      const order = await escrow.getOrder(orderId);
      expect(order.status).to.equal(1n); // Active
      expect(order.sellerBond).to.equal(SELLER_BOND);
      expect(await usdc.balanceOf(escrowAddr)).to.equal(before + SELLER_BOND);
    });

    it("reverts if not the seller", async function () {
      await expect(
        escrow.connect(stranger).confirmOrder(orderId)
      ).to.be.revertedWith("Not the seller");
    });

    it("reverts if confirm window has passed", async function () {
      const confirmWindow = await escrow.sellerConfirmWindow();
      await time.increase(Number(confirmWindow) + 1);
      await expect(
        escrow.connect(seller).confirmOrder(orderId)
      ).to.be.revertedWith("Confirm window expired");
    });

    it("reverts if order is not AwaitingConfirmation", async function () {
      await escrow.connect(seller).confirmOrder(orderId);
      await expect(
        escrow.connect(seller).confirmOrder(orderId)
      ).to.be.revertedWith("Order not awaiting confirmation");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // MARK DELIVERED
  // ═══════════════════════════════════════════════════════════════

  describe("markDelivered", function () {
    let orderId;

    beforeEach(async function () {
      orderId = makeId("delivered1");
      await fundOrder(escrow, buyer, seller, null, orderId);
      await escrow.connect(seller).confirmOrder(orderId);
    });

    it("operator marks order Delivered", async function () {
      await expect(escrow.connect(operator).markDelivered(orderId))
        .to.emit(escrow, "OrderDelivered");

      const order = await escrow.getOrder(orderId);
      expect(order.status).to.equal(2n); // Delivered
      expect(order.deliveredAt).to.be.gt(0n);
      const window = await escrow.buyerInspectWindow();
      expect(order.autoReleaseAt).to.equal(order.deliveredAt + window);
    });

    it("owner can also mark delivered", async function () {
      await expect(escrow.connect(owner).markDelivered(orderId))
        .to.emit(escrow, "OrderDelivered");
    });

    it("stranger cannot mark delivered", async function () {
      await expect(
        escrow.connect(stranger).markDelivered(orderId)
      ).to.be.revertedWith("Not operator or owner");
    });

    it("reverts if order is not Active", async function () {
      // AwaitingConfirmation order
      const id2 = makeId("awaiting");
      await fundOrder(escrow, buyer, seller, null, id2);
      await expect(
        escrow.connect(operator).markDelivered(id2)
      ).to.be.revertedWith("Order not Active");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RELEASE ESCROW
  // ═══════════════════════════════════════════════════════════════

  describe("releaseEscrow", function () {
    let orderId;

    beforeEach(async function () {
      orderId = makeId("release1");
      await fundOrder(escrow, buyer, seller, creator, orderId);
      await escrow.connect(seller).confirmOrder(orderId);
      await escrow.connect(operator).markDelivered(orderId);
    });

    it("buyer can release early and funds distribute correctly", async function () {
      const sellerBefore    = await usdc.balanceOf(seller.address);
      const feeBefore       = await usdc.balanceOf(feeRecipient.address);
      const creatorBefore   = await usdc.balanceOf(creator.address);

      await expect(escrow.connect(buyer).releaseEscrow(orderId))
        .to.emit(escrow, "EscrowReleased")
        .and.to.emit(escrow, "BondReturned");

      // Seller gets payout + bond back
      expect(await usdc.balanceOf(seller.address)).to.equal(
        sellerBefore + SELLER_PAYOUT + SELLER_BOND
      );
      // feeRecipient gets platformFee + authFee + shippingFee + salesTax
      expect(await usdc.balanceOf(feeRecipient.address)).to.equal(
        feeBefore + PLATFORM_FEE + AUTH_FEE + SHIPPING_FEE + SALES_TAX
      );
      // Creator gets creatorFee
      expect(await usdc.balanceOf(creator.address)).to.equal(
        creatorBefore + CREATOR_FEE
      );

      const order = await escrow.getOrder(orderId);
      expect(order.status).to.equal(3n); // Released
    });

    it("operator can auto-release after inspection window", async function () {
      const window = await escrow.buyerInspectWindow();
      await time.increase(Number(window) + 1);

      await expect(escrow.connect(operator).releaseEscrow(orderId))
        .to.emit(escrow, "EscrowReleased");
    });

    it("operator cannot release before inspection window closes", async function () {
      await expect(
        escrow.connect(operator).releaseEscrow(orderId)
      ).to.be.revertedWith("Not authorized to release");
    });

    it("stranger cannot release", async function () {
      await expect(
        escrow.connect(stranger).releaseEscrow(orderId)
      ).to.be.revertedWith("Not authorized to release");
    });

    it("creator fee goes to feeRecipient when creator is zero", async function () {
      const id2 = makeId("nocreator2");
      await fundOrder(escrow, buyer, seller, null, id2); // no creator
      await escrow.connect(seller).confirmOrder(id2);
      await escrow.connect(operator).markDelivered(id2);

      const feeBefore = await usdc.balanceOf(feeRecipient.address);
      await escrow.connect(buyer).releaseEscrow(id2);

      // feeRecipient gets platformFee + authFee + shippingFee + salesTax + creatorFee (no creator)
      expect(await usdc.balanceOf(feeRecipient.address)).to.equal(
        feeBefore + PLATFORM_FEE + AUTH_FEE + SHIPPING_FEE + SALES_TAX + CREATOR_FEE
      );
    });

    it("reverts if order is not Delivered", async function () {
      // Still Active (pre-mark-delivered)
      const id3 = makeId("notdelivered");
      await fundOrder(escrow, buyer, seller, null, id3);
      await escrow.connect(seller).confirmOrder(id3);
      await expect(
        escrow.connect(buyer).releaseEscrow(id3)
      ).to.be.revertedWith("Order not Delivered");
    });

    it("isAutoReleaseReady returns false before window, true after", async function () {
      expect(await escrow.isAutoReleaseReady(orderId)).to.be.false;
      const window = await escrow.buyerInspectWindow();
      await time.increase(Number(window) + 1);
      expect(await escrow.isAutoReleaseReady(orderId)).to.be.true;
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // OPEN DISPUTE
  // ═══════════════════════════════════════════════════════════════

  describe("openDispute", function () {
    let orderId;

    beforeEach(async function () {
      orderId = makeId("dispute1");
      await fundOrder(escrow, buyer, seller, null, orderId);
      await escrow.connect(seller).confirmOrder(orderId);
      await escrow.connect(operator).markDelivered(orderId);
    });

    it("buyer can open dispute within window", async function () {
      await expect(escrow.connect(buyer).openDispute(orderId))
        .to.emit(escrow, "DisputeOpened")
        .withArgs(orderId, buyer.address);

      const order = await escrow.getOrder(orderId);
      expect(order.status).to.equal(4n); // Disputed
    });

    it("stranger cannot open dispute", async function () {
      await expect(
        escrow.connect(stranger).openDispute(orderId)
      ).to.be.revertedWith("Not the buyer");
    });

    it("reverts after inspection window closes", async function () {
      const window = await escrow.buyerInspectWindow();
      await time.increase(Number(window) + 1);
      await expect(
        escrow.connect(buyer).openDispute(orderId)
      ).to.be.revertedWith("Inspection window closed");
    });

    it("reverts if order is not Delivered", async function () {
      const id2 = makeId("active_dispute");
      await fundOrder(escrow, buyer, seller, null, id2);
      await escrow.connect(seller).confirmOrder(id2);
      await expect(
        escrow.connect(buyer).openDispute(id2)
      ).to.be.revertedWith("Order not Delivered");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RESOLVE DISPUTE
  // ═══════════════════════════════════════════════════════════════

  describe("resolveDispute", function () {
    let orderId;

    beforeEach(async function () {
      orderId = makeId("resolve1");
      await fundOrder(escrow, buyer, seller, null, orderId);
      await escrow.connect(seller).confirmOrder(orderId);
      await escrow.connect(operator).markDelivered(orderId);
      await escrow.connect(buyer).openDispute(orderId);
    });

    it("owner resolves in buyer's favor — escrow minus shipping refunded, shipping + bond forfeited", async function () {
      const buyerBefore = await usdc.balanceOf(buyer.address);
      const feeBefore   = await usdc.balanceOf(feeRecipient.address);
      // Shipping is non-refundable (buyer agreed at checkout — Chase Hollow already paid carrier)
      const buyerRefund = ESCROW - SHIPPING_FEE;

      await expect(escrow.connect(owner).resolveDispute(orderId, true))
        .to.emit(escrow, "DisputeResolved").withArgs(orderId, true)
        .and.to.emit(escrow, "BuyerRefunded").withArgs(orderId, buyer.address, buyerRefund);

      // Buyer gets escrow minus shipping fee
      expect(await usdc.balanceOf(buyer.address)).to.equal(buyerBefore + buyerRefund);
      // feeRecipient gets: shippingFee (recover carrier cost) + seller bond (forfeited)
      expect(await usdc.balanceOf(feeRecipient.address)).to.equal(
        feeBefore + SHIPPING_FEE + SELLER_BOND
      );
      const order = await escrow.getOrder(orderId);
      expect(order.status).to.equal(5n); // RefundedToBuyer
    });

    it("owner resolves in seller's favor — normal distribution", async function () {
      const sellerBefore = await usdc.balanceOf(seller.address);

      await expect(escrow.connect(owner).resolveDispute(orderId, false))
        .to.emit(escrow, "DisputeResolved").withArgs(orderId, false)
        .and.to.emit(escrow, "EscrowReleased");

      expect(await usdc.balanceOf(seller.address)).to.be.gt(sellerBefore);
      const order = await escrow.getOrder(orderId);
      expect(order.status).to.equal(3n); // Released
    });

    it("dispute resolver can resolve (hot wallet — no Safe ceremony required)", async function () {
      await expect(escrow.connect(disputeResolver).resolveDispute(orderId, false))
        .to.emit(escrow, "DisputeResolved").withArgs(orderId, false);
    });

    it("operator cannot resolve dispute (wrong role)", async function () {
      await expect(
        escrow.connect(operator).resolveDispute(orderId, true)
      ).to.be.revertedWith("Not dispute resolver or owner");
    });

    it("stranger cannot resolve dispute", async function () {
      await expect(
        escrow.connect(stranger).resolveDispute(orderId, true)
      ).to.be.revertedWith("Not dispute resolver or owner");
    });

    it("reverts if order is not Disputed", async function () {
      const id2 = makeId("notdisputed");
      await fundOrder(escrow, buyer, seller, null, id2);
      await escrow.connect(seller).confirmOrder(id2);
      await escrow.connect(operator).markDelivered(id2);
      await expect(
        escrow.connect(owner).resolveDispute(id2, true)
      ).to.be.revertedWith("Order not Disputed");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // REFUND BUYER (auth fail)
  // ═══════════════════════════════════════════════════════════════

  describe("refundBuyer", function () {
    it("owner refunds on auth fail (Active) — bond forfeited", async function () {
      const orderId = makeId("authfail1");
      await fundOrder(escrow, buyer, seller, null, orderId);
      await escrow.connect(seller).confirmOrder(orderId);

      const buyerBefore = await usdc.balanceOf(buyer.address);
      const feeBefore   = await usdc.balanceOf(feeRecipient.address);

      await expect(escrow.connect(owner).refundBuyer(orderId))
        .to.emit(escrow, "BuyerRefunded").withArgs(orderId, buyer.address, ESCROW);

      expect(await usdc.balanceOf(buyer.address)).to.equal(buyerBefore + ESCROW);
      expect(await usdc.balanceOf(feeRecipient.address)).to.equal(feeBefore + SELLER_BOND);

      expect((await escrow.getOrder(orderId)).status).to.equal(5n); // RefundedToBuyer
    });

    it("owner refunds on auth fail (Delivered)", async function () {
      const orderId = makeId("authfail2");
      await fundOrder(escrow, buyer, seller, null, orderId);
      await escrow.connect(seller).confirmOrder(orderId);
      await escrow.connect(operator).markDelivered(orderId);

      await expect(escrow.connect(owner).refundBuyer(orderId))
        .to.emit(escrow, "BuyerRefunded");
    });

    it("operator can refund (auth fail is automated via webhook)", async function () {
      const orderId = makeId("authfail3");
      await fundOrder(escrow, buyer, seller, null, orderId);
      await escrow.connect(seller).confirmOrder(orderId);
      await expect(escrow.connect(operator).refundBuyer(orderId))
        .to.emit(escrow, "BuyerRefunded");
    });

    it("stranger cannot refund", async function () {
      const orderId = makeId("authfail3b");
      await fundOrder(escrow, buyer, seller, null, orderId);
      await escrow.connect(seller).confirmOrder(orderId);
      await expect(
        escrow.connect(stranger).refundBuyer(orderId)
      ).to.be.revertedWith("Not operator or owner");
    });

    it("reverts if order is not Active or Delivered", async function () {
      const orderId = makeId("authfail4");
      await fundOrder(escrow, buyer, seller, null, orderId);
      // Still AwaitingConfirmation
      await expect(
        escrow.connect(owner).refundBuyer(orderId)
      ).to.be.revertedWith("Cannot refund at this stage");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CANCEL ORDER
  // ═══════════════════════════════════════════════════════════════

  describe("cancelOrder", function () {
    it("cancels AwaitingConfirmation — buyer refunded, no bond", async function () {
      const orderId    = makeId("cancel_await");
      await fundOrder(escrow, buyer, seller, null, orderId);

      const buyerBefore = await usdc.balanceOf(buyer.address);
      const feeBefore   = await usdc.balanceOf(feeRecipient.address);

      await expect(escrow.connect(operator).cancelOrder(orderId))
        .to.emit(escrow, "OrderCancelled").withArgs(orderId);

      expect(await usdc.balanceOf(buyer.address)).to.equal(buyerBefore + ESCROW);
      // No bond was posted, feeRecipient unchanged
      expect(await usdc.balanceOf(feeRecipient.address)).to.equal(feeBefore);

      expect((await escrow.getOrder(orderId)).status).to.equal(6n); // Cancelled
    });

    it("cancels Active — buyer refunded, seller bond forfeited", async function () {
      const orderId = makeId("cancel_active");
      await fundOrder(escrow, buyer, seller, null, orderId);
      await escrow.connect(seller).confirmOrder(orderId);

      const buyerBefore = await usdc.balanceOf(buyer.address);
      const feeBefore   = await usdc.balanceOf(feeRecipient.address);

      await expect(escrow.connect(operator).cancelOrder(orderId))
        .to.emit(escrow, "OrderCancelled").withArgs(orderId);

      expect(await usdc.balanceOf(buyer.address)).to.equal(buyerBefore + ESCROW);
      expect(await usdc.balanceOf(feeRecipient.address)).to.equal(feeBefore + SELLER_BOND);
    });

    it("stranger cannot cancel", async function () {
      const orderId = makeId("cancel_stranger");
      await fundOrder(escrow, buyer, seller, null, orderId);
      await expect(
        escrow.connect(stranger).cancelOrder(orderId)
      ).to.be.revertedWith("Not operator or owner");
    });

    it("cannot cancel a Delivered order", async function () {
      const orderId = makeId("cancel_delivered");
      await fundOrder(escrow, buyer, seller, null, orderId);
      await escrow.connect(seller).confirmOrder(orderId);
      await escrow.connect(operator).markDelivered(orderId);
      await expect(
        escrow.connect(operator).cancelOrder(orderId)
      ).to.be.revertedWith("Can only cancel before delivery");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // BATCH FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  describe("Batch functions", function () {
    async function setupActiveOrder(label) {
      const id = makeId(label);
      await fundOrder(escrow, buyer, seller, null, id);
      await escrow.connect(seller).confirmOrder(id);
      return id;
    }

    async function setupDeliveredOrder(label) {
      const id = await setupActiveOrder(label);
      await escrow.connect(operator).markDelivered(id);
      return id;
    }

    describe("batchMarkDelivered", function () {
      it("marks multiple Active orders Delivered", async function () {
        const id1 = await setupActiveOrder("batch_d_1");
        const id2 = await setupActiveOrder("batch_d_2");

        await escrow.connect(operator).batchMarkDelivered([id1, id2]);

        expect((await escrow.getOrder(id1)).status).to.equal(2n); // Delivered
        expect((await escrow.getOrder(id2)).status).to.equal(2n);
      });

      it("skips non-Active orders without reverting", async function () {
        const id1 = await setupActiveOrder("batch_d_skip_1");
        const id2 = await setupDeliveredOrder("batch_d_skip_2"); // already Delivered

        await escrow.connect(operator).batchMarkDelivered([id1, id2]);

        expect((await escrow.getOrder(id1)).status).to.equal(2n); // now Delivered
        expect((await escrow.getOrder(id2)).status).to.equal(2n); // unchanged
      });
    });

    describe("batchReleaseEscrow", function () {
      it("releases multiple orders after window", async function () {
        const id1 = await setupDeliveredOrder("batch_r_1");
        const id2 = await setupDeliveredOrder("batch_r_2");

        const window = await escrow.buyerInspectWindow();
        await time.increase(Number(window) + 1);

        await escrow.connect(operator).batchReleaseEscrow([id1, id2]);

        expect((await escrow.getOrder(id1)).status).to.equal(3n); // Released
        expect((await escrow.getOrder(id2)).status).to.equal(3n);
      });

      it("skips orders where window has not passed", async function () {
        const id1 = await setupDeliveredOrder("batch_r_skip");
        await escrow.connect(operator).batchReleaseEscrow([id1]);
        expect((await escrow.getOrder(id1)).status).to.equal(2n); // still Delivered
      });
    });

    describe("batchRefundBuyers", function () {
      it("refunds multiple orders (owner only)", async function () {
        const id1 = await setupActiveOrder("batch_rb_1");
        const id2 = await setupActiveOrder("batch_rb_2");

        const buyerBefore = await usdc.balanceOf(buyer.address);
        await escrow.connect(owner).batchRefundBuyers([id1, id2]);

        // Both orders refunded
        expect((await escrow.getOrder(id1)).status).to.equal(5n);
        expect((await escrow.getOrder(id2)).status).to.equal(5n);
        expect(await usdc.balanceOf(buyer.address)).to.equal(buyerBefore + ESCROW * 2n);
      });

      it("operator can batch refund (auth fail is automated)", async function () {
        const id1 = await setupActiveOrder("batch_rb_op");
        await expect(escrow.connect(operator).batchRefundBuyers([id1]))
          .to.not.be.reverted;
        expect((await escrow.getOrder(id1)).status).to.equal(5n); // RefundedToBuyer
      });

      it("stranger cannot batch refund", async function () {
        const id1 = await setupActiveOrder("batch_rb_stranger");
        await expect(
          escrow.connect(stranger).batchRefundBuyers([id1])
        ).to.be.reverted;
      });
    });

    describe("batchCancelOrders", function () {
      it("cancels multiple orders, forfeiting bond on Active ones", async function () {
        const idAwait  = makeId("batch_c_await");
        const idActive = makeId("batch_c_active");

        await fundOrder(escrow, buyer, seller, null, idAwait);
        await fundOrder(escrow, buyer, seller, null, idActive);
        await escrow.connect(seller).confirmOrder(idActive);

        const feeBefore = await usdc.balanceOf(feeRecipient.address);
        await escrow.connect(operator).batchCancelOrders([idAwait, idActive]);

        expect((await escrow.getOrder(idAwait)).status).to.equal(6n);
        expect((await escrow.getOrder(idActive)).status).to.equal(6n);
        // Only Active order bond forfeited
        expect(await usdc.balanceOf(feeRecipient.address)).to.equal(feeBefore + SELLER_BOND);
      });
    });

    describe("batchResolveDisputes", function () {
      it("resolves multiple disputes with different outcomes", async function () {
        const id1 = await setupDeliveredOrder("batch_res_1");
        const id2 = await setupDeliveredOrder("batch_res_2");
        await escrow.connect(buyer).openDispute(id1);
        await escrow.connect(buyer).openDispute(id2);

        // id1 buyer wins, id2 seller wins
        await escrow.connect(owner).batchResolveDisputes([id1, id2], [true, false]);

        expect((await escrow.getOrder(id1)).status).to.equal(5n); // RefundedToBuyer
        expect((await escrow.getOrder(id2)).status).to.equal(3n); // Released
      });

      it("reverts on length mismatch", async function () {
        const id1 = await setupDeliveredOrder("batch_res_len");
        await escrow.connect(buyer).openDispute(id1);
        await expect(
          escrow.connect(owner).batchResolveDisputes([id1], [true, false])
        ).to.be.revertedWith("Length mismatch");
      });

      it("skips non-Disputed orders without reverting", async function () {
        const id1 = await setupDeliveredOrder("batch_res_skip_1");
        const id2 = await setupDeliveredOrder("batch_res_skip_2");
        await escrow.connect(buyer).openDispute(id1);
        // id2 is Delivered, not Disputed

        // Should process id1 and silently skip id2
        await escrow.connect(owner).batchResolveDisputes([id1, id2], [true, true]);
        expect((await escrow.getOrder(id1)).status).to.equal(5n); // RefundedToBuyer
        expect((await escrow.getOrder(id2)).status).to.equal(2n); // still Delivered
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ADMIN SETTERS
  // ═══════════════════════════════════════════════════════════════

  describe("Admin setters", function () {
    describe("feeRecipient timelock (guardian-gated)", function () {
      it("guardian: propose → wait 48hrs → execute changes feeRecipient", async function () {
        await expect(escrow.connect(guardian).proposeFeeRecipient(stranger.address))
          .to.emit(escrow, "FeeRecipientProposed");

        // Still old before delay
        expect(await escrow.feeRecipient()).to.equal(feeRecipient.address);

        await time.increase(48 * 3600 + 1);

        await expect(escrow.connect(guardian).executeFeeRecipientChange())
          .to.emit(escrow, "FeeRecipientChanged")
          .withArgs(feeRecipient.address, stranger.address);

        expect(await escrow.feeRecipient()).to.equal(stranger.address);
      });

      it("cannot execute before 48hr delay", async function () {
        await escrow.connect(guardian).proposeFeeRecipient(stranger.address);
        await expect(
          escrow.connect(guardian).executeFeeRecipientChange()
        ).to.be.revertedWith("Timelock not expired");
      });

      it("guardian can cancel a pending feeRecipient change", async function () {
        await escrow.connect(guardian).proposeFeeRecipient(stranger.address);
        await expect(escrow.connect(guardian).cancelFeeRecipientChange())
          .to.emit(escrow, "FeeRecipientChangeCancelled")
          .withArgs(stranger.address);
        expect(await escrow.feeRecipient()).to.equal(feeRecipient.address);
        expect(await escrow.pendingFeeRecipient()).to.equal(ethers.ZeroAddress);
      });

      it("cannot execute when no change is pending", async function () {
        await expect(
          escrow.connect(guardian).executeFeeRecipientChange()
        ).to.be.revertedWith("No pending change");
      });

      it("owner CANNOT propose feeRecipient change — critical security check", async function () {
        await expect(
          escrow.connect(owner).proposeFeeRecipient(stranger.address)
        ).to.be.revertedWith("Not guardian");
      });

      it("stranger cannot propose feeRecipient change", async function () {
        await expect(
          escrow.connect(stranger).proposeFeeRecipient(stranger.address)
        ).to.be.revertedWith("Not guardian");
      });
    });

    describe("guardian self-management (timelocked)", function () {
      const GUARDIAN_DELAY = 48 * 60 * 60; // 48 hours in seconds

      it("guardian can propose + execute adding a second guardian after timelock", async function () {
        await expect(escrow.connect(guardian).proposeGuardianChange(stranger.address, true))
          .to.emit(escrow, "GuardianChangeProposed");
        // Cannot execute before timelock
        await expect(escrow.connect(guardian).executeGuardianChange())
          .to.be.revertedWith("Timelock not elapsed");
        // Advance time past 48hrs
        await ethers.provider.send("evm_increaseTime", [GUARDIAN_DELAY + 1]);
        await ethers.provider.send("evm_mine");
        await expect(escrow.connect(guardian).executeGuardianChange())
          .to.emit(escrow, "GuardianAdded").withArgs(stranger.address);
        expect(await escrow.isGuardian(stranger.address)).to.be.true;
        expect(await escrow.guardianCount()).to.equal(2n);
      });

      it("guardian can propose + execute removing another guardian after timelock", async function () {
        // Add G2 first
        await escrow.connect(guardian).proposeGuardianChange(stranger.address, true);
        await ethers.provider.send("evm_increaseTime", [GUARDIAN_DELAY + 1]);
        await ethers.provider.send("evm_mine");
        await escrow.connect(guardian).executeGuardianChange();
        // Now G2 removes G1
        await escrow.connect(stranger).proposeGuardianChange(guardian.address, false);
        await ethers.provider.send("evm_increaseTime", [GUARDIAN_DELAY + 1]);
        await ethers.provider.send("evm_mine");
        await expect(escrow.connect(stranger).executeGuardianChange())
          .to.emit(escrow, "GuardianRemoved").withArgs(guardian.address);
        expect(await escrow.isGuardian(guardian.address)).to.be.false;
        expect(await escrow.guardianCount()).to.equal(1n);
      });

      it("G2 can cancel a malicious guardian-removal proposed by compromised G1", async function () {
        // Add G2
        await escrow.connect(guardian).proposeGuardianChange(stranger.address, true);
        await ethers.provider.send("evm_increaseTime", [GUARDIAN_DELAY + 1]);
        await ethers.provider.send("evm_mine");
        await escrow.connect(guardian).executeGuardianChange();
        // Compromised G1 tries to remove G2
        await escrow.connect(guardian).proposeGuardianChange(stranger.address, false);
        // G2 cancels it within the 48hr window
        await expect(escrow.connect(stranger).cancelGuardianChange())
          .to.emit(escrow, "GuardianChangeCancelled").withArgs(stranger.address, false, stranger.address);
        // Pending change is cleared — G2 is still a guardian
        const pending = await escrow.pendingGuardianChange();
        expect(pending.proposedAt).to.equal(0n);
        expect(await escrow.isGuardian(stranger.address)).to.be.true;
      });

      it("cannot queue two guardian changes simultaneously", async function () {
        await escrow.connect(guardian).proposeGuardianChange(stranger.address, true);
        await expect(
          escrow.connect(guardian).proposeGuardianChange(operator.address, true)
        ).to.be.revertedWith("Change already pending - cancel first");
      });

      it("cannot remove the last guardian", async function () {
        await expect(
          escrow.connect(guardian).proposeGuardianChange(guardian.address, false)
        ).to.be.revertedWith("Cannot remove last guardian");
      });

      it("owner CANNOT propose a guardian change — critical security check", async function () {
        await expect(
          escrow.connect(owner).proposeGuardianChange(stranger.address, true)
        ).to.be.revertedWith("Not guardian");
      });

      it("stranger cannot propose a guardian change", async function () {
        await expect(
          escrow.connect(stranger).proposeGuardianChange(stranger.address, true)
        ).to.be.revertedWith("Not guardian");
      });

      it("second guardian can cancel a malicious feeRecipient change proposed by compromised G1", async function () {
        // Add G2
        await escrow.connect(guardian).proposeGuardianChange(stranger.address, true);
        await ethers.provider.send("evm_increaseTime", [GUARDIAN_DELAY + 1]);
        await ethers.provider.send("evm_mine");
        await escrow.connect(guardian).executeGuardianChange();
        // Compromised G1 proposes malicious feeRecipient change
        await escrow.connect(guardian).proposeFeeRecipient(operator.address);
        // G2 cancels it
        await expect(escrow.connect(stranger).cancelFeeRecipientChange())
          .to.emit(escrow, "FeeRecipientChangeCancelled");
        expect(await escrow.pendingFeeRecipient()).to.equal(ethers.ZeroAddress);
      });
    });

    it("owner can update feeBps within caps", async function () {
      await escrow.connect(owner).setFeeBps(500, 100);
      expect(await escrow.platformFeeBps()).to.equal(500n);
      expect(await escrow.creatorFeeBps()).to.equal(100n);
    });

    it("reverts if platformFeeBps exceeds hard cap (1000)", async function () {
      await expect(escrow.connect(owner).setFeeBps(1001, 50))
        .to.be.revertedWith("Platform fee too high");
    });

    it("reverts if creatorFeeBps exceeds hard cap (200)", async function () {
      await expect(escrow.connect(owner).setFeeBps(300, 201))
        .to.be.revertedWith("Creator fee too high");
    });

    it("owner can update buyerInspectWindow", async function () {
      await escrow.connect(owner).setBuyerInspectWindow(48 * 3600);
      expect(await escrow.buyerInspectWindow()).to.equal(BigInt(48 * 3600));
    });

    it("reverts if inspect window exceeds 7 days", async function () {
      await expect(escrow.connect(owner).setBuyerInspectWindow(8 * 24 * 3600))
        .to.be.revertedWith("Window too long");
    });

    it("non-owner cannot call admin setters", async function () {
      await expect(escrow.connect(stranger).setFeeBps(300, 50))
        .to.be.reverted;
      await expect(escrow.connect(stranger).setBuyerInspectWindow(48 * 3600))
        .to.be.reverted;
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PAUSE
  // ═══════════════════════════════════════════════════════════════

  describe("Pause", function () {
    it("owner can pause and unpause", async function () {
      await escrow.connect(owner).pause();
      expect(await escrow.paused()).to.be.true;
      await escrow.connect(owner).unpause();
      expect(await escrow.paused()).to.be.false;
    });

    it("non-owner cannot pause", async function () {
      await expect(escrow.connect(stranger).pause()).to.be.reverted;
    });

    it("fundOrder blocked when paused", async function () {
      await escrow.connect(owner).pause();
      await expect(
        fundOrder(escrow, buyer, seller, null, makeId("paused2"))
      ).to.be.reverted;
    });

    it("confirmOrder blocked when paused", async function () {
      const orderId = makeId("pause_confirm");
      await fundOrder(escrow, buyer, seller, null, orderId);
      await escrow.connect(owner).pause();
      await expect(
        escrow.connect(seller).confirmOrder(orderId)
      ).to.be.reverted;
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SWEEP STUCK FUNDS (safety valve)
  // ═══════════════════════════════════════════════════════════════

  describe("sweepStuckFunds", function () {
    it("owner sweeps full balance to specified recipient when paused", async function () {
      // Fund an order so contract holds USDC
      const orderId = makeId("sweep1");
      await fundOrder(escrow, buyer, seller, null, orderId);

      await escrow.connect(owner).pause();

      const recipientBefore = await usdc.balanceOf(stranger.address);
      const contractBalance = await usdc.balanceOf(await escrow.getAddress());

      await expect(escrow.connect(owner).sweepStuckFunds(stranger.address))
        .to.emit(escrow, "FundsSwept")
        .withArgs(stranger.address, contractBalance, await ethers.provider.getBlock("latest").then(b => b.timestamp + 1));

      expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(0n);
      expect(await usdc.balanceOf(stranger.address)).to.equal(recipientBefore + contractBalance);
    });

    it("reverts if not paused", async function () {
      const orderId = makeId("sweep2");
      await fundOrder(escrow, buyer, seller, null, orderId);
      await expect(
        escrow.connect(owner).sweepStuckFunds(stranger.address)
      ).to.be.reverted;
    });

    it("reverts if nothing to sweep", async function () {
      await escrow.connect(owner).pause();
      await expect(
        escrow.connect(owner).sweepStuckFunds(stranger.address)
      ).to.be.revertedWith("Nothing to sweep");
    });

    it("non-owner cannot sweep", async function () {
      const orderId = makeId("sweep3");
      await fundOrder(escrow, buyer, seller, null, orderId);
      await escrow.connect(owner).pause();
      await expect(
        escrow.connect(stranger).sweepStuckFunds(stranger.address)
      ).to.be.reverted;
    });

    it("reverts with zero recipient address", async function () {
      const orderId = makeId("sweep4");
      await fundOrder(escrow, buyer, seller, null, orderId);
      await escrow.connect(owner).pause();
      await expect(
        escrow.connect(owner).sweepStuckFunds(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid recipient");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GETORDER VIEW
  // ═══════════════════════════════════════════════════════════════

  describe("getOrder", function () {
    it("returns zero-address buyer for unknown order", async function () {
      const order = await escrow.getOrder(makeId("unknown"));
      expect(order.buyer).to.equal(ethers.ZeroAddress);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // EDGE CASES & ATTACK SCENARIOS
  // ═══════════════════════════════════════════════════════════════

  describe("Edge cases & attack scenarios", function () {

    // ── Full lifecycle balance proof ─────────────────────────────
    describe("Full lifecycle — balance verification at every step", function () {
      it("all wallets zero-sum through complete order lifecycle", async function () {
        const orderId    = makeId("lifecycle1");
        const escrowAddr = await escrow.getAddress();

        // Snapshot balances before
        const buyerStart  = await usdc.balanceOf(buyer.address);
        const sellerStart = await usdc.balanceOf(seller.address);
        const feeStart    = await usdc.balanceOf(feeRecipient.address);
        const creatStart  = await usdc.balanceOf(creator.address);

        // Step 1: fundOrder — buyer locks ESCROW
        await fundOrder(escrow, buyer, seller, creator, orderId);
        expect(await usdc.balanceOf(escrowAddr)).to.equal(ESCROW);
        expect(await usdc.balanceOf(buyer.address)).to.equal(buyerStart - ESCROW);

        // Step 2: confirmOrder — seller locks SELLER_BOND
        await escrow.connect(seller).confirmOrder(orderId);
        expect(await usdc.balanceOf(escrowAddr)).to.equal(ESCROW + SELLER_BOND);
        expect(await usdc.balanceOf(seller.address)).to.equal(sellerStart - SELLER_BOND);

        // Step 3: markDelivered
        await escrow.connect(operator).markDelivered(orderId);
        expect(await usdc.balanceOf(escrowAddr)).to.equal(ESCROW + SELLER_BOND); // unchanged

        // Step 4: releaseEscrow (buyer early)
        await escrow.connect(buyer).releaseEscrow(orderId);
        expect(await usdc.balanceOf(escrowAddr)).to.equal(0n); // contract fully drained

        // Verify every recipient
        // Seller: payout + bond returned
        expect(await usdc.balanceOf(seller.address)).to.equal(
          sellerStart - SELLER_BOND + SELLER_PAYOUT + SELLER_BOND
        );
        // = sellerStart + SELLER_PAYOUT
        expect(await usdc.balanceOf(seller.address)).to.equal(sellerStart + SELLER_PAYOUT);

        // feeRecipient: platformFee + authFee + shippingFee + salesTax
        expect(await usdc.balanceOf(feeRecipient.address)).to.equal(
          feeStart + PLATFORM_FEE + AUTH_FEE + SHIPPING_FEE + SALES_TAX
        );

        // Creator: creatorFee
        expect(await usdc.balanceOf(creator.address)).to.equal(creatStart + CREATOR_FEE);

        // Buyer net loss = ESCROW (card + fees + shipping + tax)
        expect(await usdc.balanceOf(buyer.address)).to.equal(buyerStart - ESCROW);
      });

      it("contract balance is zero after buyer-wins dispute", async function () {
        const orderId = makeId("lifecycle_dispute");
        await fundOrder(escrow, buyer, seller, null, orderId);
        await escrow.connect(seller).confirmOrder(orderId);
        await escrow.connect(operator).markDelivered(orderId);
        await escrow.connect(buyer).openDispute(orderId);
        await escrow.connect(owner).resolveDispute(orderId, true); // buyer wins

        expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(0n);
      });

      it("contract balance is zero after auth-fail refund", async function () {
        const orderId = makeId("lifecycle_authfail");
        await fundOrder(escrow, buyer, seller, null, orderId);
        await escrow.connect(seller).confirmOrder(orderId);
        await escrow.connect(owner).refundBuyer(orderId);

        expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(0n);
      });

      it("contract balance is zero after Active cancel (bond forfeited)", async function () {
        const orderId = makeId("lifecycle_cancel");
        await fundOrder(escrow, buyer, seller, null, orderId);
        await escrow.connect(seller).confirmOrder(orderId);
        await escrow.connect(operator).cancelOrder(orderId);

        expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(0n);
      });
    });

    // ── Zero seller bond ─────────────────────────────────────────
    describe("Zero seller bond", function () {
      it("confirmOrder succeeds with zero bond required", async function () {
        const orderId = makeId("zerobond1");
        await fundOrder(escrow, buyer, seller, null, orderId, { sellerBondRequired: 0n });
        await expect(escrow.connect(seller).confirmOrder(orderId))
          .to.emit(escrow, "OrderConfirmed").withArgs(orderId, seller.address, 0n);
        const order = await escrow.getOrder(orderId);
        expect(order.sellerBond).to.equal(0n);
        expect(order.status).to.equal(1n); // Active
      });

      it("cancel Active order with zero bond — no bond transfer to feeRecipient", async function () {
        const orderId    = makeId("zerobond2");
        const feeBefore  = await usdc.balanceOf(feeRecipient.address);
        await fundOrder(escrow, buyer, seller, null, orderId, { sellerBondRequired: 0n });
        await escrow.connect(seller).confirmOrder(orderId);
        await escrow.connect(operator).cancelOrder(orderId);
        // feeRecipient should be unchanged (no bond to forfeit)
        expect(await usdc.balanceOf(feeRecipient.address)).to.equal(feeBefore);
        expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(0n);
      });

      it("full lifecycle with zero bond — contract drains to zero", async function () {
        const orderId = makeId("zerobond3");
        await fundOrder(escrow, buyer, seller, null, orderId, { sellerBondRequired: 0n });
        await escrow.connect(seller).confirmOrder(orderId);
        await escrow.connect(operator).markDelivered(orderId);
        await escrow.connect(buyer).releaseEscrow(orderId);
        expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(0n);
      });
    });

    // ── Order ID reuse ───────────────────────────────────────────
    describe("Order ID reuse after completion", function () {
      it("cannot reuse an order ID after release", async function () {
        const orderId = makeId("reuse_released");
        await fundOrder(escrow, buyer, seller, null, orderId);
        await escrow.connect(seller).confirmOrder(orderId);
        await escrow.connect(operator).markDelivered(orderId);
        await escrow.connect(buyer).releaseEscrow(orderId);
        // Try to fund same ID again
        await expect(
          fundOrder(escrow, buyer, seller, null, orderId)
        ).to.be.revertedWith("Order already exists");
      });

      it("cannot reuse an order ID after cancellation", async function () {
        const orderId = makeId("reuse_cancelled");
        await fundOrder(escrow, buyer, seller, null, orderId);
        await escrow.connect(operator).cancelOrder(orderId);
        await expect(
          fundOrder(escrow, buyer, seller, null, orderId)
        ).to.be.revertedWith("Order already exists");
      });
    });

    // ── Inspect window exact boundary ────────────────────────────
    describe("Inspect window timing boundaries", function () {
      it("openDispute succeeds one second before window closes", async function () {
        const orderId = makeId("boundary1");
        await fundOrder(escrow, buyer, seller, null, orderId);
        await escrow.connect(seller).confirmOrder(orderId);
        await escrow.connect(operator).markDelivered(orderId);
        const order  = await escrow.getOrder(orderId);
        // increaseTo mines a block at N, then openDispute mines at N+1.
        // Go to autoReleaseAt - 2 so the openDispute block lands at autoReleaseAt - 1.
        await time.increaseTo(Number(order.autoReleaseAt) - 2);
        await expect(escrow.connect(buyer).openDispute(orderId))
          .to.emit(escrow, "DisputeOpened");
      });

      it("openDispute fails at exactly autoReleaseAt", async function () {
        const orderId = makeId("boundary2");
        await fundOrder(escrow, buyer, seller, null, orderId);
        await escrow.connect(seller).confirmOrder(orderId);
        await escrow.connect(operator).markDelivered(orderId);
        const order = await escrow.getOrder(orderId);
        await time.increaseTo(Number(order.autoReleaseAt));
        await expect(
          escrow.connect(buyer).openDispute(orderId)
        ).to.be.revertedWith("Inspection window closed");
      });

      it("operator auto-release succeeds at exactly autoReleaseAt", async function () {
        const orderId = makeId("boundary3");
        await fundOrder(escrow, buyer, seller, null, orderId);
        await escrow.connect(seller).confirmOrder(orderId);
        await escrow.connect(operator).markDelivered(orderId);
        const order = await escrow.getOrder(orderId);
        await time.increaseTo(Number(order.autoReleaseAt));
        await expect(escrow.connect(operator).releaseEscrow(orderId))
          .to.emit(escrow, "EscrowReleased");
      });
    });

    // ── Invalid state transitions ────────────────────────────────
    describe("Invalid state transitions", function () {
      it("operator cannot release a Disputed order", async function () {
        const orderId = makeId("state1");
        await fundOrder(escrow, buyer, seller, null, orderId);
        await escrow.connect(seller).confirmOrder(orderId);
        await escrow.connect(operator).markDelivered(orderId);
        await escrow.connect(buyer).openDispute(orderId);
        const window = await escrow.buyerInspectWindow();
        await time.increase(Number(window) + 1);
        await expect(
          escrow.connect(operator).releaseEscrow(orderId)
        ).to.be.revertedWith("Order not Delivered");
      });

      it("buyer cannot dispute twice", async function () {
        const orderId = makeId("state2");
        await fundOrder(escrow, buyer, seller, null, orderId);
        await escrow.connect(seller).confirmOrder(orderId);
        await escrow.connect(operator).markDelivered(orderId);
        await escrow.connect(buyer).openDispute(orderId);
        await expect(
          escrow.connect(buyer).openDispute(orderId)
        ).to.be.revertedWith("Order not Delivered");
      });

      it("cannot cancel a Released order", async function () {
        const orderId = makeId("state3");
        await fundOrder(escrow, buyer, seller, null, orderId);
        await escrow.connect(seller).confirmOrder(orderId);
        await escrow.connect(operator).markDelivered(orderId);
        await escrow.connect(buyer).releaseEscrow(orderId);
        await expect(
          escrow.connect(operator).cancelOrder(orderId)
        ).to.be.revertedWith("Can only cancel before delivery");
      });

      it("cannot markDelivered on a Cancelled order", async function () {
        const orderId = makeId("state4");
        await fundOrder(escrow, buyer, seller, null, orderId);
        await escrow.connect(operator).cancelOrder(orderId);
        await expect(
          escrow.connect(operator).markDelivered(orderId)
        ).to.be.revertedWith("Order not Active");
      });

      it("cannot confirmOrder on a Cancelled order", async function () {
        const orderId = makeId("state5");
        await fundOrder(escrow, buyer, seller, null, orderId);
        await escrow.connect(operator).cancelOrder(orderId);
        // re-mint so seller has approval still valid
        await expect(
          escrow.connect(seller).confirmOrder(orderId)
        ).to.be.revertedWith("Order not awaiting confirmation");
      });

      it("buyer cannot release a Disputed order even early", async function () {
        const orderId = makeId("state6");
        await fundOrder(escrow, buyer, seller, null, orderId);
        await escrow.connect(seller).confirmOrder(orderId);
        await escrow.connect(operator).markDelivered(orderId);
        await escrow.connect(buyer).openDispute(orderId);
        await expect(
          escrow.connect(buyer).releaseEscrow(orderId)
        ).to.be.revertedWith("Order not Delivered");
      });
    });

    // ── Multiple concurrent orders ───────────────────────────────
    describe("Multiple concurrent orders", function () {
      it("same buyer can have multiple open orders simultaneously", async function () {
        const id1 = makeId("concurrent1");
        const id2 = makeId("concurrent2");
        const id3 = makeId("concurrent3");
        await fundOrder(escrow, buyer, seller, null, id1);
        await fundOrder(escrow, buyer, seller, null, id2);
        await fundOrder(escrow, buyer, seller, null, id3);
        expect((await escrow.getOrder(id1)).status).to.equal(0n);
        expect((await escrow.getOrder(id2)).status).to.equal(0n);
        expect((await escrow.getOrder(id3)).status).to.equal(0n);
        // Contract holds 3× escrow
        expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(ESCROW * 3n);
      });

      it("releasing one order does not affect another", async function () {
        const id1 = makeId("concurrent4");
        const id2 = makeId("concurrent5");
        await fundOrder(escrow, buyer, seller, null, id1);
        await fundOrder(escrow, buyer, seller, null, id2);
        await escrow.connect(seller).confirmOrder(id1);
        await escrow.connect(seller).confirmOrder(id2);
        await escrow.connect(operator).markDelivered(id1);
        await escrow.connect(buyer).releaseEscrow(id1);
        // id2 still Active, untouched
        expect((await escrow.getOrder(id2)).status).to.equal(1n); // Active
        // Contract holds exactly id2's escrow + bond
        expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(ESCROW + SELLER_BOND);
      });
    });

    // ── Seller is also creator ───────────────────────────────────
    describe("Seller as creator", function () {
      it("seller earns both sellerPayout and creatorFee when they are the creator", async function () {
        const orderId     = makeId("seller_creator");
        const sellerStart = await usdc.balanceOf(seller.address);

        // Pass seller's address as the creator
        await fundOrder(escrow, buyer, seller, seller, orderId);
        await escrow.connect(seller).confirmOrder(orderId);
        await escrow.connect(operator).markDelivered(orderId);
        await escrow.connect(buyer).releaseEscrow(orderId);

        // Seller receives: sellerPayout + bond returned + creatorFee
        expect(await usdc.balanceOf(seller.address)).to.equal(
          sellerStart + SELLER_PAYOUT + CREATOR_FEE
          // bond: posted then returned (net zero)
        );
      });
    });

    // ── Zero fee BPS ─────────────────────────────────────────────
    describe("Zero fee BPS", function () {
      it("fundOrder succeeds when both fee BPS are set to zero", async function () {
        await escrow.connect(owner).setFeeBps(0, 0);
        const orderId = makeId("zerobps1");
        // With 0 BPS, platformFee and creatorFee can be 0
        // escrow = 0 + 0 + AUTH_FEE + SHIPPING_FEE + SALES_TAX + sellerPayout
        const payout = SELLER_PAYOUT + PLATFORM_FEE + CREATOR_FEE; // seller gets it all
        const esc    = payout + AUTH_FEE + SHIPPING_FEE + SALES_TAX;
        await usdc.connect(buyer).approve(await escrow.getAddress(), esc);
        await expect(
          fundOrder(escrow, buyer, seller, null, orderId, {
            escrowAmount:  esc,
            platformFee:   0n,
            creatorFee:    0n,
            sellerPayout:  payout,
          })
        ).to.emit(escrow, "OrderFunded");
      });
    });

    // ── feeRecipient timelock — propose twice ────────────────────
    describe("feeRecipient double-propose", function () {
      it("second proposal overwrites the first cleanly", async function () {
        const addrA = ethers.Wallet.createRandom().address;
        const addrB = ethers.Wallet.createRandom().address;
        await escrow.connect(guardian).proposeFeeRecipient(addrA);
        // Propose again before executing — should overwrite
        await escrow.connect(guardian).proposeFeeRecipient(addrB);
        expect(await escrow.pendingFeeRecipient()).to.equal(addrB);
        // Execute after delay — gets addrB, not addrA
        await time.increase(48 * 3600 + 1);
        await escrow.connect(guardian).executeFeeRecipientChange();
        expect(await escrow.feeRecipient()).to.equal(addrB);
      });
    });

    // ── Empty batch arrays ───────────────────────────────────────
    describe("Empty batch arrays", function () {
      it("batchMarkDelivered with empty array does not revert", async function () {
        await expect(escrow.connect(operator).batchMarkDelivered([])).to.not.be.reverted;
      });
      it("batchReleaseEscrow with empty array does not revert", async function () {
        await expect(escrow.connect(operator).batchReleaseEscrow([])).to.not.be.reverted;
      });
      it("batchRefundBuyers with empty array does not revert", async function () {
        await expect(escrow.connect(owner).batchRefundBuyers([])).to.not.be.reverted;
      });
      it("batchCancelOrders with empty array does not revert", async function () {
        await expect(escrow.connect(operator).batchCancelOrders([])).to.not.be.reverted;
      });
      it("batchResolveDisputes with empty array does not revert", async function () {
        await expect(escrow.connect(owner).batchResolveDisputes([], [])).to.not.be.reverted;
      });
    });

    // ── Sweep includes seller bonds ──────────────────────────────
    describe("sweepStuckFunds includes seller bonds", function () {
      it("sweep captures both buyer escrow and seller bond", async function () {
        const orderId    = makeId("sweep_bonds");
        await fundOrder(escrow, buyer, seller, null, orderId);
        await escrow.connect(seller).confirmOrder(orderId); // seller bond now in contract

        const contractBalance = await usdc.balanceOf(await escrow.getAddress());
        expect(contractBalance).to.equal(ESCROW + SELLER_BOND);

        await escrow.connect(owner).pause();
        await escrow.connect(owner).sweepStuckFunds(stranger.address);

        expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(0n);
        expect(await usdc.balanceOf(stranger.address)).to.equal(contractBalance);
      });
    });

    // ── Guardian removes themselves ──────────────────────────────
    describe("Guardian self-removal", function () {
      it("guardian can remove themselves if another guardian exists", async function () {
        const GUARDIAN_DELAY = 48 * 60 * 60;
        // Add G2 first
        await escrow.connect(guardian).proposeGuardianChange(stranger.address, true);
        await ethers.provider.send("evm_increaseTime", [GUARDIAN_DELAY + 1]);
        await ethers.provider.send("evm_mine");
        await escrow.connect(guardian).executeGuardianChange();
        // G1 proposes to remove themselves
        await escrow.connect(guardian).proposeGuardianChange(guardian.address, false);
        await ethers.provider.send("evm_increaseTime", [GUARDIAN_DELAY + 1]);
        await ethers.provider.send("evm_mine");
        await expect(escrow.connect(guardian).executeGuardianChange())
          .to.emit(escrow, "GuardianRemoved").withArgs(guardian.address);
        expect(await escrow.isGuardian(guardian.address)).to.be.false;
        expect(await escrow.isGuardian(stranger.address)).to.be.true;
        expect(await escrow.guardianCount()).to.equal(1n);
      });
    });

    // ── Non-existent order ───────────────────────────────────────
    describe("Operations on non-existent orders", function () {
      it("markDelivered reverts on non-existent order", async function () {
        await expect(
          escrow.connect(operator).markDelivered(makeId("ghost"))
        ).to.be.revertedWith("Order does not exist");
      });
      it("releaseEscrow reverts on non-existent order", async function () {
        await expect(
          escrow.connect(buyer).releaseEscrow(makeId("ghost2"))
        ).to.be.revertedWith("Order does not exist");
      });
      it("cancelOrder reverts on non-existent order", async function () {
        await expect(
          escrow.connect(operator).cancelOrder(makeId("ghost3"))
        ).to.be.revertedWith("Order does not exist");
      });
    });

  }); // Edge cases & attack scenarios
});
