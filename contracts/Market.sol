// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "./interfaces/IRemoteHub.sol";
import "hardhat/console.sol";

contract Market is IMarket, Initializable, AccessControlUpgradeable, UUPSUpgradeable {

    IERC20 public usdcToken;
    IRemoteHub public remoteHub;
    address private DELETED_0;
    address private DELETED_1;

    // --- events

    event RemoteHubUpdated(address remoteHub);
    event MarketUpdatedTokens(address usdcToken);
    event MarketUpdatedParams(address exchange);
    event Wrap(address asset, uint256 amount, address receiver, uint256 wrappedXusdAmount);
    event Unwrap(address asset, uint256 amount, address receiver, uint256 unwrappedXusdAmount);

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

    function xusd() internal view returns(IXusdToken) {
        return remoteHub.xusd();
    }

    function wrappedXusd() internal view returns(IWrappedXusdToken) {
        return remoteHub.wxusd();
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
     * @dev preview wrap `amount` of `asset` to wxUSD.
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
            return wrappedXusd().previewDeposit(amount - buyFeeAmount);
        } else if (asset == address(xusd())) {
            return wrappedXusd().previewDeposit(amount);
        } else {
            revert('Asset not found');
        }
    }

    /**
     * @dev preview unwrap `amount` of wxUSD to `asset`.
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
            uint256 xusdAmount = wrappedXusd().previewRedeem(amount);
            uint256 redeemFeeAmount = (xusdAmount * exchange().redeemFee()) / exchange().redeemFeeDenominator();
            return xusdAmount - redeemFeeAmount;
        } else if (asset == address(xusd())) {
            return wrappedXusd().previewRedeem(amount);
        } else {
            revert('Asset not found');
        }
    }

    /**
     * @dev Wrap `amount` of `asset` from `msg.sender` to wxUSD of `receiver`.
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

        uint256 wrappedXusdAmount;
        if (asset == address(usdcToken)) {
            usdcToken.transferFrom(msg.sender, address(this), amount);

            usdcToken.approve(address(exchange()), amount);
            uint256 xusdAmount = exchange().buy(asset, amount);

            xusd().approve(address(wrappedXusd()), xusdAmount);
            wrappedXusdAmount = wrappedXusd().deposit(xusdAmount, receiver);

        } else if (asset == address(xusd())) {
            xusd().transferFrom(msg.sender, address(this), amount);

            xusd().approve(address(wrappedXusd()), amount);
            wrappedXusdAmount = wrappedXusd().deposit(amount, receiver);

        } else {
            revert('Asset not found');
        }

        emit Wrap(asset, amount, receiver, wrappedXusdAmount);

        return wrappedXusdAmount;
    }

    /**
     * @dev Unwrap `amount` of wxUSD from `msg.sender` to `asset` of `receiver`.
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

        uint256 unwrappedXusdAmount;
        if (asset == address(usdcToken)) {
            wrappedXusd().transferFrom(msg.sender, address(this), amount);

            wrappedXusd().approve(address(wrappedXusd()), amount);
            uint256 xusdAmount = wrappedXusd().redeem(amount, address(this), address(this));

            xusd().approve(address(exchange()), xusdAmount);
            unwrappedXusdAmount = exchange().redeem(asset, xusdAmount);

            usdcToken.transfer(receiver, unwrappedXusdAmount);

        } else if (asset == address(xusd())) {
            wrappedXusd().transferFrom(msg.sender, address(this), amount);

            wrappedXusd().approve(address(wrappedXusd()), amount);
            unwrappedXusdAmount = wrappedXusd().redeem(amount, receiver, address(this));

        } else {
            revert('Asset not found');
        }

        emit Unwrap(asset, amount, receiver, unwrappedXusdAmount);

        return unwrappedXusdAmount;
    }

    // --- testing

    function checkUpgrading() public pure returns(bool) {
        return false;
    }

}
