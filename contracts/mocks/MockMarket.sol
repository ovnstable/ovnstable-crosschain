// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../interfaces/IMarket.sol";

contract MockMarket is IMarket {
    function previewWrap(address asset, uint256 amount) external view override returns (uint256) {
        return amount;
    }

    function previewUnwrap(address asset, uint256 amount) external view override returns (uint256) {
        return amount;
    }

    function wrap(address asset, uint256 amount, address receiver) external override returns (uint256) {
        return amount;
    }

    function unwrap(address asset, uint256 amount, address receiver) external override returns (uint256) {
        return amount;
    }

} 