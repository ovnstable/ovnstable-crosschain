// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { IExchange } from "./IExchange.sol";
import { IRoleManager } from "./IRoleManager.sol";

interface IRemoteHubUpgrader {
    function exchange() external view returns (IExchange);

    function roleManager() external view returns (IRoleManager);

    function setRemoteHub(address _remoteHub) external;
}
