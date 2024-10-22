// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { Client } from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import { CCIPReceiver } from "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { AccessControlUpgradeable } from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { PausableUpgradeable } from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import { IRemoteHub, IXusdToken, IPayoutManager, IRoleManager, IExchange, IWrappedXusdToken, IMarket, IRemoteHubUpgrader, ChainItem } from "../interfaces/IRemoteHub.sol";

contract RemoteHubTest is
    IRemoteHub,
    CCIPReceiver,
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    PausableUpgradeable
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address _router) CCIPReceiver(_router) {
        _disableInitializers();
    }

    function initialize(uint64 _chainSelector) public initializer {}

    function execMultiPayout(uint256 newDelta) external payable override {}

    function chainSelector() external view override returns (uint64) {}

    function getChainItemById(uint64 key) external view override returns (ChainItem memory) {}

    function ccipPool() external view override returns (address) {}

    function xusd() external view override returns (IXusdToken) {}

    function exchange() external view override returns (IExchange) {}

    function payoutManager() external view override returns (IPayoutManager) {}

    function roleManager() external view override returns (IRoleManager) {}

    function remoteHub() external view override returns (IRemoteHub) {}

    function remoteHubUpgrader() external view override returns (IRemoteHubUpgrader) {}

    function wxusd() external view override returns (IWrappedXusdToken) {}

    function market() external view override returns (IMarket) {}

    function supportsInterface(bytes4 interfaceId) public pure override(AccessControlUpgradeable, CCIPReceiver) returns (bool) {}

    function _ccipReceive(Client.Any2EVMMessage memory message) internal virtual override {}

    function _authorizeUpgrade(address newImplementation) internal virtual override {}
}
