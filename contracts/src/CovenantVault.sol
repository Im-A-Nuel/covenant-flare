// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ContractRegistry} from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";
import {IAssetManager} from "@flarenetwork/flare-periphery-contracts/coston2/IAssetManager.sol";
import {PolicyLib} from "./PolicyLib.sol";

// Core vault: deposits, policies, pay(). One vault per deployment; balances are
// tracked per owner so multiple covenants (policy grants) can share one deposit.
//
// FTSO v2 XRP/USD feed id, verified against dev.flare.network docs and re-derived
// from the encoding spec (0x01 + hex("XRP/USD") + zero-pad to 21 bytes), then
// confirmed live via `cast call` on Coston2 on 2026-08-06 (returned ~$1.044,
// sane timestamp). See web/lib/flare/constants.ts for the same value + notes.
bytes21 constant XRP_USD_FEED_ID = 0x015852502f55534400000000000000000000000000;

// FXRP (FTestXRP) decimals on Coston2, confirmed via `cast call <fxrp>
// decimals()(uint8)` on 2026-08-06 -> 6 (matches XRPL drop precision, NOT the
// usual ERC20 default of 18). Used for the FXRP -> USD cents conversion below.
uint256 constant FXRP_DECIMALS = 6;

contract CovenantVault {
    using PolicyLib for PolicyLib.Policy;

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
    event CovenantCreated(uint256 indexed covenantId, address indexed owner, address indexed agent);
    event PaymentExecuted(
        uint256 indexed covenantId, address indexed recipient, uint256 amountFXRP, uint256 usdCents, bytes memo
    );

    constructor() {
        // Resolve FXRP token dynamically -- never hardcode, FAssets contracts
        // can be redeployed across testnet resets. AssetManagerFXRP address
        // itself is resolved from the ContractRegistry, the one address that's
        // safe to hardcode (fixed across every Flare network).
        IAssetManager assetManager =
            IAssetManager(ContractRegistry.getContractAddressByName("AssetManagerFXRP"));
        fxrpToken = assetManager.fAsset();
    }

    function deposit(uint256 amountFXRP) external {
        require(fxrpToken.transferFrom(msg.sender, address(this), amountFXRP), "FXRP transferFrom failed");
        balanceFXRP[msg.sender] += amountFXRP;
        emit Deposited(msg.sender, amountFXRP);
    }

    function createCovenant(address agent, PolicyLib.Policy calldata policy) external returns (uint256 covenantId) {
        covenantId = nextCovenantId++;
        Covenant storage c = covenants[covenantId];
        c.owner = msg.sender;
        c.agent = agent;
        c.policy = policy;
        c.active = true;
        emit CovenantCreated(covenantId, msg.sender, agent);
    }

    function pay(uint256 covenantId, address recipient, uint256 amountFXRP, bytes calldata memo) external {
        Covenant storage c = covenants[covenantId];
        require(c.active, "covenant not active");
        require(msg.sender == c.agent, "not covenant agent");
        require(c.policy.isNotExpired(block.timestamp), "covenant expired");
        require(c.policy.isRecipientAllowed(recipient), "recipient not allowed");

        // FTSO v2 price check happens INSIDE pay(), on-chain -- this is the
        // core Flare integration and must not move off-chain.
        (uint256 priceWei,) = ContractRegistry.getFtsoV2().getFeedByIdInWei(XRP_USD_FEED_ID);
        uint256 usdCents = _fxrpToUsdCents(amountFXRP, priceWei);

        require(c.policy.isWithinBudget(c.spentUsdCents, usdCents), "over budget");
        require(balanceFXRP[c.owner] >= amountFXRP, "insufficient vault balance");

        balanceFXRP[c.owner] -= amountFXRP;
        c.spentUsdCents += usdCents;

        require(fxrpToken.transfer(recipient, amountFXRP), "FXRP transfer failed");
        emit PaymentExecuted(covenantId, recipient, amountFXRP, usdCents, memo);
    }

    // amountFXRP (6-decimal FXRP units) * priceWei (18-decimal USD per whole
    // XRP) / 1e(6+18) gives whole USD; * 100 for cents == divide by 1e22.
    function _fxrpToUsdCents(uint256 amountFXRP, uint256 priceWei) internal pure returns (uint256) {
        return (amountFXRP * priceWei) / 1e22;
    }
}
