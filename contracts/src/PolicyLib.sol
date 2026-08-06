// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Policy struct + pure checks. No storage access -- unit-testable in isolation
// from CovenantVault. Caller passes in current time/spend so checks stay pure.
library PolicyLib {
    struct Policy {
        uint256 usdBudgetTotal; // integer cents
        uint256 usdMaxPerRequest; // integer cents
        uint256 expiry; // unix timestamp
        address[] allowedRecipients;
        bytes32 purposeHash;
    }

    // Empty allowedRecipients means deny-all: a covenant must explicitly
    // name who it can pay, there is no implicit "any recipient" mode.
    function isRecipientAllowed(Policy memory policy, address recipient) internal pure returns (bool) {
        uint256 len = policy.allowedRecipients.length;
        for (uint256 i = 0; i < len; i++) {
            if (policy.allowedRecipients[i] == recipient) return true;
        }
        return false;
    }

    function isWithinBudget(Policy memory policy, uint256 spentUsdCents, uint256 usdCents)
        internal
        pure
        returns (bool)
    {
        if (usdCents > policy.usdMaxPerRequest) return false;
        return spentUsdCents + usdCents <= policy.usdBudgetTotal;
    }

    function isNotExpired(Policy memory policy, uint256 nowTimestamp) internal pure returns (bool) {
        return nowTimestamp < policy.expiry;
    }
}
