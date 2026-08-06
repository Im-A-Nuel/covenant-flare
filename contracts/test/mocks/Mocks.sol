// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Minimal mintable ERC20 standing in for FXRP in tests. 6 decimals, matching
// the real FXRP token on Coston2 (verified via `cast call <fxrp> decimals()`).
contract MockFXRP is IERC20 {
    string public constant name = "Mock FTestXRP";
    string public constant symbol = "mFXRP";
    uint8 public constant decimals = 6;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "allowance exceeded");
        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - amount;
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "insufficient balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}

// Stands in for AssetManagerFXRP: the real contract exposes fAsset() to
// resolve the FXRP token address, which is all CovenantVault's constructor uses.
contract MockAssetManager {
    IERC20 public immutable fAssetToken;

    constructor(IERC20 token) {
        fAssetToken = token;
    }

    function fAsset() external view returns (IERC20) {
        return fAssetToken;
    }
}

// Stands in for FtsoV2Interface: only getFeedByIdInWei is used by CovenantVault.
// Price is settable per-test so both approved and reverted-payment paths can
// be exercised deterministically instead of depending on live feed data.
contract MockFtsoV2 {
    uint256 public priceWei;
    uint64 public timestamp;

    function setPrice(uint256 _priceWei, uint64 _timestamp) external {
        priceWei = _priceWei;
        timestamp = _timestamp;
    }

    function getFeedByIdInWei(bytes21) external view returns (uint256, uint64) {
        return (priceWei, timestamp);
    }
}
