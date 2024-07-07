// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "../interfaces/IRemoteHub.sol";
import "hardhat/console.sol";

contract MarketTest is IMarket, Initializable, AccessControlUpgradeable, UUPSUpgradeable {

    IERC20 public usdcToken;
    IRemoteHub public remoteHub;
    address private DELETED_0;
    address private DELETED_1;

    // --- events

    event RemoteHubUpdated(address remoteHub);
    event MarketUpdatedTokens(address usdcToken);
    event MarketUpdatedParams(address exchange);
    event Wrap(address asset, uint256 amount, address receiver, uint256 wrappedUsdxAmount);
    event Unwrap(address asset, uint256 amount, address receiver, uint256 unwrappedUsdxAmount);

    // ---  initializer

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _remoteHub) initializer public {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        remoteHub = IRemoteHub(_remoteHub);
    }

    function _authorizeUpgrade(address newImplementation) internal onlyRole(DEFAULT_ADMIN_ROLE) override {}

    // ---  remoteHub getters

    function usdx() internal view returns(IUsdxToken) {
        return remoteHub.usdx();
    }

    function wrappedUsdx() internal view returns(IWrappedUsdxToken) {
        return remoteHub.wusdx();
    }

    function exchange() internal view returns(IExchange) {
        return remoteHub.exchange();
    }

    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller doesn't have DEFAULT_ADMIN_ROLE role");
        _;
    }

    // --- setters

    function setRemoteHub(address _remoteHub) external onlyAdmin {
        require(_remoteHub != address(0), "Zero address not allowed");
        remoteHub = IRemoteHub(_remoteHub);
        emit RemoteHubUpdated(_remoteHub);
    }

    function setToken(address _usdcToken) external onlyAdmin {
        require(_usdcToken != address(0), "Zero address not allowed");
        usdcToken = IERC20(_usdcToken);
        emit MarketUpdatedTokens(_usdcToken);
    }

    // --- logic

    /**
     * @dev preview wrap `amount` of `asset` to wUSDx.
     *
     * This is an estimate amount, real amount may vary.
     *
     * Requirements:
     *
     * - `asset` cannot be the zero address.
     * - `amount` cannot be the zero.
     */
    function previewWrap(address asset, uint256 amount) external view override returns (uint256) {
        require(asset != address(0), "Zero address for asset not allowed");
        require(amount != 0, "Zero amount not allowed");

        if (asset == address(usdcToken)) {
            uint256 buyFeeAmount = (amount * exchange().buyFee()) / exchange().buyFeeDenominator();
            return wrappedUsdx().previewDeposit(amount - buyFeeAmount);
        } else if (asset == address(usdx())) {
            return wrappedUsdx().previewDeposit(amount);
        } else {
            revert('Asset not found');
        }
    }

    /**
     * @dev preview unwrap `amount` of wUSDx to `asset`.
     *
     * This is an estimate amount, real amount may vary.
     *
     * Requirements:
     *
     * - `asset` cannot be the zero address.
     * - `amount` cannot be the zero.
     */
    function previewUnwrap(address asset, uint256 amount) external view override returns (uint256) {
        require(asset != address(0), "Zero address for asset not allowed");
        require(amount != 0, "Zero amount not allowed");

        if (asset == address(usdcToken)) {
            uint256 usdxAmount = wrappedUsdx().previewRedeem(amount);
            uint256 redeemFeeAmount = (usdxAmount * exchange().redeemFee()) / exchange().redeemFeeDenominator();
            return usdxAmount - redeemFeeAmount;
        } else if (asset == address(usdx())) {
            return wrappedUsdx().previewRedeem(amount);
        } else {
            revert('Asset not found');
        }
    }

    /**
     * @dev Wrap `amount` of `asset` from `msg.sender` to wUSDx of `receiver`.
     *
     * Emits a {Wrap} event.
     *
     * Requirements:
     *
     * - `asset` cannot be the zero address.
     * - `amount` cannot be the zero.
     * - `receiver` cannot be the zero address.
     */
    function wrap(address asset, uint256 amount, address receiver) external override returns (uint256) {
        require(asset != address(0), "Zero address for asset not allowed");
        require(amount != 0, "Zero amount not allowed");
        require(receiver != address(0), "Zero address for receiver not allowed");

        uint256 wrappedUsdxAmount;
        if (asset == address(usdcToken)) {
            usdcToken.transferFrom(msg.sender, address(this), amount);

            usdcToken.approve(address(exchange()), amount);
            uint256 usdxAmount = exchange().buy(asset, amount);

            usdx().approve(address(wrappedUsdx()), usdxAmount);
            wrappedUsdxAmount = wrappedUsdx().deposit(usdxAmount, receiver);

        } else if (asset == address(usdx())) {
            usdx().transferFrom(msg.sender, address(this), amount);

            usdx().approve(address(wrappedUsdx()), amount);
            wrappedUsdxAmount = wrappedUsdx().deposit(amount, receiver);

        } else {
            revert('Asset not found');
        }

        emit Wrap(asset, amount, receiver, wrappedUsdxAmount);

        return wrappedUsdxAmount;
    }

    /**
     * @dev Unwrap `amount` of wUSDx from `msg.sender` to `asset` of `receiver`.
     *
     * Emits a {Unwrap} event.
     *
     * Requirements:
     *
     * - `asset` cannot be the zero address.
     * - `amount` cannot be the zero.
     * - `receiver` cannot be the zero address.
     */
    function unwrap(address asset, uint256 amount, address receiver) external override returns (uint256) {
        require(asset != address(0), "Zero address for asset not allowed");
        require(amount != 0, "Zero amount not allowed");
        require(receiver != address(0), "Zero address for receiver not allowed");

        uint256 unwrappedUsdxAmount;
        if (asset == address(usdcToken)) {
            wrappedUsdx().transferFrom(msg.sender, address(this), amount);

            wrappedUsdx().approve(address(wrappedUsdx()), amount);
            uint256 usdxAmount = wrappedUsdx().redeem(amount, address(this), address(this));

            usdx().approve(address(exchange()), usdxAmount);
            unwrappedUsdxAmount = exchange().redeem(asset, usdxAmount);

            usdcToken.transfer(receiver, unwrappedUsdxAmount);

        } else if (asset == address(usdx())) {
            wrappedUsdx().transferFrom(msg.sender, address(this), amount);

            wrappedUsdx().approve(address(wrappedUsdx()), amount);
            unwrappedUsdxAmount = wrappedUsdx().redeem(amount, receiver, address(this));

        } else {
            revert('Asset not found');
        }

        emit Unwrap(asset, amount, receiver, unwrappedUsdxAmount);

        return unwrappedUsdxAmount;
    }

    // --- testing

    function checkUpgrading() public pure returns(bool) {
        return true;
    }

}
