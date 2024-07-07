// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";

import "./interfaces/IPortfolioManager.sol";
import "./interfaces/IStrategy.sol";
import "./interfaces/IRemoteHub.sol";

contract PortfolioManager is IPortfolioManager, Initializable, AccessControlUpgradeable, UUPSUpgradeable {

    uint256 public constant TOTAL_WEIGHT = 100000; // 100000 ~ 100%

    address private DELETED_0;
    IERC20 asset;
    mapping(address => uint256) public strategyWeightPositions;
    StrategyWeight[] public strategyWeights;
    IStrategy public cashStrategy;
    uint256 public totalRiskFactor;
    uint256 public navSlippageBp;
    IRemoteHub public remoteHub;

    // ---  events

    event RemoteHubUpdated(address remoteHub);
    event AssetUpdated(address value);
    event NavSlippageBpUpdated(uint256 navSlippageBp);
    event CashStrategyUpdated(address value);

    event CashStrategyAlreadySet(address value);
    event CashStrategyRestaked(uint256 value);
    event Balance();
    event TotalRiskFactorUpdated(uint256 value);
    event Exchanged(uint256 amount, address from, address to);

    event StrategyWeightUpdated(
        uint256 index,
        address strategy,
        uint256 minWeight,
        uint256 targetWeight,
        uint256 maxWeight,
        uint256 riskFactor,
        bool enabled,
        bool enabledReward
    );

    // ---  initializer

    /// @custom:oz-upgrades-unsafe-allow constructor 
    constructor() {
        _disableInitializers();
    }

    function initialize() initializer public {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        navSlippageBp = 4; // 0.04%
    }

    function _authorizeUpgrade(address newImplementation) internal onlyRole(DEFAULT_ADMIN_ROLE) override {}

    // ---  remoteHub getters

    function exchange() internal view returns(IExchange) {
        return remoteHub.exchange();
    }

    function roleManager() internal view returns(IRoleManager) {
        return remoteHub.roleManager();
    }

    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller doesn't have DEFAULT_ADMIN_ROLE role");
        _;
    }

    modifier onlyExchanger() {
        require(hasRole(roleManager().EXCHANGER(), msg.sender), "Caller doesn't have EXCHANGER role");
        _;
    }

    modifier onlyPortfolioAgent() {
        require(roleManager().hasRole(roleManager().PORTFOLIO_AGENT_ROLE(), msg.sender), "Caller doesn't have PORTFOLIO_AGENT_ROLE role");
        _;
    }

    modifier cashStrategySet() {
        require(address(cashStrategy) != address(0), "Cash strategy not set yet");
        _;
    }

    // ---  setters

    function setRemoteHub(address _remoteHub) external onlyAdmin {
        require(_remoteHub != address(0), "Zero address not allowed");
        remoteHub = IRemoteHub(_remoteHub);
        emit RemoteHubUpdated(_remoteHub);
    }

    function setAsset(address _asset) public onlyAdmin {
        require(_asset != address(0), "Zero address not allowed");

        asset = IERC20(_asset);
        emit AssetUpdated(_asset);
    }

    function setNavSlippageBp(uint256 _navSlippageBp) public onlyPortfolioAgent {
        navSlippageBp = _navSlippageBp;
        emit NavSlippageBpUpdated(navSlippageBp);
    }

    function setCashStrategy(address _cashStrategy) public onlyAdmin {
        require(_cashStrategy != address(0), "Zero address not allowed");

        if (_cashStrategy == address(cashStrategy)) {
            emit CashStrategyAlreadySet(_cashStrategy);
            return;
        }
        bool needMoveCash = address(cashStrategy) != address(0);
        if (needMoveCash) {
            // unstake everything
            cashStrategy.unstake(address(asset), 0, address(this), true);
        }

        cashStrategy = IStrategy(_cashStrategy);

        if (needMoveCash) {
            uint256 amount = asset.balanceOf(address(this));
            if (amount > 0) {
                asset.transfer(address(cashStrategy), amount);
                cashStrategy.stake(address(asset), amount);
                emit CashStrategyRestaked(amount);
            }
        }

        emit CashStrategyUpdated(_cashStrategy);
    }

    // ---  logic

    function deposit() external override onlyExchanger cashStrategySet {

        uint256 pmAssetBalance = asset.balanceOf(address(this));
        if (pmAssetBalance == 0) {
            // zero asset amount always fit in cash strategy but also zero stake result
            // so we can return now
            return;
        }

        // Stake all free asset amounts to cash Strategy
        asset.transfer(address(cashStrategy), pmAssetBalance);
        cashStrategy.stake(
            address(asset),
            pmAssetBalance
        );

    }

    function withdraw(uint256 _amount) external override onlyExchanger cashStrategySet returns (uint256, bool) {

        // if cash strategy has enough liquidity then prevent balancing
        uint256 liquidationValue = cashStrategy.liquidationValue();

        // Flag needed for exchanger for check: oncePerBlock
        bool isBalanced = false;
        if (liquidationValue > _amount) {
            cashStrategy.unstake(address(asset), _amount, address(this), false);
        } else {
            // balance to needed amount
            _balance(asset, _amount);
            isBalanced = true;
        }

        uint256 currentBalance = asset.balanceOf(address(this));

        // `if` is cheaper then `require` when need build complex message
        if (currentBalance < _amount) {
            revert(string(
                abi.encodePacked(
                    "In portfolioManager not enough for transfer _amount: ",
                    Strings.toString(currentBalance),
                    " < ",
                    Strings.toString(_amount)
                )
            ));
        }

        // transfer back tokens
        asset.transfer(address(exchange()), _amount);

        return (_amount, isBalanced);
    }

    function claimAndBalance() external override onlyExchanger {
        _claimRewards();
        _balance();
    }

    function balance() public override onlyPortfolioAgent {
        _balance();
        emit Balance();
    }

    function setStrategyWeights(StrategyWeight[] calldata _strategyWeights) external onlyPortfolioAgent {

        require(_strategyWeights.length == strategyWeights.length, 'Wrong number of strategies');

        uint256 totalTarget = 0;

        bool[] memory updatedStrategies = new bool[](strategyWeights.length);

        uint256 _totalRiskFactor = 0;

        for (uint8 i = 0; i < _strategyWeights.length; i++) {
            StrategyWeight memory weightNew = _strategyWeights[i];

            uint256 index = strategyWeightPositions[weightNew.strategy];
            require(updatedStrategies[index] != true, 'Strategy was updated');


            StrategyWeight memory weightOld = strategyWeights[index];

            require(weightOld.strategy == weightNew.strategy, 'Incorrect strategy index');
            require(weightNew.minWeight <= weightNew.targetWeight, "minWeight shouldn't higher than targetWeight");
            require(weightNew.targetWeight <= weightNew.maxWeight, "targetWeight shouldn't higher than maxWeight");

            totalTarget += weightNew.targetWeight;

            strategyWeights[index] = weightNew;

            updatedStrategies[index] = true;

            _totalRiskFactor += (weightNew.riskFactor / 100 * weightNew.targetWeight) / 1000;

            emit StrategyWeightUpdated(
                index,
                weightNew.strategy,
                weightNew.minWeight,
                weightNew.targetWeight,
                weightNew.maxWeight,
                weightNew.riskFactor,
                weightNew.enabled,
                weightNew.enabledReward
            );
        }

        require(totalTarget == TOTAL_WEIGHT, "Total target should equal to TOTAL_WEIGHT");

        totalRiskFactor = _totalRiskFactor;
        emit TotalRiskFactorUpdated(_totalRiskFactor);

    }

    function addStrategy(address _strategy) external onlyAdmin {

        for (uint8 i = 0; i < strategyWeights.length; i++) {
            require(strategyWeights[i].strategy != _strategy, 'Strategy already exist');
        }


        // Strategy is disabled always when only created
        StrategyWeight memory strategyWeight = StrategyWeight(_strategy, 0, 0, 0, 0, false, false);

        uint256 index; // default index = 0
        if(strategyWeights.length != 0){
            index = strategyWeights.length; // next index = length (+1)
        }

        // Add strategy to last position
        _addStrategyWeightAt(strategyWeight, index);
        strategyWeightPositions[strategyWeight.strategy] = index;
    }

    function removeStrategy(address _strategy) external onlyAdmin {

        uint256 index = strategyWeightPositions[_strategy];
        StrategyWeight memory weight = strategyWeights[index];

        require(weight.strategy == _strategy, 'Address strategy not equals');
        require(weight.targetWeight == 0, 'Target weight must be 0');
        require(IStrategy(weight.strategy).netAssetValue() == 0, 'Strategy nav must be 0');


        // Remove gap from array
        for (uint i = index; i < strategyWeights.length-1; i++){

            StrategyWeight memory _tempWeight = strategyWeights[i+1];

            strategyWeights[i] = _tempWeight;
            strategyWeightPositions[_tempWeight.strategy] = i;
        }

        strategyWeights.pop();
        delete strategyWeightPositions[_strategy];

    }

    function getStrategyWeight(address strategy) public override view returns (StrategyWeight memory) {

        if (strategyWeights.length == 0) {
            revert('Strategy not found');
        }

        StrategyWeight memory weight = strategyWeights[strategyWeightPositions[strategy]];
        require(weight.strategy == strategy, 'Strategy not found');
        return weight;
    }

    function getAllStrategyWeights() public override view returns (StrategyWeight[] memory) {
        return strategyWeights;
    }

    function getTotalRiskFactor() external override view returns (uint256) {
        return totalRiskFactor;
    }

    function strategyAssets() public view override returns (StrategyAsset[] memory) {

        IPortfolioManager.StrategyWeight[] memory weights = getAllStrategyWeights();
        uint256 count = weights.length;

        StrategyAsset[] memory assets = new StrategyAsset[](count);

        for (uint8 i = 0; i < count; i++) {
            IPortfolioManager.StrategyWeight memory weight = weights[i];
            IStrategy strategy = IStrategy(weight.strategy);

            assets[i] = StrategyAsset(
                weight.strategy,
                strategy.netAssetValue(),
                strategy.liquidationValue()
            );
        }

        return assets;
    }

    function totalNetAssets() public view override returns (uint256) {
        return _totalAssets(false);
    }

    function totalLiquidationAssets() public view override returns (uint256) {
        return _totalAssets(true);
    }

    function _claimRewards() internal {
        StrategyWeight[] memory strategies = getAllStrategyWeights();

        for (uint8 i; i < strategies.length; i++) {
            StrategyWeight memory item = strategies[i];

            if (item.enabledReward) {
                IStrategy(item.strategy).claimRewards(address(this));
            }
        }
    }

    function _balance() internal {
        // Same to zero withdrawal balance
        _balance(IERC20(address(0)), 0);
    }

    function _balance(IERC20 withdrawToken, uint256 withdrawAmount) internal {

        // after balancing, we need to make sure that we did not lose money when:
        // 1) transferring from one strategy to another
        // 2) when execute stake/unstake

        // allowable losses 0.04% = USDx mint/redeem fee
        uint256 minNavExpected = OvnMath.subBasisPoints(totalNetAssets(), navSlippageBp);
        minNavExpected = minNavExpected - withdrawAmount; // subscribe withdraw amount

        StrategyWeight[] memory strategies = getAllStrategyWeights();

        // 1. calc total asset equivalent
        uint256 totalAsset = asset.balanceOf(address(this));
        uint256 totalWeight = 0;
        for (uint8 i; i < strategies.length; i++) {
            if (!strategies[i].enabled) {// Skip if strategy is not enabled
                continue;
            }

            // UnstakeFull from Strategies with targetWeight == 0
            if (strategies[i].targetWeight == 0) {
                totalAsset += IStrategy(strategies[i].strategy).unstake(
                    address(asset),
                    0,
                    address(this),
                    true
                );
            } else {
                totalAsset += IStrategy(strategies[i].strategy).netAssetValue();
                totalWeight += strategies[i].targetWeight;
            }

        }

        if (address(withdrawToken) == address(asset)) {
            require(totalAsset >= withdrawAmount, "Trying withdraw more than liquidity available");
            // it make to move to PortfolioManager extra asset to withdraw
            totalAsset = totalAsset - withdrawAmount;
        }

        // 3. calc diffs for strategies liquidity
        Order[] memory stakeOrders = new Order[](strategies.length);
        uint8 stakeOrdersCount = 0;
        for (uint8 i; i < strategies.length; i++) {

            if (!strategies[i].enabled) {// Skip if strategy is not enabled
                continue;
            }

            uint256 targetLiquidity;
            if (strategies[i].targetWeight == 0) {
                targetLiquidity = 0;
            } else {
                targetLiquidity = (totalAsset * strategies[i].targetWeight) / totalWeight;
            }

            uint256 currentLiquidity = IStrategy(strategies[i].strategy).netAssetValue();
            if (targetLiquidity == currentLiquidity) {
                // skip already at target strategies
                continue;
            }

            if (targetLiquidity < currentLiquidity) {
                // unstake now
                IStrategy(strategies[i].strategy).unstake(
                    address(asset),
                    currentLiquidity - targetLiquidity,
                    address(this),
                    false
                );
            } else {
                // save to stake later
                stakeOrders[stakeOrdersCount] = Order(
                    true,
                    strategies[i].strategy,
                    targetLiquidity - currentLiquidity
                );
                stakeOrdersCount++;
            }
        }

        // 4.  make staking
        for (uint8 i; i < stakeOrdersCount; i++) {

            address strategy = stakeOrders[i].strategy;
            uint256 amount = stakeOrders[i].amount;

            uint256 currentBalance = asset.balanceOf(address(this));
            if (currentBalance < amount) {
                amount = currentBalance;
            }
            asset.transfer(strategy, amount);

            IStrategy(strategy).stake(
                address(asset),
                amount
            );
        }

        require(totalNetAssets() >= minNavExpected, "PM: NAV less than expected");
    }

    function _addStrategyWeightAt(StrategyWeight memory strategyWeight, uint256 index) internal {
        uint256 currentLength = strategyWeights.length;
        // expand if need
        if (currentLength == 0 || currentLength - 1 < index) {
            uint256 additionalCount = index - currentLength + 1;
            for (uint8 i = 0; i < additionalCount; i++) {
                strategyWeights.push();
            }
        }
        strategyWeights[index] = strategyWeight;
        emit StrategyWeightUpdated(
            index,
            strategyWeight.strategy,
            strategyWeight.minWeight,
            strategyWeight.targetWeight,
            strategyWeight.maxWeight,
            strategyWeight.riskFactor,
            strategyWeight.enabled,
            strategyWeight.enabledReward
        );
    }

    function _totalAssets(bool liquidation) internal view returns (uint256) {
        uint256 totalAssetPrice = 0;
        IPortfolioManager.StrategyWeight[] memory weights = getAllStrategyWeights();

        for (uint8 i = 0; i < weights.length; i++) {
            IStrategy strategy = IStrategy(weights[i].strategy);
            if (liquidation) {
                totalAssetPrice += strategy.liquidationValue();
            } else {
                totalAssetPrice += strategy.netAssetValue();
            }
        }

        return totalAssetPrice;
    }
}
