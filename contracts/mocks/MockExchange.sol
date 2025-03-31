// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IRemoteHub.sol";
import { IInsuranceExchange, Multicall2 } from "../interfaces/IInsuranceExchange.sol";

contract MockExchange is IExchange {

    function buy(address asset, uint256 amount) external returns (uint256) {
        return amount - ((amount * buyFee()) / buyFeeDenominator());
    }

    function redeem(address asset, uint256 amount) external returns (uint256) {
        return amount - ((amount * redeemFee()) / redeemFeeDenominator());
    }

    function buyFee() public view override returns (uint256) {
        return 300;
    }

    function buyFeeDenominator() public view override returns (uint256) {
        return 10000;
    }

    function redeemFee() public view override returns (uint256) {
        return 300;
    }

    function redeemFeeDenominator() public view override returns (uint256) {
        return 10000;
    }

    function balance() external view override returns (uint256) {}

    function mint(MintParams calldata params) external override returns (uint256) {}

    function payout(bool simulate, IInsuranceExchange.SwapData memory swapData) external override returns (uint256 swapAmount) {}
} 