// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IStrategy.sol";

contract MockStrategy is IStrategy {
    uint256 private _netAssetValue;

    function setNetAssetValue(uint256 value) external {
        _netAssetValue = value;
    }

    function netAssetValue() external view returns (uint256) {
        return _netAssetValue;
    }

    function deposit(uint256 amount) external {
        // Mock implementation
    }

    function withdraw(uint256 amount) external returns (uint256) {
        return amount;
    }

    function claimRewards() external {
        // Mock implementation
    }

    function emergencyWithdraw() external {
        // Mock implementation
    }

    function stake(address _asset, uint256 _amount) external override {}

    function unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary,
        bool targetIsZero
    ) external override returns (uint256) {}

    function liquidationValue() external view override returns (uint256) {}

    function claimRewards(address _to) external override returns (uint256) {}
} 