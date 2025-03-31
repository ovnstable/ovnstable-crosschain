// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../libraries/WadRayMath.sol";

contract MockWadRayMath {
    using WadRayMath for uint256;

    // Constants
    function ray() external pure returns (uint256) {
        return WadRayMath.ray();
    }

    function wad() external pure returns (uint256) {
        return WadRayMath.wad();
    }

    function halfRay() external pure returns (uint256) {
        return WadRayMath.halfRay();
    }

    function halfWad() external pure returns (uint256) {
        return WadRayMath.halfWad();
    }

    // Direct library calls
    function wadMul(uint256 a, uint256 b) external pure returns (uint256) {
        return WadRayMath.wadMul(a, b);
    }

    function wadDiv(uint256 a, uint256 b) external pure returns (uint256) {
        return WadRayMath.wadDiv(a, b);
    }

    function rayMul(uint256 a, uint256 b) external pure returns (uint256) {
        return WadRayMath.rayMul(a, b);
    }

    function rayDiv(uint256 a, uint256 b) external pure returns (uint256) {
        return WadRayMath.rayDiv(a, b);
    }

    function rayToWad(uint256 a) external pure returns (uint256) {
        return WadRayMath.rayToWad(a);
    }

    function wadToRay(uint256 a) external pure returns (uint256) {
        return WadRayMath.wadToRay(a);
    }

    function wadMulDown(uint256 a, uint256 b) external pure returns (uint256) {
        return WadRayMath.wadMulDown(a, b);
    }

    function wadDivDown(uint256 a, uint256 b) external pure returns (uint256) {
        return WadRayMath.wadDivDown(a, b);
    }

    function rayMulDown(uint256 a, uint256 b) external pure returns (uint256) {
        return WadRayMath.rayMulDown(a, b);
    }

    function rayDivDown(uint256 a, uint256 b) external pure returns (uint256) {
        return WadRayMath.rayDivDown(a, b);
    }

    // Attached function calls
    function testWadMulAttached(uint256 a, uint256 b) external pure returns (uint256) {
        return a.wadMul(b);
    }

    function testWadDivAttached(uint256 a, uint256 b) external pure returns (uint256) {
        return a.wadDiv(b);
    }

    function testRayMulAttached(uint256 a, uint256 b) external pure returns (uint256) {
        return a.rayMul(b);
    }

    function testRayDivAttached(uint256 a, uint256 b) external pure returns (uint256) {
        return a.rayDiv(b);
    }

    function testWadMulDownAttached(uint256 a, uint256 b) external pure returns (uint256) {
        return a.wadMulDown(b);
    }

    function testWadDivDownAttached(uint256 a, uint256 b) external pure returns (uint256) {
        return a.wadDivDown(b);
    }

    function testRayMulDownAttached(uint256 a, uint256 b) external pure returns (uint256) {
        return a.rayMulDown(b);
    }

    function testRayDivDownAttached(uint256 a, uint256 b) external pure returns (uint256) {
        return a.rayDivDown(b);
    }
} 