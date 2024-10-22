// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { AccessControlUpgradeable } from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { IMarket } from "../interfaces/IRemoteHub.sol";

contract MarketTest is IMarket, Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    function previewWrap(address asset, uint256 amount) external view override returns (uint256) {}

    function previewUnwrap(address asset, uint256 amount) external view override returns (uint256) {}

    function wrap(address asset, uint256 amount, address receiver) external override returns (uint256) {}

    function unwrap(address asset, uint256 amount, address receiver) external override returns (uint256) {}

    function _authorizeUpgrade(address newImplementation) internal virtual override {}
}
