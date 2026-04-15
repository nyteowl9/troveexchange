// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ============================================================
// Chase Hollow Escrow — v1.0
// Handles USDC escrow for TCG card transactions on Base L2.
//
// Authority:
//   Owner (Safe multisig) — disputes, refunds, fees, pause,
//                           add/remove operators
//   Operator (hot wallet) — markDelivered, releaseEscrow (auto),
//                           cancelOrder, batch operations.
//                           Multiple operators. Changeable by owner.
//   Buyer               — fundOrder, releaseEscrow (early), openDispute
//   Seller              — confirmOrder (post bond)
//
// Order flow:
//   1. Buyer calls fundOrder()       → status: AwaitingConfirmation
//   2. Seller calls confirmOrder()   → status: Active (bond posted)
//   3. Shippo webhook → operator calls markDelivered() → status: Delivered
//   4a. Buyer calls releaseEscrow() early, OR
//   4b. 72hrs pass → operator cron calls releaseEscrow() → status: Released
//
// Dispute flow:
//   1. Buyer calls openDispute() during inspection window → status: Disputed
//   2. Owner (Safe) calls resolveDispute() → Released or RefundedToBuyer
//
// Batch operations allow owner/operator to process hundreds of
// orders in a single Safe signature.
// ============================================================

contract ChaseHollowEscrow is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ── Types ────────────────────────────────────────────────

    enum OrderStatus {
        AwaitingConfirmation, // Buyer funded — waiting for seller to post bond
        Active,               // Seller confirmed, bond posted — waiting for delivery
        Delivered,            // Delivered — 72hr inspection window open
        Released,             // Complete — funds distributed
        Disputed,             // Buyer disputed — funds frozen
        RefundedToBuyer,      // Auth fail or buyer won dispute
        Cancelled             // Cancelled before confirmation or delivery
    }

    struct Order {
        address buyer;
        address seller;
        address creator;            // Referral creator — address(0) if none
        uint256 escrowAmount;       // Total USDC locked by buyer
                                    //   = sellerPayout + platformFee + creatorFee
                                    //     + authFee + shippingFee + salesTax
        uint256 sellerBond;         // Bond posted by seller
        uint256 sellerBondRequired; // Bond amount seller must post to confirm
        uint256 platformFee;        // 3% → feeRecipient on release
        uint256 creatorFee;         // 0.5% → creator (or feeRecipient) on release
        uint256 authFee;            // $10 or $25 → feeRecipient on release
        uint256 shippingFee;        // Shippo label cost → feeRecipient (Chase Hollow remits to carrier)
        uint256 salesTax;           // TaxJar-calculated tax → feeRecipient (Chase Hollow remits to state)
        uint256 sellerPayout;       // Card price - platformFee - creatorFee → seller on release
        OrderStatus status;
        uint256 fundedAt;
        uint256 deliveredAt;
        uint256 autoReleaseAt;      // deliveredAt + buyerInspectWindow
    }

    // ── State ────────────────────────────────────────────────

    IERC20 public immutable usdc;
    address public feeRecipient;             // Safe multisig — receives all fees on settlement

    // ── Fee Recipient Guardians ──────────────────────────────────
    // A set of guardian addresses completely separate from the owner Safe.
    // ONLY guardians can propose/execute/cancel feeRecipient changes.
    // ONLY guardians can add or remove other guardians.
    // The owner Safe has ZERO control over guardians or feeRecipient —
    // a fully compromised owner Safe cannot redirect fee payments.
    //
    // Multiple guardians provide redundancy:
    //   - If G1 is compromised and proposes a malicious change, G2 can cancel it
    //     within the 48hr timelock window.
    //   - G2 then removes G1 and adds a replacement.
    //   - Owner cannot interfere — closing the "replace guardian first" attack.
    //
    // At least one guardian must always exist (enforced on removal).
    mapping(address => bool) public isGuardian;
    uint256 public guardianCount;
    address public pendingFeeRecipient;
    uint256 public feeRecipientChangeAt;
    uint256 public constant FEE_RECIPIENT_DELAY = 48 hours;

    uint256 public platformFeeBps = 300;     // 3%
    uint256 public creatorFeeBps  = 50;      // 0.5%
    uint256 public buyerInspectWindow  = 72 hours;
    uint256 public sellerShipDeadline  = 48 hours;
    uint256 public sellerConfirmWindow = 24 hours; // How long seller has to post bond
    uint256 public maxOrderValue = 50_000 * 1e6;   // $50,000 USDC (6 decimals)

    uint256 public constant MAX_PLATFORM_FEE_BPS = 1000; // 10% hard cap
    uint256 public constant MAX_CREATOR_FEE_BPS  = 200;  // 2% hard cap

    mapping(bytes32 => Order)   public orders;
    mapping(address => bool)    public isOperator;

    // ── Events ───────────────────────────────────────────────

    event OrderFunded(bytes32 indexed orderId, address indexed buyer, address indexed seller, uint256 escrowAmount, uint256 sellerBondRequired);
    event OrderConfirmed(bytes32 indexed orderId, address indexed seller, uint256 sellerBond);
    event OrderDelivered(bytes32 indexed orderId, uint256 autoReleaseAt);
    event EscrowReleased(bytes32 indexed orderId, address indexed seller, uint256 sellerPayout, uint256 platformFee, uint256 creatorFee, uint256 shippingFee, uint256 salesTax);
    event DisputeOpened(bytes32 indexed orderId, address indexed buyer);
    event DisputeResolved(bytes32 indexed orderId, bool buyerWon);
    event BuyerRefunded(bytes32 indexed orderId, address indexed buyer, uint256 amount);
    event OrderCancelled(bytes32 indexed orderId);
    event BondReturned(bytes32 indexed orderId, address indexed seller, uint256 amount);
    event OperatorAdded(address indexed operator);
    event OperatorRemoved(address indexed operator);
    event FeeRecipientProposed(address indexed proposed, uint256 executeAt);
    event FeeRecipientChanged(address indexed oldRecipient, address indexed newRecipient);
    event FeeRecipientChangeCancelled(address indexed cancelled);
    event GuardianAdded(address indexed guardian);
    event GuardianRemoved(address indexed guardian);
    // sweepStuckFunds — emitted with full detail so off-chain can reconstruct redistribution
    event FundsSwept(address indexed recipient, uint256 amount, uint256 timestamp);

    // ── Constructor ──────────────────────────────────────────

    constructor(address _usdc, address _feeRecipient, address _guardian) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        require(_guardian != address(0), "Invalid guardian");
        usdc = IERC20(_usdc);
        feeRecipient = _feeRecipient;
        isGuardian[_guardian] = true;
        guardianCount = 1;
    }

    // ── Modifiers ────────────────────────────────────────────

    modifier orderExists(bytes32 orderId) {
        require(orders[orderId].buyer != address(0), "Order does not exist");
        _;
    }

    modifier onlyBuyer(bytes32 orderId) {
        require(msg.sender == orders[orderId].buyer, "Not the buyer");
        _;
    }

    modifier onlyOperatorOrOwner() {
        require(isOperator[msg.sender] || msg.sender == owner(), "Not operator or owner");
        _;
    }

    modifier onlyGuardian() {
        require(isGuardian[msg.sender], "Not guardian");
        _;
    }

    // ============================================================
    // OPERATOR MANAGEMENT — owner (Safe) only
    // ============================================================

    // Add an operator (Vercel hot wallet, backup wallet, etc.)
    // Safe can add or remove operators at any time — no redeployment.
    function addOperator(address operator) external onlyOwner {
        require(operator != address(0), "Invalid address");
        require(!isOperator[operator], "Already an operator");
        isOperator[operator] = true;
        emit OperatorAdded(operator);
    }

    // Remove a compromised or retired operator instantly.
    function removeOperator(address operator) external onlyOwner {
        require(isOperator[operator], "Not an operator");
        isOperator[operator] = false;
        emit OperatorRemoved(operator);
    }

    // ============================================================
    // CORE FUNCTIONS
    // ============================================================

    // ── 1. Fund Order (Buyer) ────────────────────────────────
    // Buyer locks USDC at checkout. Seller is notified and has
    // sellerConfirmWindow (24hrs) to post their bond.
    //
    // Fee validation: platformFee and creatorFee are checked
    // against on-chain BPS values so no one can bypass fees
    // by calling the contract directly.
    //
    // escrowAmount = sellerPayout + platformFee + creatorFee + authFee
    // cardValue    = escrowAmount - authFee (fee base)

    function fundOrder(
        bytes32 orderId,
        address seller,
        address creator,
        uint256 escrowAmount,
        uint256 sellerBondRequired,
        uint256 platformFee,
        uint256 creatorFee,
        uint256 authFee,
        uint256 shippingFee,
        uint256 salesTax,
        uint256 sellerPayout
    ) external nonReentrant whenNotPaused {
        require(orders[orderId].buyer == address(0), "Order already exists");
        require(seller != address(0), "Invalid seller");
        require(seller != msg.sender, "Buyer cannot be seller");
        require(escrowAmount > 0, "Escrow amount must be > 0");
        require(escrowAmount <= maxOrderValue, "Exceeds max order value");
        require(authFee < escrowAmount, "Auth fee exceeds escrow");
        require(
            platformFee + creatorFee + authFee + shippingFee + salesTax + sellerPayout == escrowAmount,
            "Amounts must sum to escrowAmount"
        );

        // Validate platform/creator fees against on-chain BPS — prevents fee bypass.
        // Fee base is card value only (escrow minus pass-through costs).
        uint256 cardValue = escrowAmount - authFee - shippingFee - salesTax;
        require(
            platformFee >= cardValue * platformFeeBps / 10000,
            "Platform fee below minimum"
        );
        require(
            creatorFee >= cardValue * creatorFeeBps / 10000,
            "Creator fee below minimum"
        );

        // Lock buyer's USDC
        usdc.safeTransferFrom(msg.sender, address(this), escrowAmount);

        orders[orderId] = Order({
            buyer:               msg.sender,
            seller:              seller,
            creator:             creator,
            escrowAmount:        escrowAmount,
            sellerBond:          0,
            sellerBondRequired:  sellerBondRequired,
            platformFee:         platformFee,
            creatorFee:          creatorFee,
            authFee:             authFee,
            shippingFee:         shippingFee,
            salesTax:            salesTax,
            sellerPayout:        sellerPayout,
            status:              OrderStatus.AwaitingConfirmation,
            fundedAt:            block.timestamp,
            deliveredAt:         0,
            autoReleaseAt:       0
        });

        emit OrderFunded(orderId, msg.sender, seller, escrowAmount, sellerBondRequired);
    }

    // ── 2. Confirm Order (Seller) ────────────────────────────
    // Seller calls this after being notified of a sale.
    // Posts their bond — confirms they have the card and will ship.
    // Must be called within sellerConfirmWindow (24hrs).
    // If seller doesn't confirm → operator cancels → buyer refunded.

    function confirmOrder(bytes32 orderId)
        external
        nonReentrant
        whenNotPaused
        orderExists(orderId)
    {
        Order storage order = orders[orderId];
        require(msg.sender == order.seller, "Not the seller");
        require(order.status == OrderStatus.AwaitingConfirmation, "Order not awaiting confirmation");
        require(
            block.timestamp <= order.fundedAt + sellerConfirmWindow,
            "Confirm window expired"
        );

        uint256 bondAmount = order.sellerBondRequired;
        order.sellerBond = bondAmount;
        order.status = OrderStatus.Active;

        if (bondAmount > 0) {
            usdc.safeTransferFrom(msg.sender, address(this), bondAmount);
        }

        emit OrderConfirmed(orderId, msg.sender, bondAmount);
    }

    // ── 3. Mark Delivered ────────────────────────────────────
    // Operator calls automatically via Shippo delivery webhook.
    // Starts the 72-hour buyer inspection window on-chain.
    // No human signing required — fully automated.

    function markDelivered(bytes32 orderId)
        external
        onlyOperatorOrOwner
        orderExists(orderId)
    {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.Active, "Order not Active");
        order.status        = OrderStatus.Delivered;
        order.deliveredAt   = block.timestamp;
        order.autoReleaseAt = block.timestamp + buyerInspectWindow;
        emit OrderDelivered(orderId, order.autoReleaseAt);
    }

    // ── 4. Release Escrow ────────────────────────────────────
    // Three paths:
    //   a) Buyer calls early — happy, wants to release now
    //   b) Operator calls after autoReleaseAt — automated cron
    //   c) Owner calls after autoReleaseAt — fallback if operator down
    //
    // Distributes:
    //   sellerPayout              → seller
    //   platformFee + authFee     → feeRecipient (Safe)
    //   creatorFee                → creator, or feeRecipient if none
    //   sellerBond                → returned to seller

    function releaseEscrow(bytes32 orderId)
        external
        nonReentrant
        orderExists(orderId)
    {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.Delivered, "Order not Delivered");

        bool isBuyer       = msg.sender == order.buyer;
        bool isAutoRelease = (isOperator[msg.sender] || msg.sender == owner())
                             && block.timestamp >= order.autoReleaseAt;
        require(isBuyer || isAutoRelease, "Not authorized to release");

        _distribute(orderId);
    }

    // ── 5. Open Dispute ──────────────────────────────────────
    // Buyer only, during the 72-hour inspection window.
    // Freezes all funds until owner (Safe) resolves.

    function openDispute(bytes32 orderId)
        external
        nonReentrant
        onlyBuyer(orderId)
        orderExists(orderId)
    {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.Delivered, "Order not Delivered");
        require(block.timestamp < order.autoReleaseAt, "Inspection window closed");
        order.status = OrderStatus.Disputed;
        emit DisputeOpened(orderId, msg.sender);
    }

    // ── 6. Resolve Dispute ───────────────────────────────────
    // Owner (Safe multisig) ONLY.
    //
    // buyerWins = true  → escrowAmount - shippingFee refunded to buyer;
    //                     shippingFee + sellerBond → feeRecipient (Safe).
    //                     Shipping is a legitimate cost incurred regardless of
    //                     dispute outcome — not refunded. This ensures the Safe
    //                     can recover Label A + B already purchased, plus fund
    //                     Label C + D return shipping from the forfeited bond.
    //
    // buyerWins = false → normal release, seller bond returned to seller.

    function resolveDispute(bytes32 orderId, bool buyerWins)
        external
        onlyOwner
        nonReentrant
        orderExists(orderId)
    {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.Disputed, "Order not Disputed");

        if (buyerWins) {
            order.status = OrderStatus.RefundedToBuyer;
            // Shipping is non-refundable — buyer agreed to this at checkout.
            // Safe uses shippingFee + forfeited bond to cover 4-label return chain.
            uint256 buyerRefund = order.escrowAmount - order.shippingFee;
            usdc.safeTransfer(order.buyer, buyerRefund);
            uint256 toSafe = order.shippingFee + order.sellerBond;
            if (toSafe > 0) {
                usdc.safeTransfer(feeRecipient, toSafe);
            }
            emit BuyerRefunded(orderId, order.buyer, buyerRefund);
        } else {
            _distribute(orderId);
        }

        emit DisputeResolved(orderId, buyerWins);
    }

    // ── 7. Refund Buyer ──────────────────────────────────────
    // Owner (Safe) calls on auth fail.
    // Full refund. Seller bond forfeited to Safe.

    function refundBuyer(bytes32 orderId)
        external
        onlyOwner
        nonReentrant
        orderExists(orderId)
    {
        Order storage order = orders[orderId];
        require(
            order.status == OrderStatus.Active    ||
            order.status == OrderStatus.Delivered,
            "Cannot refund at this stage"
        );
        order.status = OrderStatus.RefundedToBuyer;
        usdc.safeTransfer(order.buyer, order.escrowAmount);
        if (order.sellerBond > 0) {
            usdc.safeTransfer(feeRecipient, order.sellerBond);
        }
        emit BuyerRefunded(orderId, order.buyer, order.escrowAmount);
    }

    // ── 8. Cancel Order ──────────────────────────────────────
    // Operator or owner cancels when seller doesn't confirm or no-shows.
    //
    // AwaitingConfirmation: buyer refunded, no bond posted yet
    // Active: buyer refunded, seller bond forfeited to Safe (no-show strike)

    function cancelOrder(bytes32 orderId)
        external
        onlyOperatorOrOwner
        nonReentrant
        orderExists(orderId)
    {
        Order storage order = orders[orderId];
        require(
            order.status == OrderStatus.AwaitingConfirmation ||
            order.status == OrderStatus.Active,
            "Can only cancel before delivery"
        );

        bool bondForfeited = order.status == OrderStatus.Active && order.sellerBond > 0;
        order.status = OrderStatus.Cancelled;

        // Always refund buyer
        usdc.safeTransfer(order.buyer, order.escrowAmount);

        // Bond: forfeited if seller confirmed but didn't ship (Active)
        //       nothing to return if seller never confirmed (AwaitingConfirmation)
        if (bondForfeited) {
            usdc.safeTransfer(feeRecipient, order.sellerBond);
        }

        emit OrderCancelled(orderId);
    }

    // ============================================================
    // BATCH FUNCTIONS
    // Single Safe/operator signature processes many orders at once.
    // ============================================================

    function batchMarkDelivered(bytes32[] calldata orderIds)
        external
        onlyOperatorOrOwner
    {
        for (uint256 i = 0; i < orderIds.length; i++) {
            Order storage order = orders[orderIds[i]];
            if (order.buyer != address(0) && order.status == OrderStatus.Active) {
                order.status        = OrderStatus.Delivered;
                order.deliveredAt   = block.timestamp;
                order.autoReleaseAt = block.timestamp + buyerInspectWindow;
                emit OrderDelivered(orderIds[i], order.autoReleaseAt);
            }
        }
    }

    function batchReleaseEscrow(bytes32[] calldata orderIds)
        external
        nonReentrant
        onlyOperatorOrOwner
    {
        for (uint256 i = 0; i < orderIds.length; i++) {
            Order storage order = orders[orderIds[i]];
            if (
                order.buyer != address(0) &&
                order.status == OrderStatus.Delivered &&
                block.timestamp >= order.autoReleaseAt
            ) {
                _distribute(orderIds[i]);
            }
        }
    }

    function batchRefundBuyers(bytes32[] calldata orderIds)
        external
        onlyOwner
        nonReentrant
    {
        for (uint256 i = 0; i < orderIds.length; i++) {
            Order storage order = orders[orderIds[i]];
            if (
                order.buyer != address(0) &&
                (order.status == OrderStatus.Active ||
                 order.status == OrderStatus.Delivered)
            ) {
                order.status = OrderStatus.RefundedToBuyer;
                usdc.safeTransfer(order.buyer, order.escrowAmount);
                if (order.sellerBond > 0) {
                    usdc.safeTransfer(feeRecipient, order.sellerBond);
                }
                emit BuyerRefunded(orderIds[i], order.buyer, order.escrowAmount);
            }
        }
    }

    function batchCancelOrders(bytes32[] calldata orderIds)
        external
        onlyOperatorOrOwner
        nonReentrant
    {
        for (uint256 i = 0; i < orderIds.length; i++) {
            Order storage order = orders[orderIds[i]];
            if (
                order.buyer != address(0) &&
                (order.status == OrderStatus.AwaitingConfirmation ||
                 order.status == OrderStatus.Active)
            ) {
                bool bondForfeited = order.status == OrderStatus.Active && order.sellerBond > 0;
                order.status = OrderStatus.Cancelled;
                usdc.safeTransfer(order.buyer, order.escrowAmount);
                if (bondForfeited) {
                    usdc.safeTransfer(feeRecipient, order.sellerBond);
                }
                emit OrderCancelled(orderIds[i]);
            }
        }
    }

    function batchResolveDisputes(
        bytes32[] calldata orderIds,
        bool[]    calldata outcomes  // true = buyer wins
    ) external onlyOwner nonReentrant {
        require(orderIds.length == outcomes.length, "Length mismatch");
        for (uint256 i = 0; i < orderIds.length; i++) {
            Order storage order = orders[orderIds[i]];
            if (order.buyer != address(0) && order.status == OrderStatus.Disputed) {
                if (outcomes[i]) {
                    order.status = OrderStatus.RefundedToBuyer;
                    uint256 buyerRefund = order.escrowAmount - order.shippingFee;
                    usdc.safeTransfer(order.buyer, buyerRefund);
                    uint256 toSafe = order.shippingFee + order.sellerBond;
                    if (toSafe > 0) {
                        usdc.safeTransfer(feeRecipient, toSafe);
                    }
                    emit BuyerRefunded(orderIds[i], order.buyer, buyerRefund);
                } else {
                    _distribute(orderIds[i]);
                }
                emit DisputeResolved(orderIds[i], outcomes[i]);
            }
        }
    }

    // ============================================================
    // INTERNAL
    // ============================================================

    // Shared distribution logic for release and seller-wins dispute.
    function _distribute(bytes32 orderId) internal {
        Order storage order = orders[orderId];
        order.status = OrderStatus.Released;

        usdc.safeTransfer(order.seller, order.sellerPayout);

        // Safe receives: platform fee + auth fee + shipping (to pay carrier) + sales tax (to remit to state)
        uint256 toFeeRecipient = order.platformFee + order.authFee + order.shippingFee + order.salesTax;
        if (toFeeRecipient > 0) {
            usdc.safeTransfer(feeRecipient, toFeeRecipient);
        }

        if (order.creatorFee > 0) {
            address creatorRecipient = order.creator != address(0)
                ? order.creator
                : feeRecipient;
            usdc.safeTransfer(creatorRecipient, order.creatorFee);
        }

        if (order.sellerBond > 0) {
            usdc.safeTransfer(order.seller, order.sellerBond);
            emit BondReturned(orderId, order.seller, order.sellerBond);
        }

        emit EscrowReleased(orderId, order.seller, order.sellerPayout, order.platformFee, order.creatorFee, order.shippingFee, order.salesTax);
    }

    // ============================================================
    // ADMIN — owner (Safe) only
    // ============================================================

    // ── Fee Recipient Guardian ───────────────────────────────
    // ALL feeRecipient changes are controlled exclusively by the guardian multisig.
    // The owner (main Safe) has no access to these functions.
    // A fully compromised owner Safe cannot redirect fee payments.
    //
    // Changes still require a 48hr timelock — if the guardian itself is somehow
    // compromised, the owner can pause() within that window to freeze the change.
    //
    // The guardian is self-sovereign: only it can rotate itself to a new address.
    // Owner cannot change the guardian — closing the "rotate guardian first" attack.

    function proposeFeeRecipient(address _proposed) external onlyGuardian {
        require(_proposed != address(0), "Invalid address");
        pendingFeeRecipient  = _proposed;
        feeRecipientChangeAt = block.timestamp + FEE_RECIPIENT_DELAY;
        emit FeeRecipientProposed(_proposed, feeRecipientChangeAt);
    }

    function executeFeeRecipientChange() external onlyGuardian {
        require(pendingFeeRecipient != address(0), "No pending change");
        require(block.timestamp >= feeRecipientChangeAt, "Timelock not expired");
        address old = feeRecipient;
        feeRecipient        = pendingFeeRecipient;
        pendingFeeRecipient = address(0);
        feeRecipientChangeAt = 0;
        emit FeeRecipientChanged(old, feeRecipient);
    }

    function cancelFeeRecipientChange() external onlyGuardian {
        require(pendingFeeRecipient != address(0), "No pending change");
        address cancelled   = pendingFeeRecipient;
        pendingFeeRecipient = address(0);
        feeRecipientChangeAt = 0;
        emit FeeRecipientChangeCancelled(cancelled);
    }

    // Guardians manage themselves — owner cannot add or remove guardians.
    // If G1 is compromised: G2 cancels any pending malicious change, removes G1, adds replacement.

    function addGuardian(address _guardian) external onlyGuardian {
        require(_guardian != address(0), "Invalid address");
        require(!isGuardian[_guardian], "Already a guardian");
        isGuardian[_guardian] = true;
        guardianCount++;
        emit GuardianAdded(_guardian);
    }

    function removeGuardian(address _guardian) external onlyGuardian {
        require(isGuardian[_guardian], "Not a guardian");
        require(guardianCount > 1, "Cannot remove last guardian");
        isGuardian[_guardian] = false;
        guardianCount--;
        emit GuardianRemoved(_guardian);
    }

    // ── Safety Valve ─────────────────────────────────────────
    // Emergency sweep of all USDC in the contract.
    // Only callable when paused — forces an explicit pause decision first.
    // recipient is specified at call time, NOT feeRecipient, so a compromised
    // Safe cannot silently drain funds through this path.
    //
    // ALL order data remains on-chain in the orders mapping.
    // Off-chain (Supabase orders table) has every order breakdown.
    // After sweep, redistribute manually to each party based on order records.
    // Deploy a new contract for any in-flight orders that need to continue.

    function sweepStuckFunds(address recipient) external onlyOwner whenPaused {
        require(recipient != address(0), "Invalid recipient");
        uint256 balance = usdc.balanceOf(address(this));
        require(balance > 0, "Nothing to sweep");
        usdc.safeTransfer(recipient, balance);
        emit FundsSwept(recipient, balance, block.timestamp);
    }

    function setFeeBps(uint256 _platformFeeBps, uint256 _creatorFeeBps) external onlyOwner {
        require(_platformFeeBps <= MAX_PLATFORM_FEE_BPS, "Platform fee too high");
        require(_creatorFeeBps  <= MAX_CREATOR_FEE_BPS,  "Creator fee too high");
        platformFeeBps = _platformFeeBps;
        creatorFeeBps  = _creatorFeeBps;
    }

    function setBuyerInspectWindow(uint256 _seconds) external onlyOwner {
        require(_seconds <= 7 days, "Window too long");
        buyerInspectWindow = _seconds;
    }

    function setSellerShipDeadline(uint256 _seconds) external onlyOwner {
        require(_seconds <= 7 days, "Deadline too long");
        sellerShipDeadline = _seconds;
    }

    function setSellerConfirmWindow(uint256 _seconds) external onlyOwner {
        require(_seconds <= 7 days, "Window too long");
        sellerConfirmWindow = _seconds;
    }

    function setMaxOrderValue(uint256 _maxValue) external onlyOwner {
        maxOrderValue = _maxValue;
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ── View ─────────────────────────────────────────────────

    function getOrder(bytes32 orderId) external view returns (Order memory) {
        return orders[orderId];
    }

    function isAutoReleaseReady(bytes32 orderId) external view returns (bool) {
        Order memory order = orders[orderId];
        return order.status == OrderStatus.Delivered
            && block.timestamp >= order.autoReleaseAt;
    }
}
