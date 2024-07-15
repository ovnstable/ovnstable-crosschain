// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import "./interfaces/IInsuranceExchange.sol";
import "./interfaces/IPortfolioManager.sol";
import "./interfaces/IRemoteHub.sol";
import "hardhat/console.sol";

// Because of upgradeable cannot use ReentrancyGuard (nonReentrant modifier)

contract ExchangeMother is Initializable, AccessControlUpgradeable, UUPSUpgradeable, PausableUpgradeable {

    uint256 public constant LIQ_DELTA_DM   = 1e6;
    uint256 public constant RISK_FACTOR_DM = 1e5;

    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    address private DELETED_0;
    IERC20 public usdc; // asset name

    IPortfolioManager public portfolioManager; //portfolio manager contract

    address private DELETED_1;

    uint256 public buyFee;
    uint256 public buyFeeDenominator; // ~ 100 %

    uint256 public redeemFee;
    uint256 public redeemFeeDenominator; // ~ 100 %

    // next payout time in epoch seconds
    uint256 public nextPayoutTime;

    // period between payouts in seconds, need to calc nextPayoutTime
    uint256 public payoutPeriod;

    // range of time for starting near next payout time at seconds
    // if time in [nextPayoutTime-payoutTimeRange;nextPayoutTime+payoutTimeRange]
    //    then payouts can be started by payout() method anyone
    // else if time more than nextPayoutTime+payoutTimeRange
    //    then payouts started by any next buy/redeem
    uint256 public payoutTimeRange;

    address private DELETED_2;

    // last block number when buy/redeem was executed
    uint256 public lastBlockNumber;

    uint256 private DELETED_3;
    uint256 public abroadMax;

    address public insurance;

    uint256 public oracleLoss;
    uint256 public oracleLossDenominator;

    uint256 public compensateLoss;
    uint256 public compensateLossDenominator;

    address public profitRecipient;

    address public blockGetter;
    
    IRemoteHub public remoteHub;

    uint256 private _reentrancyGuardStatus;

    // ---  events

    event AssetUpdated(address asset);
    event RemoteHubUpdated(address remoteHub);
    event PortfolioManagerUpdated(address portfolioManager);
    event BuyFeeUpdated(uint256 fee, uint256 feeDenominator);
    event RedeemFeeUpdated(uint256 fee, uint256 feeDenominator);
    event PayoutTimesUpdated(uint256 nextPayoutTime, uint256 payoutPeriod, uint256 payoutTimeRange);
    event InsuranceUpdated(address insurance);
    event BlockGetterUpdated(address blockGetter);
    event ProfitRecipientUpdated(address recipient);
    event OracleLossUpdate(uint256 oracleLoss, uint256 denominator);
    event CompensateLossUpdate(uint256 compensateLoss, uint256 denominator);
    event MaxAbroadUpdated(uint256 abroad);

    event EventExchange(string label, uint256 amount, uint256 fee, address sender);
    event PayoutEvent(uint256 profit, uint256 excessProfit, uint256 insurancePremium, uint256 insuranceLoss);
    event NextPayoutTime(uint256 nextPayoutTime);

    // ---  initializer

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _remoteHub) initializer public {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        buyFee = 40;
        buyFeeDenominator = 100000;

        redeemFee = 40;
        redeemFeeDenominator = 100000;

        // 1637193600 = 2021-11-18T00:00:00Z
        nextPayoutTime = 1637193600; // Q: change? it can be modified, but just to be clear
        payoutPeriod = 24 * 60 * 60;
        payoutTimeRange = 24 * 60 * 60; // 24 hours
        abroadMax = 1000350;
        oracleLossDenominator = 100000;
        compensateLossDenominator = 100000;

        remoteHub = IRemoteHub(_remoteHub);
    }

    function _authorizeUpgrade(address newImplementation) internal onlyRole(DEFAULT_ADMIN_ROLE) override {}

    // ---  remoteHub getters

    function roleManager() internal view returns(IRoleManager) {
        return remoteHub.roleManager();
    }

    function usdx() internal view returns(IUsdxToken) {
        return remoteHub.usdx();
    }

    function payoutManager() internal view returns(IPayoutManager) {
        return remoteHub.payoutManager();
    }

    // ---  modifiers

    modifier nonReentrant() {
        require(_reentrancyGuardStatus != _ENTERED, "ReentrancyGuard: reentrant call");
        _reentrancyGuardStatus = _ENTERED;
        _;
        _reentrancyGuardStatus = _NOT_ENTERED;
    }

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller doesn't have DEFAULT_ADMIN_ROLE role");
        _;
    }

    modifier onlyPortfolioAgent() {
        require(roleManager().hasRole(roleManager().PORTFOLIO_AGENT_ROLE(), msg.sender), "Caller doesn't have PORTFOLIO_AGENT_ROLE role");
        _;
    }

    modifier onlyUnit() {
        require(roleManager().hasRole(roleManager().UNIT_ROLE(), msg.sender), "Caller doesn't have UNIT_ROLE role");
        _;
    }

    // --- setters

    function setAsset(address _asset) external onlyAdmin {
        require(_asset != address(0), "Zero address not allowed");
        usdc = IERC20(_asset);
        emit AssetUpdated(_asset);
    }

    function setPortfolioManager(address _portfolioManager) external onlyAdmin {
        require(_portfolioManager != address(0), "Zero address not allowed");
        portfolioManager = IPortfolioManager(_portfolioManager);
        emit PortfolioManagerUpdated(_portfolioManager);
    }

    function setRemoteHub(address _remoteHub) external onlyAdmin {
        require(_remoteHub != address(0), "Zero address not allowed");
        remoteHub = IRemoteHub(_remoteHub);
        emit RemoteHubUpdated(_remoteHub);
    }

    function setInsurance(address _insurance) external onlyAdmin {
        require(_insurance != address(0), "Zero address not allowed");
        insurance = _insurance;
        emit InsuranceUpdated(_insurance);
    }

    function setBlockGetter(address _blockGetter) external onlyAdmin {
        require(_blockGetter != address(0), "Zero address not allowed");
        blockGetter = _blockGetter;
        emit BlockGetterUpdated(_blockGetter);
    }

    function setProfitRecipient(address _profitRecipient) external onlyAdmin {
        require(_profitRecipient != address(0), "Zero address not allowed");
        profitRecipient = _profitRecipient;
        emit ProfitRecipientUpdated(_profitRecipient);
    }

    function setBuyFee(uint256 _fee, uint256 _feeDenominator) external onlyPortfolioAgent {
        require(_feeDenominator != 0, "Zero denominator not allowed");
        require(_feeDenominator >= _fee, "fee > denominator");
        buyFee = _fee;
        buyFeeDenominator = _feeDenominator;
        emit BuyFeeUpdated(buyFee, buyFeeDenominator);
    }

    function setRedeemFee(uint256 _fee, uint256 _feeDenominator) external onlyPortfolioAgent {
        require(_feeDenominator != 0, "Zero denominator not allowed");
        require(_feeDenominator >= _fee, "fee > denominator");
        redeemFee = _fee;
        redeemFeeDenominator = _feeDenominator;
        emit RedeemFeeUpdated(redeemFee, redeemFeeDenominator);
    }

    function setOracleLoss(uint256 _oracleLoss,  uint256 _denominator) external onlyPortfolioAgent {
        require(_denominator != 0, "Zero denominator not allowed");
        oracleLoss = _oracleLoss;
        oracleLossDenominator = _denominator;
        emit OracleLossUpdate(_oracleLoss, _denominator);
    }

    function setCompensateLoss(uint256 _compensateLoss,  uint256 _denominator) external onlyPortfolioAgent {
        require(_denominator != 0, "Zero denominator not allowed");
        compensateLoss = _compensateLoss;
        compensateLossDenominator = _denominator;
        emit CompensateLossUpdate(_compensateLoss, _denominator);
    }

    function setMaxAbroad(uint256 _max) external onlyPortfolioAgent {
        abroadMax = _max;
        emit MaxAbroadUpdated(abroadMax);
    }

    function setPayoutTimes(uint256 _nextPayoutTime, uint256 _payoutPeriod, uint256 _payoutTimeRange) external onlyPortfolioAgent {
        require(_nextPayoutTime != 0, "Zero _nextPayoutTime not allowed");
        require(_payoutPeriod != 0, "Zero _payoutPeriod not allowed");
        require(_nextPayoutTime > _payoutTimeRange, "_nextPayoutTime shoud be more than _payoutTimeRange");
        nextPayoutTime = _nextPayoutTime;
        payoutPeriod = _payoutPeriod;
        payoutTimeRange = _payoutTimeRange;
        emit PayoutTimesUpdated(nextPayoutTime, payoutPeriod, payoutTimeRange);
    }

    // ---  logic

    function pause() public onlyPortfolioAgent {
        _pause();
    }

    function unpause() public onlyPortfolioAgent {
        _unpause();
    }

    struct MintParams {
        address asset;  // USDC
        uint256 amount; // amount asset
    }

    // Minting USDx in exchange for an asset
    function mint(MintParams calldata params) external whenNotPaused nonReentrant returns (uint256) {

        address _asset = params.asset;
        uint256 _amount = params.amount;

        require(_asset == address(usdc), "Only asset available for buy");

        uint256 currentBalance = usdc.balanceOf(msg.sender);
        require(currentBalance >= _amount, "Not enough tokens to buy");

        require(_amount > 0, "Amount of asset is zero");

        uint256 usdxAmount = _assetToRebase(_amount);
        require(usdxAmount > 0, "Amount of USDx is zero");

        uint256 _targetBalance = usdc.balanceOf(address(portfolioManager)) + _amount;
        SafeERC20.safeTransferFrom(usdc, msg.sender, address(portfolioManager), _amount);
        require(usdc.balanceOf(address(portfolioManager)) == _targetBalance, 'pm balance != target');

        portfolioManager.deposit();
        _requireOncePerBlock(false);

        uint256 buyFeeAmount;
        uint256 buyAmount;
        (buyAmount, buyFeeAmount) = _takeFee(usdxAmount, true);

        usdx().mint(msg.sender, buyAmount);

        emit EventExchange("mint", buyAmount, buyFeeAmount, msg.sender);

        return buyAmount;
    }

    /**
     * @param _asset Asset to redeem
     * @param _amount Amount of USDx to burn
     * @return Amount of asset unstacked and transferred to caller
     */
    function redeem(address _asset, uint256 _amount) external whenNotPaused nonReentrant returns (uint256) {
        require(_asset == address(usdc), "Only asset available for redeem");
        require(_amount > 0, "Amount of USDx is zero");
        require(usdx().balanceOf(msg.sender) >= _amount, "Not enough tokens to redeem");

        uint256 assetAmount = _rebaseToAsset(_amount);
        require(assetAmount > 0, "Amount of asset is zero");

        uint256 redeemFeeAmount;
        uint256 redeemAmount;

        (redeemAmount, redeemFeeAmount) = _takeFee(assetAmount, false);

        (, bool isBalanced) = portfolioManager.withdraw(redeemAmount);
        _requireOncePerBlock(isBalanced);

        // Or just burn from sender
        usdx().burn(msg.sender, _amount);

        require(usdc.balanceOf(address(this)) >= redeemAmount, "Not enough for transfer redeemAmount");
        SafeERC20.safeTransfer(usdc, msg.sender, redeemAmount);

        emit EventExchange("redeem", redeemAmount, redeemFeeAmount, msg.sender);

        return redeemAmount;
    }

    /**
     * @dev Payout
     * The root method of protocol USDx
     * Calculates delta total NAV - total supply USDx and accrues profit or loss among all token holders
     *
     * What this method does?
     * - Claim rewards from all strategy
     * - Increase liquidity index USDx on amount of profit
     * - Decrease liquidity index USDx on amount of loss
     *
     * Support Insurance mode: Only if insurance is set
     * What are Insurance's main actions?
     * If USDx has loss then Exchange covers the loss through Insurance
     * if USDx has profit then Exchange send premium amount to Insurance
     *
     * Explain params:
     * @param simulate - allow to get amount loss/premium for prepare swapData (call.static)
     * @param swapData - Odos swap data for swapping OVN->asset or asset->OVN in Insurance
     */
    function payout(bool simulate, IInsuranceExchange.SwapData memory swapData) payable external whenNotPaused onlyUnit nonReentrant returns (int256 swapAmount) {
        
        require(address(payoutManager()) != address(0) || usdx().nonRebaseOwnersLength() == 0, "Need to specify payoutManager address");

        if (block.timestamp + payoutTimeRange < nextPayoutTime) {
            return 0;
        }

        // 0. call claiming reward and balancing on PM
        // 1. get current amount of USDx
        // 2. get total sum of asset we can get from any source
        // 3. calc difference between total count of USDx and asset
        // 4. update USDx liquidity index

        portfolioManager.claimAndBalance();

        uint256 totalUsdx = usdx().totalSupply();
        uint256 previousUsdx = totalUsdx;

        uint256 totalNav = _assetToRebase(portfolioManager.totalNetAssets());
        uint256 excessProfit;
        uint256 premium;
        uint256 loss;

        uint256 delta;

        if (totalUsdx > totalNav) {

            // Negative rebase
            // USDx have loss and we need to execute next steps:
            // 1. Loss may be related to oracles: we wait
            // 2. Loss is real then compensate all loss + [1] bps

            loss = totalUsdx - totalNav;
            uint256 oracleLossAmount = totalUsdx * oracleLoss / oracleLossDenominator;

            if (loss <= oracleLossAmount) {
                revert('OracleLoss');
            } else {
                loss += totalUsdx * compensateLoss / compensateLossDenominator;
                loss = _rebaseToAsset(loss);
                if (simulate) {
                    return -int256(loss);
                }
                if (swapData.amountIn != 0) {
                    IInsuranceExchange(insurance).compensate(swapData, loss, address(portfolioManager)); // Q: why are all of our Insurance money in OVN?
                    portfolioManager.deposit();
                }
            }

        } else {

            // Positive rebase
            // USDx have profit and we need to execute next steps:
            // 1. Pay premium to Insurance
            // 2. If profit is more than max delta then transfer excess profit to OVN wallet

            premium = _rebaseToAsset((totalNav - totalUsdx) * portfolioManager.getTotalRiskFactor() / RISK_FACTOR_DM);

            if (simulate) {
                return int256(premium);
            }

            if (premium > 0 && swapData.amountIn != 0) {
                portfolioManager.withdraw(premium);
                SafeERC20.safeTransfer(usdc, insurance, premium);

                IInsuranceExchange(insurance).premium(swapData, premium);
                totalNav = totalNav - _assetToRebase(premium);
            }

            delta = totalNav * LIQ_DELTA_DM / usdx().totalSupply();

            if (abroadMax < delta) {

                // Calculate the amount of USDx to hit the maximum delta.
                // We send the difference to the OVN wallet.

                uint256 newTotalSupply = totalNav * LIQ_DELTA_DM / abroadMax;
                excessProfit = newTotalSupply - usdx().totalSupply();

                // Mint USDx to OVN wallet
                require(profitRecipient != address(0), 'profitRecipient address is zero');
                usdx().mint(profitRecipient, excessProfit);
            }
        }

        // In case positive rebase and negative rebase the value changes and we must update it:
        // - totalUsdx
        // - totalNav

        totalUsdx = usdx().totalSupply();
        totalNav = _assetToRebase(portfolioManager.totalNetAssets());
        uint256 newDelta = totalNav * LIQ_DELTA_DM / totalUsdx;

        require(totalNav >= totalUsdx, 'negative rebase');

        // Calculating how much users profit after excess fee
        uint256 profit = totalNav - totalUsdx;

        uint256 expectedTotalUsdx = previousUsdx + profit + excessProfit;

        (NonRebaseInfo [] memory nonRebaseInfo, uint256 nonRebaseDelta) = usdx().changeSupply(totalNav);

        // notify listener about payout done
        if (address(payoutManager()) != address(0)) {
            usdx().mint(address(payoutManager()), nonRebaseDelta);
            payoutManager().payoutDone(address(usdx()), nonRebaseInfo);
        }

        require(usdx().totalSupply() == totalNav, 'total != nav');
        require(usdx().totalSupply() == expectedTotalUsdx, 'total != expected');

        remoteHub.execMultiPayout{value: address(this).balance}(newDelta);

        emit PayoutEvent(profit, excessProfit, premium, loss);

        // Update next payout time. Cycle for preventing gaps
        // Allow execute payout every day in one time (10:00)

        // If we cannot execute payout (for any reason) in 10:00 and execute it in 15:00
        // then this cycle make 1 iteration and next payout time will be same 10:00 in next day

        // If we cannot execute payout more than 2 days and execute it in 15:00
        // then this cycle make 3 iteration and next payout time will be same 10:00 in next day

        for (; block.timestamp >= nextPayoutTime - payoutTimeRange;) {
            nextPayoutTime = nextPayoutTime + payoutPeriod;
        }
        emit NextPayoutTime(nextPayoutTime);

        // If this is not a simulation, then we return the value is not used in any way
        return 0;
    }

    /**
     * @dev Protect from flashloan attacks
     * Allow execute only one mint or redeem transaction in per block
     * ONLY if balance function triggered on PortfolioManager
     * in other cases: stake/unstake only from cash strategy is safe
     */
    function _requireOncePerBlock(bool isBalanced) internal {

        // https://developer.arbitrum.io/time#case-study-multicall
        uint256 blockNumber = Multicall2(0x842eC2c7D803033Edf55E478F461FC547Bc54EB2).getBlockNumber();

        // Flag isBalanced take about:
        // PortfolioManager run balance function and unstake liquidity from non cash strategies
        // Check is not actual if stake/unstake will be only from cash strategy (for example Aave)
        if (isBalanced) {
            require(lastBlockNumber < blockNumber, "Only once in block");
        }

        lastBlockNumber = blockNumber;
    }

    function _takeFee(uint256 _amount, bool isBuy) internal view returns (uint256, uint256){

        uint256 fee;
        uint256 feeDenominator;

        if (isBuy) {
            fee = buyFee;
            feeDenominator = buyFeeDenominator;
        } else {
            fee = redeemFee;
            feeDenominator = redeemFeeDenominator;
        }

        uint256 feeAmount = (_amount * fee) / feeDenominator;
        uint256 resultAmount = _amount - feeAmount;

        return (resultAmount, feeAmount);
    }

    function _rebaseToAsset(uint256 _amount) internal view returns (uint256){

        uint256 assetDecimals = IERC20Metadata(address(usdc)).decimals(); // Q: may be better to hardcode these values => less calls
        uint256 usdxDecimals = usdx().decimals(); // same
        if (assetDecimals > usdxDecimals) {
            _amount = _amount * (10 ** (assetDecimals - usdxDecimals));
        } else {
            _amount = _amount / (10 ** (usdxDecimals - assetDecimals));
        }

        return _amount;
    }

    function _assetToRebase(uint256 _amount) internal view returns (uint256){

        uint256 assetDecimals = IERC20Metadata(address(usdc)).decimals();
        uint256 usdxDecimals = usdx().decimals();
        if (assetDecimals > usdxDecimals) {
            _amount = _amount / (10 ** (assetDecimals - usdxDecimals));
        } else {
            _amount = _amount * (10 ** (usdxDecimals - assetDecimals));
        }
        return _amount;
    }

}
