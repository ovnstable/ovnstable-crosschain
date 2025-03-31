// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../libraries/OvnMath.sol";

contract MockOvnMath {
    using OvnMath for uint256;

    function abs(uint256 x, uint256 y) external pure returns (uint256) {
        return OvnMath.abs(x, y);
    }

    function addBasisPoints(uint256 amount, uint256 basisPoints) external pure returns (uint256) {
        return OvnMath.addBasisPoints(amount, basisPoints);
    }

    function reverseAddBasisPoints(uint256 amount, uint256 basisPoints) external pure returns (uint256) {
        return OvnMath.reverseAddBasisPoints(amount, basisPoints);
    }

    function subBasisPoints(uint256 amount, uint256 basisPoints) external pure returns (uint256) {
        return OvnMath.subBasisPoints(amount, basisPoints);
    }

    function reverseSubBasisPoints(uint256 amount, uint256 basisPoints) external pure returns (uint256) {
        return OvnMath.reverseSubBasisPoints(amount, basisPoints);
    }

    // Additional test functions using the library as an attached function
    function testAbsAttached(uint256 x, uint256 y) external pure returns (uint256) {
        return x.abs(y);
    }

    function testAddBasisPointsAttached(uint256 amount, uint256 basisPoints) external pure returns (uint256) {
        return amount.addBasisPoints(basisPoints);
    }

    function testReverseAddBasisPointsAttached(uint256 amount, uint256 basisPoints) external pure returns (uint256) {
        return amount.reverseAddBasisPoints(basisPoints);
    }

    function testSubBasisPointsAttached(uint256 amount, uint256 basisPoints) external pure returns (uint256) {
        return amount.subBasisPoints(basisPoints);
    }

    function testReverseSubBasisPointsAttached(uint256 amount, uint256 basisPoints) external pure returns (uint256) {
        return amount.reverseSubBasisPoints(basisPoints);
    }
} 