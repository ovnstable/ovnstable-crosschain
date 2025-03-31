// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { ERC20Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC4626 } from "../interfaces/IERC4626.sol";

contract MockWrappedXusdToken is IERC4626, ERC20Upgradeable {
    constructor(string memory name, string memory symbol) {}

    function totalAssets() external view override returns (uint256) {}

    function convertToShares(uint256 assets) external view override returns (uint256) {}

    function convertToAssets(uint256 shares) external view override returns (uint256) {}

    function maxDeposit(address receiver) external view override returns (uint256) {}

    function previewDeposit(uint256 assets) external view override returns (uint256) {
        return assets;

    }

    function deposit(uint256 assets, address receiver) external override returns (uint256) {
        return assets;
    }

    function maxMint(address receiver) external view override returns (uint256) {}

    function previewMint(uint256 shares) external view override returns (uint256) {
        return shares;
    }

    function mint(uint256 shares, address receiver) external override returns (uint256) {}

    function maxWithdraw(address owner) external view override returns (uint256) {}

    function previewWithdraw(uint256 assets) external view override returns (uint256) {
        return assets;
    }

    function withdraw(uint256 assets, address receiver, address owner) external override returns (uint256) {}

    function maxRedeem(address owner) external view override returns (uint256) {}

    function previewRedeem(uint256 shares) external view override returns (uint256) {
        return shares;
    }

    function redeem(uint256 shares, address receiver, address owner) external override returns (uint256) {
        return shares;
    }
} 
