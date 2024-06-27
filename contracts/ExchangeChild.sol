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

    event RemoteHubUpdated(address remoteHub);
    event PayoutShortEvent(uint256 newDelta, uint256 nonRebaseDelta);    

    uint256 public newDelta;
    uint256 public payoutDeadline;
    uint256 public payoutDelta;
    IRemoteHub public remoteHub;

    function usdPlus() internal view returns(IUsdPlusToken) {
        return remoteHub.usdp();
    }

    function payoutManager() internal view returns(IPayoutManager) {
        return remoteHub.payoutManager();
    }

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admin");
        _;
    }

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

    function setRemoteHub(address _remoteHub) external onlyAdmin {
        require(_remoteHub != address(0), "Zero address not allowed");
        remoteHub = IRemoteHub(_remoteHub);
        emit RemoteHubUpdated(_remoteHub);
    }

    function setPayoutDelta(uint256 _payoutDelta) external onlyAdmin {
        payoutDelta = _payoutDelta;
    }

    function payout() public {
        console.log("newDelta", newDelta);
        console.log("payoutDeadline", payoutDeadline);
        console.log("block.timestamp", block.timestamp);
        require(newDelta > 0, "new delta is not ready");
        require(payoutDeadline >= block.timestamp, "timestamp not ready");

        require(newDelta > LIQ_DELTA_DM, "Negative rebase");
        console.log("1", address(usdPlus()));
        console.log("11", address(remoteHub));
        console.log("111", usdPlus().totalSupply());
        uint256 totalNav = usdPlus().totalSupply() * newDelta / LIQ_DELTA_DM;
        console.log("2");
        (NonRebaseInfo [] memory nonRebaseInfo, uint256 nonRebaseDelta) = usdPlus().changeSupply(totalNav);
        console.log("3", nonRebaseDelta);
        console.log("33", address(payoutManager()));
        if (nonRebaseDelta > 0) {
            usdPlus().mint(address(payoutManager()), nonRebaseDelta);
            console.log("4");
            payoutManager().payoutDone(address(usdPlus()), nonRebaseInfo);
        }
        console.log("5", totalNav, address(usdPlus()));

        require(usdPlus().totalSupply() == totalNav,'total != nav');
        
        newDelta = 0;

        emit PayoutShortEvent(newDelta, nonRebaseDelta);
    }

    function payout(uint256 _newDelta) external onlyAdmin {
        console.log("child!");
        require(_newDelta > LIQ_DELTA_DM, "Negative rebase");
        
        newDelta = _newDelta;
        payoutDeadline = block.timestamp + payoutDelta;

        if (payoutDelta == 0) {
            payout();
        }
    }
}
