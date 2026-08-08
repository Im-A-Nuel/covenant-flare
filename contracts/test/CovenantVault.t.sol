// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {IFlareContractRegistry} from "@flarenetwork/flare-periphery-contracts/coston2/IFlareContractRegistry.sol";
import {ContractRegistry} from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";
import {CovenantVault} from "../src/CovenantVault.sol";
import {PolicyLib} from "../src/PolicyLib.sol";
import {MockFXRP, MockAssetManager, MockFtsoV2} from "./mocks/Mocks.sol";

contract CovenantVaultTest is Test {
    address constant REGISTRY = ContractRegistry.FLARE_CONTRACT_REGISTRY_ADDRESS;

    // ~$1.0332 / XRP in 18-decimal wei, matching a live Coston2 read.
    uint256 constant PRICE_WEI = 1_033_150_000_000_000_000;

    CovenantVault vault;
    MockFXRP fxrp;
    MockFtsoV2 ftso;

    address owner = makeAddr("owner");
    address agent = makeAddr("agent");
    address recipient = makeAddr("recipient");
    address strangerRecipient = makeAddr("strangerRecipient");

    function setUp() public {
        fxrp = new MockFXRP();
        MockAssetManager assetManager = new MockAssetManager(fxrp);
        ftso = new MockFtsoV2();

        // The real ContractRegistry (fixed address on every Flare network) has
        // no bytecode in a fresh forge EVM, so its lookups are stubbed here
        // rather than forking Coston2 -- keeps tests fast and deterministic.
        vm.mockCall(
            REGISTRY,
            abi.encodeWithSelector(IFlareContractRegistry.getContractAddressByName.selector, "AssetManagerFXRP"),
            abi.encode(address(assetManager))
        );
        vm.mockCall(
            REGISTRY,
            abi.encodeWithSelector(
                IFlareContractRegistry.getContractAddressByHash.selector, keccak256(abi.encode("FtsoV2"))
            ),
            abi.encode(address(ftso))
        );

        vault = new CovenantVault();
        ftso.setPrice(PRICE_WEI, uint64(block.timestamp));

        fxrp.mint(owner, 10_000_000); // 10 FXRP (6 decimals)
        vm.prank(owner);
        fxrp.approve(address(vault), type(uint256).max);
    }

    function _policy(uint256 usdBudgetTotal, uint256 usdMaxPerRequest)
        internal
        view
        returns (PolicyLib.Policy memory)
    {
        address[] memory allowed = new address[](1);
        allowed[0] = recipient;
        return PolicyLib.Policy({
            usdBudgetTotal: usdBudgetTotal,
            usdMaxPerRequest: usdMaxPerRequest,
            expiry: block.timestamp + 1 days,
            allowedRecipients: allowed,
            purposeHash: keccak256("test purpose")
        });
    }

    function _openCovenant(uint256 usdBudgetTotal, uint256 usdMaxPerRequest) internal returns (uint256 covenantId) {
        vm.prank(owner);
        covenantId = vault.createCovenant(agent, _policy(usdBudgetTotal, usdMaxPerRequest));
    }

    /* ------------------------------------------------------------------ */
    /* deposit / withdraw                                                  */
    /* ------------------------------------------------------------------ */

    function test_deposit_creditsOwnerBalance() public {
        vm.prank(owner);
        vault.deposit(5_000_000);
        assertEq(vault.balanceFXRP(owner), 5_000_000);
        assertEq(fxrp.balanceOf(address(vault)), 5_000_000);
    }

    function test_deposit_revertsOnZero() public {
        vm.prank(owner);
        vm.expectRevert("amount is zero");
        vault.deposit(0);
    }

    function test_withdraw_returnsFundsToOwner() public {
        vm.startPrank(owner);
        vault.deposit(5_000_000);
        vault.withdraw(2_000_000);
        vm.stopPrank();

        assertEq(vault.balanceFXRP(owner), 3_000_000);
        assertEq(fxrp.balanceOf(owner), 10_000_000 - 5_000_000 + 2_000_000);
    }

    function test_withdraw_revertsOverBalance() public {
        vm.startPrank(owner);
        vault.deposit(1_000_000);
        vm.expectRevert("insufficient balance");
        vault.withdraw(1_000_001);
        vm.stopPrank();
    }

    function test_withdraw_cannotTouchAnotherOwnersBalance() public {
        vm.prank(owner);
        vault.deposit(5_000_000);

        vm.prank(agent); // agent never deposited
        vm.expectRevert("insufficient balance");
        vault.withdraw(1);
    }

    /* ------------------------------------------------------------------ */
    /* createCovenant validation                                           */
    /* ------------------------------------------------------------------ */

    function test_createCovenant_revertsOnZeroAgent() public {
        vm.prank(owner);
        vm.expectRevert("agent is zero address");
        vault.createCovenant(address(0), _policy(1_000, 500));
    }

    function test_createCovenant_revertsOnPastExpiry() public {
        PolicyLib.Policy memory p = _policy(1_000, 500);
        p.expiry = block.timestamp; // not strictly in the future
        vm.prank(owner);
        vm.expectRevert("expiry in the past");
        vault.createCovenant(agent, p);
    }

    function test_createCovenant_revertsOnEmptyRecipients() public {
        PolicyLib.Policy memory p = _policy(1_000, 500);
        p.allowedRecipients = new address[](0);
        vm.prank(owner);
        vm.expectRevert("no allowed recipients");
        vault.createCovenant(agent, p);
    }

    function test_createCovenant_revertsOnTooManyRecipients() public {
        PolicyLib.Policy memory p = _policy(1_000, 500);
        p.allowedRecipients = new address[](51); // MAX_ALLOWED_RECIPIENTS is 50
        vm.prank(owner);
        vm.expectRevert("too many recipients");
        vault.createCovenant(agent, p);
    }

    function test_createCovenant_revertsWhenMaxPerRequestExceedsBudget() public {
        vm.prank(owner);
        vm.expectRevert("max per request exceeds budget");
        vault.createCovenant(agent, _policy(100, 101));
    }

    function test_createCovenant_revertsOnZeroBudget() public {
        vm.prank(owner);
        vm.expectRevert("budget is zero");
        vault.createCovenant(agent, _policy(0, 0));
    }

    /* ------------------------------------------------------------------ */
    /* pay: happy path                                                     */
    /* ------------------------------------------------------------------ */

    function test_pay_approved_transfersFundsAndTracksSpend() public {
        vm.prank(owner);
        vault.deposit(10_000_000);
        uint256 covenantId = _openCovenant(1_000, 500); // $10.00 budget, $5.00 per-request cap

        // 2.1 FXRP * ~$1.0332 =~ $2.17 -> 217 cents (rounded up), under both caps.
        vm.prank(agent);
        vault.pay(covenantId, recipient, 2_100_000, "invoice #1");

        assertEq(fxrp.balanceOf(recipient), 2_100_000);
        (,,, uint256 spentUsdCents,) = vault.covenants(covenantId);
        assertEq(spentUsdCents, 217); // ceil(2.1 * 1.03315 * 100) = ceil(216.96)
        assertEq(vault.balanceFXRP(owner), 10_000_000 - 2_100_000);
    }

    /* ------------------------------------------------------------------ */
    /* pay: policy rejections                                              */
    /* ------------------------------------------------------------------ */

    function test_pay_revertsOverMaxPerRequest() public {
        vm.prank(owner);
        vault.deposit(10_000_000);
        uint256 covenantId = _openCovenant(100_000, 100); // $1.00 per-request cap

        vm.prank(agent);
        vm.expectRevert("over budget");
        vault.pay(covenantId, recipient, 2_100_000, "too big"); // ~$2.17 > $1.00 cap
    }

    /// Distinct from the per-request cap: each payment is individually under
    /// the cap, but their running total is not.
    function test_pay_revertsOverTotalBudget() public {
        vm.prank(owner);
        vault.deposit(10_000_000);
        uint256 covenantId = _openCovenant(300, 300); // $3.00 budget, $3.00 per-request

        vm.startPrank(agent);
        vault.pay(covenantId, recipient, 2_100_000, "first"); // ~$2.17, fits
        vm.expectRevert("over budget");
        vault.pay(covenantId, recipient, 2_100_000, "second"); // 217 + 217 > 300
        vm.stopPrank();

        (,,, uint256 spentUsdCents,) = vault.covenants(covenantId);
        assertEq(spentUsdCents, 217, "rejected payment must not be charged");
    }

    function test_pay_revertsForDisallowedRecipient() public {
        vm.prank(owner);
        vault.deposit(10_000_000);
        uint256 covenantId = _openCovenant(100_000, 100_000);

        vm.prank(agent);
        vm.expectRevert("recipient not allowed");
        vault.pay(covenantId, strangerRecipient, 1_000_000, "wrong recipient");
    }

    function test_pay_revertsForNonAgentCaller() public {
        vm.prank(owner);
        vault.deposit(10_000_000);
        uint256 covenantId = _openCovenant(100_000, 100_000);

        vm.expectRevert("not covenant agent");
        vault.pay(covenantId, recipient, 1_000_000, "not the agent");
    }

    function test_pay_revertsAfterExpiry() public {
        vm.prank(owner);
        vault.deposit(10_000_000);
        uint256 covenantId = _openCovenant(100_000, 100_000);

        vm.warp(block.timestamp + 2 days);
        ftso.setPrice(PRICE_WEI, uint64(block.timestamp)); // keep the feed fresh
        vm.prank(agent);
        vm.expectRevert("covenant expired");
        vault.pay(covenantId, recipient, 1_000_000, "expired");
    }

    function test_pay_revertsWhenVaultBalanceTooLow() public {
        vm.prank(owner);
        vault.deposit(1_000_000); // 1 FXRP deposited
        uint256 covenantId = _openCovenant(100_000, 100_000);

        vm.prank(agent);
        vm.expectRevert("insufficient vault balance");
        vault.pay(covenantId, recipient, 2_000_000, "more than deposited");
    }

    function test_pay_revertsOnZeroAmount() public {
        vm.prank(owner);
        vault.deposit(10_000_000);
        uint256 covenantId = _openCovenant(100_000, 100_000);

        vm.prank(agent);
        vm.expectRevert("amount is zero");
        vault.pay(covenantId, recipient, 0, "zero");
    }

    /* ------------------------------------------------------------------ */
    /* pay: FTSO price integrity (the drain vectors found in audit)         */
    /* ------------------------------------------------------------------ */

    /// A zero FTSO price would value every payment at $0, passing every budget
    /// check while still moving FXRP. Must revert instead.
    function test_pay_revertsOnZeroFtsoPrice() public {
        vm.prank(owner);
        vault.deposit(10_000_000);
        uint256 covenantId = _openCovenant(100_000, 100_000);

        ftso.setPrice(0, uint64(block.timestamp));
        vm.prank(agent);
        vm.expectRevert("FTSO price unavailable");
        vault.pay(covenantId, recipient, 1_000_000, "zero price");
    }

    function test_pay_revertsOnStaleFtsoPrice() public {
        vm.prank(owner);
        vault.deposit(10_000_000);
        uint256 covenantId = _openCovenant(100_000, 100_000);

        // Feed frozen just over MAX_PRICE_AGE ago.
        vm.warp(block.timestamp + vault.MAX_PRICE_AGE() + 1);
        vm.prank(agent);
        vm.expectRevert("FTSO price stale");
        vault.pay(covenantId, recipient, 1_000_000, "stale price");
    }

    function test_pay_acceptsPriceRightAtMaxAge() public {
        vm.prank(owner);
        vault.deposit(10_000_000);
        uint256 covenantId = _openCovenant(100_000, 100_000);

        vm.warp(block.timestamp + vault.MAX_PRICE_AGE()); // exactly at the limit
        vm.prank(agent);
        vault.pay(covenantId, recipient, 1_000_000, "boundary");
        assertEq(fxrp.balanceOf(recipient), 1_000_000);
    }

    /// Dust payments used to truncate to 0 cents: FXRP moved but the budget was
    /// never charged, so an agent could repeat it until the vault was empty.
    /// Rounding up means every non-zero payment costs at least one cent.
    function test_pay_dustPaymentStillChargesBudget() public {
        vm.prank(owner);
        vault.deposit(10_000_000);
        uint256 covenantId = _openCovenant(100_000, 100_000);

        vm.prank(agent);
        vault.pay(covenantId, recipient, 1, "one drop"); // worth far less than a cent

        (,,, uint256 spentUsdCents,) = vault.covenants(covenantId);
        assertEq(spentUsdCents, 1, "dust must still cost a cent of budget");
    }

    /// End-to-end version of the same attack: a tiny budget must stop a
    /// repeated dust drain well before the vault balance is exhausted.
    function test_pay_dustDrainIsBoundedByBudget() public {
        vm.prank(owner);
        vault.deposit(10_000_000);
        uint256 covenantId = _openCovenant(3, 3); // $0.03 budget = 3 cents

        vm.startPrank(agent);
        vault.pay(covenantId, recipient, 1, "1");
        vault.pay(covenantId, recipient, 1, "2");
        vault.pay(covenantId, recipient, 1, "3");
        vm.expectRevert("over budget"); // 4th exceeds the 3-cent budget
        vault.pay(covenantId, recipient, 1, "4");
        vm.stopPrank();

        assertEq(fxrp.balanceOf(recipient), 3, "drain stopped by budget, not by balance");
    }

    /* ------------------------------------------------------------------ */
    /* revoke                                                              */
    /* ------------------------------------------------------------------ */

    function test_revoke_stopsFurtherPayments() public {
        vm.prank(owner);
        vault.deposit(10_000_000);
        uint256 covenantId = _openCovenant(100_000, 100_000);

        vm.prank(owner);
        vault.revokeCovenant(covenantId);

        vm.prank(agent);
        vm.expectRevert("covenant not active");
        vault.pay(covenantId, recipient, 1_000_000, "after revoke");
    }

    function test_revoke_onlyOwner() public {
        uint256 covenantId = _openCovenant(100_000, 100_000);
        vm.prank(agent);
        vm.expectRevert("not covenant owner");
        vault.revokeCovenant(covenantId);
    }

    function test_revoke_revertsIfAlreadyRevoked() public {
        uint256 covenantId = _openCovenant(100_000, 100_000);
        vm.startPrank(owner);
        vault.revokeCovenant(covenantId);
        vm.expectRevert("covenant not active");
        vault.revokeCovenant(covenantId);
        vm.stopPrank();
    }

    /* ------------------------------------------------------------------ */
    /* isolation between covenants                                         */
    /* ------------------------------------------------------------------ */

    function test_agentCannotSpendAnotherCovenant() public {
        vm.prank(owner);
        vault.deposit(10_000_000);
        uint256 covA = _openCovenant(100_000, 100_000);

        address otherAgent = makeAddr("otherAgent");
        vm.prank(owner);
        vault.createCovenant(otherAgent, _policy(100_000, 100_000));

        // otherAgent holds covenant #1 but tries to spend covenant #0.
        vm.prank(otherAgent);
        vm.expectRevert("not covenant agent");
        vault.pay(covA, recipient, 1_000_000, "cross-covenant");
    }
}
