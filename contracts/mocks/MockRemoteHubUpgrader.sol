// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../interfaces/IRemoteHubUpgrader.sol";
import "../interfaces/IExchange.sol";
import "../interfaces/IRoleManager.sol";

contract MockRemoteHubUpgrader is IRemoteHubUpgrader {
    IExchange public exchange;
    IRoleManager public roleManager;

    function setExchange(address _exchange) external {
        exchange = IExchange(_exchange);
    }

    function setRoleManager(address _roleManager) external {
        roleManager = IRoleManager(_roleManager);
    }

    function setRemoteHub(address _remoteHub) external override {
        // Mock implementation
    }

} 