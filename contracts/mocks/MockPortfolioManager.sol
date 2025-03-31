// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IPortfolioManager.sol";

contract MockPortfolioManager is IPortfolioManager {
    uint256 public constant RISK_FACTOR_DM = 1e5;
    uint256 public totalNetAssetsAmount = 1000000;
    bool public isBalanced = false;
    IERC20 public asset;
    address public exchange;

    function setAsset(address _asset) external {
        asset = IERC20(_asset);
    }

    function setExchange(address _exchange) external {
        exchange = _exchange;
    }


    StrategyWeight[] public strategyWeights;

    function deposit() external override {
        
    }

    function withdraw(uint256 amount) external override returns (uint256, bool) {
        asset.transfer(address(exchange), amount);
        return (amount, isBalanced);
    }

    function claimAndBalance() external override {
        // Mock implementation
        isBalanced = true;
    }

    function totalNetAssets() external view override returns (uint256) {
        return totalNetAssetsAmount;
    }

    function getTotalRiskFactor() external pure override returns (uint256) {
        return RISK_FACTOR_DM;
    }

    function getAllStrategyWeights() external view override returns (StrategyWeight[] memory) {
        return strategyWeights;
    }

    // Additional functions for testing

    function setTotalNetAssets(uint256 amount) external {
        totalNetAssetsAmount = amount;
    }

    function setIsBalanced(bool _isBalanced) external {
        isBalanced = _isBalanced;
    }

    function addStrategyWeight(address strategy, uint256 minWeight, uint256 targetWeight, uint256 maxWeight, uint256 riskFactor, bool enabled, bool enabledReward) external {
        strategyWeights.push(
            StrategyWeight(
                { strategy: strategy, minWeight: minWeight, targetWeight: targetWeight, maxWeight: maxWeight, riskFactor: riskFactor, enabled: enabled, enabledReward:enabledReward })
        );
    }

    function clearStrategyWeights() external {
        delete strategyWeights;
    }

    // Mock implementation of strategy interface for testing
    function netAssetValue() external pure returns (uint256) {
        return 1000000;
    }

    function getStrategyWeight(address strategy) external view override returns (StrategyWeight memory) {}

    function balance() external override {}

    function strategyAssets() external view override returns (StrategyAsset[] memory) {}

    function totalLiquidationAssets() external view override returns (uint256) {}
} 