// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import "./interfaces/IRemoteHub.sol";
import "hardhat/console.sol";

contract ExchangeChild is Initializable, AccessControlUpgradeable, UUPSUpgradeable, PausableUpgradeable {

    uint256 public constant LIQ_DELTA_DM = 1e6;

    uint256 public newDelta;
    uint256 public payoutDeadline;
    uint256 public payoutDelta;
    IRemoteHub public remoteHub;

    // --- events

    event RemoteHubUpdated(address remoteHub);
    event PayoutDeltaUpdated(uint256 payoutDelta);
    event PayoutShortEvent(uint256 newDelta, uint256 nonRebaseDelta);
    event PayoutInfoStored(uint256 newDelta, uint256 payoutDeadline);

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

        remoteHub = IRemoteHub(_remoteHub);
    }

    function _authorizeUpgrade(address newImplementation) internal onlyRole(DEFAULT_ADMIN_ROLE) override {}

    // ---  remoteHub getters

    function usdx() internal view returns(IUsdxToken) {
        return remoteHub.usdx();
    }
    
    function roleManager() internal view returns(IRoleManager) {
        return remoteHub.roleManager();
    }

    function payoutManager() internal view returns(IPayoutManager) {
        return remoteHub.payoutManager();
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

    function setPayoutDelta(uint256 _payoutDelta) external onlyAdmin {
        payoutDelta = _payoutDelta;
        emit PayoutDeltaUpdated(payoutDelta);
    }

    // --- logic

    function payout() public {
        require(newDelta > 0, "new delta is not ready");
        require(_isUnit() || payoutDeadline >= block.timestamp, "You are not Unit or timestamp is not ready.");

        require(newDelta > LIQ_DELTA_DM, "Negative rebase");
        uint256 totalNav = usdx().totalSupply() * newDelta / LIQ_DELTA_DM;
        (NonRebaseInfo [] memory nonRebaseInfo, uint256 nonRebaseDelta) = usdx().changeSupply(totalNav);

        if (nonRebaseDelta > 0) {
            usdx().mint(address(payoutManager()), nonRebaseDelta);
            payoutManager().payoutDone(address(usdx()), nonRebaseInfo);
        }

        require(usdx().totalSupply() == totalNav,'total != nav');
        
        newDelta = 0;

        emit PayoutShortEvent(newDelta, nonRebaseDelta);
    }

    function payout(uint256 _newDelta) external onlyAdmin {
        require(_newDelta > LIQ_DELTA_DM, "Negative rebase");
        
        newDelta = _newDelta;
        payoutDeadline = block.timestamp + payoutDelta;

        emit PayoutInfoStored(newDelta, payoutDeadline);

        if (payoutDelta == 0) {
            payout();
        }
    }

    function _isUnit() internal view returns (bool) {
        return roleManager().hasRole(roleManager().UNIT_ROLE(), msg.sender);
    }
}
