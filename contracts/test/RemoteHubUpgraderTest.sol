// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { Client } from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import { CCIPReceiver } from "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { AccessControlUpgradeable } from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { PausableUpgradeable } from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import { IExchange, IRoleManager, IRemoteHubUpgrader } from "../interfaces/IRemoteHub.sol";

contract RemoteHubUpgraderTest is
    CCIPReceiver,
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    PausableUpgradeable,
    IRemoteHubUpgrader
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address _router, address) CCIPReceiver(_router) {
        _disableInitializers();
    }

    function initialize() public initializer {}

    function supportsInterface(bytes4 interfaceId) public pure override(AccessControlUpgradeable, CCIPReceiver) returns (bool) {}

    function _ccipReceive(Client.Any2EVMMessage memory message) internal virtual override {}

    function _authorizeUpgrade(address newImplementation) internal virtual override {}

    function exchange() external view override returns (IExchange) {}

    function roleManager() external view override returns (IRoleManager) {}

    function setRemoteHub(address _remoteHub) external override {}
}
