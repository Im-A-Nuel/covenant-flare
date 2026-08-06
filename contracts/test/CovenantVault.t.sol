// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {IFlareContractRegistry} from
    "@flarenetwork/flare-periphery-contracts/coston2/IFlareContractRegistry.sol";
import {ContractRegistry} from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";
import {CovenantVault} from "../src/CovenantVault.sol";
import {PolicyLib} from "../src/PolicyLib.sol";
import {MockFXRP, MockAssetManager, MockFtsoV2} from "./mocks/Mocks.sol";

contract CovenantVaultTest is Test {
    address constant REGISTRY = ContractRegistry.FLARE_CONTRACT_REGISTRY_ADDRESS;

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
            abi.encodeWithSelector(IFlareContractRegistry.getContractAddressByHash.selector, keccak256(abi.encode("FtsoV2"))),
            abi.encode(address(ftso))
        );

        vault = new CovenantVault();

        // ~$1.044 / XRP, 18-decimal wei -- same order of magnitude as the live
        // Coston2 read on 2026-08-06 (see constants.ts).
        ftso.setPrice(1_044_293_000_000_000_000, uint64(block.timestamp));

        fxrp.mint(owner, 10_000_000); // 10 FXRP (6 decimals)
        vm.prank(owner);
        fxrp.approve(address(vault), type(uint256).max);
    }

    function _openCovenant(uint256 usdBudgetTotal, uint256 usdMaxPerRequest) internal returns (uint256 covenantId) {
        address[] memory allowed = new address[](1);
        allowed[0] = recipient;
        PolicyLib.Policy memory policy = PolicyLib.Policy({
            usdBudgetTotal: usdBudgetTotal,
            usdMaxPerRequest: usdMaxPerRequest,
            expiry: block.timestamp + 1 days,
            allowedRecipients: allowed,
            purposeHash: keccak256("test purpose")
        });
        vm.prank(owner);
        covenantId = vault.createCovenant(agent, policy);
    }

    function test_deposit_creditsOwnerBalance() public {
        vm.prank(owner);
        vault.deposit(5_000_000);
        assertEq(vault.balanceFXRP(owner), 5_000_000);
        assertEq(fxrp.balanceOf(address(vault)), 5_000_000);
    }

    function test_pay_approved_transfersFundsAndTracksSpend() public {
        vm.prank(owner);
        vault.deposit(10_000_000);
        uint256 covenantId = _openCovenant(1_000, 500); // $10.00 budget, $5.00 per-request cap

        // 2.1 FXRP * ~$1.044 =~ $2.19 -> 219 cents, under both caps.
        vm.prank(agent);
        vault.pay(covenantId, recipient, 2_100_000, "invoice #1");

        assertEq(fxrp.balanceOf(recipient), 2_100_000);
        (,,, uint256 spentUsdCents,) = vault.covenants(covenantId);
        assertEq(spentUsdCents, 219);
        assertEq(vault.balanceFXRP(owner), 10_000_000 - 2_100_000);
    }

    function test_pay_revertsOverMaxPerRequest() public {
        vm.prank(owner);
        vault.deposit(10_000_000);
        uint256 covenantId = _openCovenant(100_000, 100); // $1.00 per-request cap

        vm.prank(agent);
        vm.expectRevert("over budget");
        vault.pay(covenantId, recipient, 2_100_000, "too big"); // ~$2.19 > $1.00 cap
    }

    function test_pay_revertsOverTotalBudget() public {
        vm.prank(owner);
        vault.deposit(10_000_000);
        uint256 covenantId = _openCovenant(200, 100_000); // $2.00 total budget, generous per-request cap

        vm.prank(agent);
        vm.expectRevert("over budget");
        vault.pay(covenantId, recipient, 2_100_000, "exceeds total budget"); // ~$2.19 > $2.00 budget
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
        vm.prank(agent);
        vm.expectRevert("covenant expired");
        vault.pay(covenantId, recipient, 1_000_000, "expired");
    }
}
