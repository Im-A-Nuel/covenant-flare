// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {PolicyLib} from "../src/PolicyLib.sol";

/// PolicyLib operates on a storage pointer (to avoid copying the whole policy
/// out of storage on every check), so exercising it in isolation needs a
/// contract that owns one. This harness is that, and nothing more.
contract PolicyHarness {
    using PolicyLib for PolicyLib.Policy;

    PolicyLib.Policy internal policy;

    function set(PolicyLib.Policy calldata p) external {
        policy = p;
    }

    function isRecipientAllowed(address r) external view returns (bool) {
        return policy.isRecipientAllowed(r);
    }

    function isWithinBudget(uint256 spent, uint256 amount) external view returns (bool) {
        return policy.isWithinBudget(spent, amount);
    }

    function isNotExpired(uint256 nowTs) external view returns (bool) {
        return policy.isNotExpired(nowTs);
    }
}

contract PolicyLibTest is Test {
    PolicyHarness harness;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address mallory = makeAddr("mallory");

    function setUp() public {
        harness = new PolicyHarness();
    }

    function _set(address[] memory allowed, uint256 budget, uint256 maxPer, uint256 expiry) internal {
        harness.set(
            PolicyLib.Policy({
                usdBudgetTotal: budget,
                usdMaxPerRequest: maxPer,
                expiry: expiry,
                allowedRecipients: allowed,
                purposeHash: keccak256("purpose")
            })
        );
    }

    function _two() internal view returns (address[] memory a) {
        a = new address[](2);
        a[0] = alice;
        a[1] = bob;
    }

    function test_isRecipientAllowed_matchesListedAddresses() public {
        _set(_two(), 1_000, 500, block.timestamp + 1 days);
        assertTrue(harness.isRecipientAllowed(alice));
        assertTrue(harness.isRecipientAllowed(bob));
        assertFalse(harness.isRecipientAllowed(mallory));
    }

    function test_isRecipientAllowed_emptyListDeniesEveryone() public {
        _set(new address[](0), 1_000, 500, block.timestamp + 1 days);
        assertFalse(harness.isRecipientAllowed(alice));
        assertFalse(harness.isRecipientAllowed(address(0)));
    }

    function test_isWithinBudget_perRequestCap() public {
        _set(_two(), 1_000, 500, block.timestamp + 1 days);
        assertTrue(harness.isWithinBudget(0, 500), "exactly at the cap is allowed");
        assertFalse(harness.isWithinBudget(0, 501), "one cent over the cap is not");
    }

    function test_isWithinBudget_totalBudgetIncludesPriorSpend() public {
        _set(_two(), 1_000, 1_000, block.timestamp + 1 days);
        assertTrue(harness.isWithinBudget(900, 100), "exactly exhausting the budget is allowed");
        assertFalse(harness.isWithinBudget(900, 101), "one cent past the budget is not");
    }

    function test_isNotExpired_boundary() public {
        uint256 expiry = block.timestamp + 1 days;
        _set(_two(), 1_000, 500, expiry);
        assertTrue(harness.isNotExpired(expiry - 1));
        assertFalse(harness.isNotExpired(expiry), "expiry itself is expired");
        assertFalse(harness.isNotExpired(expiry + 1));
    }
}
