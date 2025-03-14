// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { IInsuranceExchange } from "./IInsuranceExchange.sol";

interface IExchange {
    struct MintParams {
        address asset;
        uint256 amount; // amount asset
        string referral; // code from Referral Program -> if not have -> set empty
    }

    function buyFee() external view returns (uint256);

    function buyFeeDenominator() external view returns (uint256);

    function redeemFee() external view returns (uint256);

    function redeemFeeDenominator() external view returns (uint256);

    function balance() external view returns (uint256);

    // Minting xUSD in exchange for an asset

    function mint(MintParams calldata params) external returns (uint256);

    /**
     * @param _asset Asset to spend
     * @param _amount Amount of asset to spend
     * @return Amount of minted xUSD to caller
     */
    function buy(address _asset, uint256 _amount) external returns (uint256);

    /**
     * @param _asset Asset to redeem
     * @param _amount Amount of xUSD to burn
     * @return Amount of asset unstacked and transferred to caller
     */
    function redeem(address _asset, uint256 _amount) external returns (uint256);

    function payout(bool simulate, IInsuranceExchange.SwapData memory swapData) external returns (uint256 swapAmount);
}
