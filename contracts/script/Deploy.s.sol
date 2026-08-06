// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {CovenantVault} from "../src/CovenantVault.sol";

contract Deploy is Script {
    function run() external returns (CovenantVault) {
        vm.startBroadcast();
        CovenantVault vault = new CovenantVault();
        vm.stopBroadcast();
        return vault;
    }
}
