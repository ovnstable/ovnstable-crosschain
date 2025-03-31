// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract MockRoleManager is AccessControl {
    bytes32 public constant UNIT_ROLE = keccak256("UNIT_ROLE");
    bytes32 public constant EXCHANGER = keccak256("EXCHANGER");
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PORTFOLIO_AGENT_ROLE = keccak256("PORTFOLIO_AGENT_ROLE");
    bytes32 public constant FREE_RIDER_ROLE = keccak256("FREE_RIDER_ROLE");
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UNIT_ROLE, msg.sender);
        _grantRole(EXCHANGER, msg.sender);
        _grantRole(AGENT_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        _grantRole(PORTFOLIO_AGENT_ROLE, msg.sender);
        _grantRole(FREE_RIDER_ROLE, msg.sender);
    }

    function hasRole(bytes32 role, address account) public view override returns (bool) {
        return super.hasRole(role, account);
    }

    function grantRole(bytes32 role, address account) public override {
        _grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) public override {
        _revokeRole(role, account);
    }
} 