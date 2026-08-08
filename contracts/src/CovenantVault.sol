// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ContractRegistry} from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";
import {IAssetManager} from "@flarenetwork/flare-periphery-contracts/coston2/IAssetManager.sol";
import {PolicyLib} from "./PolicyLib.sol";

// Core vault: deposits, policies, pay(). One vault per deployment; FXRP
// balances are tracked per owner, so an owner's covenants all draw from that
// one deposit.
//
// FTSO v2 XRP/USD feed id, verified against dev.flare.network docs and
// re-derived from the encoding spec (0x01 + hex("XRP/USD") + zero-pad to 21
// bytes), then confirmed live via `cast call` on Coston2. See
// web/lib/flare/constants.ts for the same value plus notes.
bytes21 constant XRP_USD_FEED_ID = 0x015852502f55534400000000000000000000000000;

contract CovenantVault {
    using PolicyLib for PolicyLib.Policy;

    /// Reject an FTSO price older than this. Measured live on Coston2, the
    /// XRP/USD feed was ~19s old, so an hour is far past any healthy update
    /// interval: it will not reject a live feed, but it does stop the vault
    /// pricing a payment off a feed that has genuinely stopped updating.
    uint256 public constant MAX_PRICE_AGE = 1 hours;

    /// Bounds the isRecipientAllowed loop so a covenant can never be created
    /// with a recipient list so long that pay() runs out of gas permanently.
    uint256 public constant MAX_ALLOWED_RECIPIENTS = 50;

    struct Covenant {
        address owner;
        address agent;
        PolicyLib.Policy policy;
        uint256 spentUsdCents;
        bool active;
    }

    IERC20 public immutable fxrpToken;

    mapping(uint256 => Covenant) public covenants;
    mapping(address => uint256) public balanceFXRP;
    uint256 public nextCovenantId;

    event Deposited(address indexed owner, uint256 amountFXRP);
    event Withdrawn(address indexed owner, uint256 amountFXRP);
    event CovenantCreated(uint256 indexed covenantId, address indexed owner, address indexed agent);
    event CovenantRevoked(uint256 indexed covenantId, address indexed owner);
    event PaymentExecuted(
        uint256 indexed covenantId, address indexed recipient, uint256 amountFXRP, uint256 usdCents, bytes memo
    );

    constructor() {
        // Resolve FXRP dynamically -- never hardcode, FAssets contracts can be
        // redeployed across testnet resets. The AssetManagerFXRP address itself
        // comes from the ContractRegistry, the one address that is safe to
        // hardcode (identical on every Flare network).
        IAssetManager assetManager = IAssetManager(ContractRegistry.getContractAddressByName("AssetManagerFXRP"));
        fxrpToken = assetManager.fAsset();
    }

    function deposit(uint256 amountFXRP) external {
        require(amountFXRP > 0, "amount is zero");
        require(fxrpToken.transferFrom(msg.sender, address(this), amountFXRP), "FXRP transferFrom failed");
        balanceFXRP[msg.sender] += amountFXRP;
        emit Deposited(msg.sender, amountFXRP);
    }

    /// Owners keep custody: whatever has not been spent under a covenant can be
    /// pulled back out at any time. Note this draws from the same shared
    /// balance the owner's covenants spend from, so withdrawing can leave an
    /// active covenant unable to pay.
    function withdraw(uint256 amountFXRP) external {
        require(amountFXRP > 0, "amount is zero");
        require(balanceFXRP[msg.sender] >= amountFXRP, "insufficient balance");
        balanceFXRP[msg.sender] -= amountFXRP;
        require(fxrpToken.transfer(msg.sender, amountFXRP), "FXRP transfer failed");
        emit Withdrawn(msg.sender, amountFXRP);
    }

    function createCovenant(address agent, PolicyLib.Policy calldata policy) external returns (uint256 covenantId) {
        require(agent != address(0), "agent is zero address");
        require(policy.expiry > block.timestamp, "expiry in the past");
        require(policy.allowedRecipients.length > 0, "no allowed recipients");
        require(policy.allowedRecipients.length <= MAX_ALLOWED_RECIPIENTS, "too many recipients");
        require(policy.usdBudgetTotal > 0, "budget is zero");
        require(policy.usdMaxPerRequest > 0, "max per request is zero");
        require(policy.usdMaxPerRequest <= policy.usdBudgetTotal, "max per request exceeds budget");

        covenantId = nextCovenantId++;
        Covenant storage c = covenants[covenantId];
        c.owner = msg.sender;
        c.agent = agent;
        c.policy = policy;
        c.active = true;
        emit CovenantCreated(covenantId, msg.sender, agent);
    }

    /// Kill switch for the owner. The agent's authority ends immediately; funds
    /// were never held by the agent, so nothing needs to be clawed back.
    function revokeCovenant(uint256 covenantId) external {
        Covenant storage c = covenants[covenantId];
        require(c.owner == msg.sender, "not covenant owner");
        require(c.active, "covenant not active");
        c.active = false;
        emit CovenantRevoked(covenantId, msg.sender);
    }

    function pay(uint256 covenantId, address recipient, uint256 amountFXRP, bytes calldata memo) external {
        require(amountFXRP > 0, "amount is zero");

        Covenant storage c = covenants[covenantId];
        require(c.active, "covenant not active");
        require(msg.sender == c.agent, "not covenant agent");
        require(c.policy.isNotExpired(block.timestamp), "covenant expired");
        require(c.policy.isRecipientAllowed(recipient), "recipient not allowed");

        // The FTSO v2 price read happens INSIDE pay(), on-chain. This is the
        // core Flare integration and must not move off-chain: it is what turns
        // a USD-denominated policy into an enforceable FXRP spending limit.
        (uint256 priceWei, uint64 priceTimestamp) = ContractRegistry.getFtsoV2().getFeedByIdInWei(XRP_USD_FEED_ID);

        // A zero price would value every payment at $0, which passes every
        // budget check and would let an agent drain the vault for free.
        require(priceWei > 0, "FTSO price unavailable");

        uint256 priceAge = block.timestamp > priceTimestamp ? block.timestamp - uint256(priceTimestamp) : 0;
        require(priceAge <= MAX_PRICE_AGE, "FTSO price stale");

        uint256 usdCents = _fxrpToUsdCents(amountFXRP, priceWei);

        require(c.policy.isWithinBudget(c.spentUsdCents, usdCents), "over budget");
        require(balanceFXRP[c.owner] >= amountFXRP, "insufficient vault balance");

        // Effects before interaction.
        balanceFXRP[c.owner] -= amountFXRP;
        c.spentUsdCents += usdCents;

        require(fxrpToken.transfer(recipient, amountFXRP), "FXRP transfer failed");
        emit PaymentExecuted(covenantId, recipient, amountFXRP, usdCents, memo);
    }

    /// FXRP carries 6 decimals (XRPL drop precision, not the usual ERC20 18),
    /// confirmed on Coston2 via `cast call <fxrp> decimals()`. priceWei is USD
    /// per whole XRP at 18 decimals, so dividing by 1e(6+18) yields whole USD
    /// and 1e22 yields cents.
    ///
    /// Rounds UP. Truncating would let any payment worth less than one cent
    /// price at 0 cents, consume no budget, and still move FXRP -- repeated,
    /// that drains the vault while the budget appears untouched. Rounding up
    /// means every non-zero payment costs at least one cent of budget.
    function _fxrpToUsdCents(uint256 amountFXRP, uint256 priceWei) internal pure returns (uint256) {
        uint256 numerator = amountFXRP * priceWei;
        if (numerator == 0) return 0;
        return (numerator + 1e22 - 1) / 1e22;
    }
}
