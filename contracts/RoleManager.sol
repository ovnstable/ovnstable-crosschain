// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "./interfaces/IRoleManager.sol";

/**
 * @dev Manager role for all contracts of xUSD
 * Single point for assigning roles
 * Allow to set role in this place and this will be available for other contracts
 */
contract RoleManager is Initializable, AccessControlEnumerableUpgradeable, UUPSUpgradeable {

    // ---  initializer

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() initializer public {
        __AccessControlEnumerable_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setRoleAdmin(UNIT_ROLE(), PORTFOLIO_AGENT_ROLE());
    }

    function _authorizeUpgrade(address newImplementation) internal onlyRole(DEFAULT_ADMIN_ROLE) override {}

    /**
     * @return PORTFOLIO_AGENT_ROLE -- portfolio agent wallet (dev wallet)
     */
    function PORTFOLIO_AGENT_ROLE() public pure returns(bytes32) {
        return keccak256("PORTFOLIO_AGENT_ROLE");
    }

    /**
     * @return UNIT_ROLE -- unit wallet (allows our services interract with some methods)
     */
    function UNIT_ROLE() public pure returns(bytes32) {
        return keccak256("UNIT_ROLE");
    }

    /**
     * @return EXCHANGER -- exchange contract
     */
    function EXCHANGER() public pure returns(bytes32) {
        return keccak256("EXCHANGER");
    }

    /**
     * @return FREE_RIDER_ROLE -- role can mint and redeem wothout fees
     */
    function FREE_RIDER_ROLE() public pure returns(bytes32) {
        return keccak256("FREE_RIDER_ROLE");
    }
}
