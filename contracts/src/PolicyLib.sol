// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Policy struct + the checks that decide whether a payment is allowed.
//
// The checks take a `Policy storage` pointer rather than `Policy memory` on
// purpose: pay() runs them against a covenant that already lives in storage,
// and a `memory` parameter would deep-copy the whole struct -- including the
// entire allowedRecipients array -- on every single call, three times per
// payment. See PolicyLibTest for these functions exercised in isolation.
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
    // createCovenant rejects empty lists outright, so this is defence in depth.
    function isRecipientAllowed(Policy storage policy, address recipient) internal view returns (bool) {
        uint256 len = policy.allowedRecipients.length;
        for (uint256 i = 0; i < len; i++) {
            if (policy.allowedRecipients[i] == recipient) return true;
        }
        return false;
    }

    function isWithinBudget(Policy storage policy, uint256 spentUsdCents, uint256 usdCents)
        internal
        view
        returns (bool)
    {
        if (usdCents > policy.usdMaxPerRequest) return false;
        return spentUsdCents + usdCents <= policy.usdBudgetTotal;
    }

    function isNotExpired(Policy storage policy, uint256 nowTimestamp) internal view returns (bool) {
        return nowTimestamp < policy.expiry;
    }
}
