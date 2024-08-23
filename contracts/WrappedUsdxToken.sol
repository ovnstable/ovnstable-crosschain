// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import "@overnight-contracts/common/contracts/libraries/WadRayMath.sol";
import "./interfaces/IRemoteHub.sol";
import "hardhat/console.sol";

// Because of upgradeable cannot use PausableUpgradeable (whenNotPaused modifier)

contract WrappedUsdxToken is IERC4626, ERC20Upgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    using WadRayMath for uint256;

    address private DELETED_0;
    uint8 private _decimals;
    IRemoteHub public remoteHub;
    bool public paused;

    // ---  events

    event RemoteHubUpdated(address remoteHub);

    // ---  initializer

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(string calldata name, string calldata symbol, uint8 newDecimals, address _remoteHub) initializer public {

        __ERC20_init(name, symbol);
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        _decimals = newDecimals;
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

    // ---  modifiers

    modifier whenNotPaused() {
        require(paused == false, "pause");
        _;
    }

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Caller doesn't have DEFAULT_ADMIN_ROLE role");
        _;
    }

    modifier onlyPortfolioAgent() {
        require(roleManager().hasRole(roleManager().PORTFOLIO_AGENT_ROLE(), msg.sender), "Caller doesn't have PORTFOLIO_AGENT_ROLE role");
        _;
    }

    modifier onlyCCIP() {
        require(remoteHub.ccipPool() == _msgSender(), "Caller is not the CCIP pool");
        _;
    }

    // --- setters

    function setRemoteHub(address _remoteHub) external onlyAdmin {
        require(_remoteHub != address(0), "Zero address not allowed");
        remoteHub = IRemoteHub(_remoteHub);
        emit RemoteHubUpdated(_remoteHub);
    }

    // ---  logic

    function pause() public onlyPortfolioAgent {
        paused = true;
    }

    function unpause() public onlyPortfolioAgent {
        paused = false;
    }

    /// @inheritdoc ERC20Upgradeable
    function decimals() public view override(ERC20Upgradeable) returns (uint8) {
        return _decimals;
    }

    /// @inheritdoc IERC4626
    function totalAssets() external view override returns (uint256) {
        return _convertToAssetsDown(totalSupply());
    }

    /// @inheritdoc IERC4626
    function convertToShares(uint256 assets) external view override returns (uint256) {
        return _convertToSharesDown(assets);
    }

    /// @inheritdoc IERC4626
    function convertToAssets(uint256 shares) external view override returns (uint256) {
        return _convertToAssetsDown(shares);
    }

    /// @inheritdoc IERC4626
    function maxDeposit(address receiver) external view override returns (uint256) {
        return type(uint256).max;
    }

    /// @inheritdoc IERC4626
    function previewDeposit(uint256 assets) external view override returns (uint256) {
        return _convertToSharesDown(assets);
    }

    /// @inheritdoc IERC4626
    function deposit(uint256 assets, address receiver) whenNotPaused external override returns (uint256) {
        require(assets != 0, "Zero assets not allowed");
        require(receiver != address(0), "Zero address for receiver not allowed");

        usdx().transferFrom(msg.sender, address(this), assets);

        uint256 shares = _convertToSharesDown(assets);

        if (shares != 0) {
            _mint(receiver, shares);
        }

        emit Deposit(msg.sender, receiver, assets, shares);

        return shares;
    }

    /// @inheritdoc IERC4626
    function maxMint(address receiver) external view override returns (uint256) {
        return type(uint256).max;
    }

    /// @inheritdoc IERC4626
    function previewMint(uint256 shares) external view override returns (uint256) {
        return _convertToAssetsUp(shares);
    }

    // for CCIP
    function mint(address account, uint256 amount) external whenNotPaused onlyCCIP {
        uint256 assets = _convertToAssetsUp(amount);
        require(usdx().balanceOf(address(this)) >= assets, "Minted usdx is not enough");
        _mint(account, amount);
    }

    // for CCIP
    function burn(uint256 amount) external whenNotPaused onlyCCIP {
        _burn(msg.sender, amount);
    }

    /// @inheritdoc IERC4626
    function mint(uint256 shares, address receiver) external whenNotPaused override returns (uint256) {
        require(shares != 0, "Zero shares not allowed");
        require(receiver != address(0), "Zero address for receiver not allowed");

        uint256 assets = _convertToAssetsUp(shares);

        if (assets != 0) {
            usdx().transferFrom(msg.sender, address(this), assets);
        }

        _mint(receiver, shares);

        emit Deposit(msg.sender, receiver, assets, shares);

        return assets;
    }

    /// @inheritdoc IERC4626
    function maxWithdraw(address owner) external view override returns (uint256) {
        return _convertToAssetsDown(balanceOf(owner));
    }

    /// @inheritdoc IERC4626
    function previewWithdraw(uint256 assets) external view override returns (uint256) {
        return _convertToSharesUp(assets);
    }

    /// @inheritdoc IERC4626
    function withdraw(uint256 assets, address receiver, address owner) external whenNotPaused override returns (uint256) {
        require(assets != 0, "Zero assets not allowed");
        require(receiver != address(0), "Zero address for receiver not allowed");
        require(owner != address(0), "Zero address for owner not allowed");

        uint256 shares = _convertToSharesUp(assets);

        if (owner != msg.sender) {
            uint256 currentAllowance = allowance(owner, msg.sender);
            require(currentAllowance >= shares, "Withdraw amount exceeds allowance");
            _approve(owner, msg.sender, currentAllowance - shares);
        }

        if (shares != 0) {
            _burn(owner, shares);
        }

        usdx().transfer(receiver, assets);

        emit Withdraw(msg.sender, receiver, owner, assets, shares);

        return shares;
    }

    /// @inheritdoc IERC4626
    function maxRedeem(address owner) external view override returns (uint256) {
        return balanceOf(owner);
    }

    /// @inheritdoc IERC4626
    function previewRedeem(uint256 shares) external view override returns (uint256) {
        return _convertToAssetsDown(shares);
    }

    /// @inheritdoc IERC4626
    function redeem(uint256 shares, address receiver, address owner) external whenNotPaused override returns (uint256) {
        require(shares != 0, "Zero shares not allowed");
        require(receiver != address(0), "Zero address for receiver not allowed");
        require(owner != address(0), "Zero address for owner not allowed");

        if (owner != msg.sender) {
            uint256 currentAllowance = allowance(owner, msg.sender);
            require(currentAllowance >= shares, "Redeem amount exceeds allowance");
            _approve(owner, msg.sender, currentAllowance - shares);
        }

        _burn(owner, shares);

        uint256 assets = _convertToAssetsDown(shares);

        if (assets != 0) {
            usdx().transfer(receiver, assets);
        }

        emit Withdraw(msg.sender, receiver, owner, assets, shares);

        return assets;
    }

    function rate() public view returns (uint256) {
        return 10 ** 54 / usdx().rebasingCreditsPerTokenHighres();
    }

    function _convertToSharesUp(uint256 assets) internal view returns (uint256) {
        return assets.rayDiv(rate());
    }

    function _convertToSharesDown(uint256 assets) internal view returns (uint256) {
        return assets.rayDivDown(rate());
    }

    function _convertToAssetsUp(uint256 shares) internal view returns (uint256) {
        return shares.rayMul(rate());
    }

    function _convertToAssetsDown(uint256 shares) internal view returns (uint256) {
        return shares.rayMulDown(rate());
    }

    // --- testing

    function mint2(address account, uint256 amount) external whenNotPaused onlyAdmin {
        uint256 assets = _convertToAssetsUp(amount); 
        usdx().mint(address(this), assets);
        _mint(account, amount);
    }

}
