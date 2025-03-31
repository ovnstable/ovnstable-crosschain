import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("WadRayMath", function () {
  async function deployMockWadRayMathFixture() {
    const MockWadRayMath = await ethers.getContractFactory("MockWadRayMath");
    const mockWadRayMath = await MockWadRayMath.deploy();
    return { mockWadRayMath };
  }

  describe("Constants", function () {
    it("Should return correct constants", async function () {
      const { mockWadRayMath } = await loadFixture(deployMockWadRayMathFixture);
      expect(await mockWadRayMath.ray()).to.equal(ethers.parseUnits("1", 27));
      expect(await mockWadRayMath.wad()).to.equal(ethers.parseUnits("1", 18));
      expect(await mockWadRayMath.halfRay()).to.equal(ethers.parseUnits("0.5", 27));
      expect(await mockWadRayMath.halfWad()).to.equal(ethers.parseUnits("0.5", 18));
    });
  });

  describe("Wad operations", function () {
    it("Should correctly multiply wads using both methods", async function () {
      const { mockWadRayMath } = await loadFixture(deployMockWadRayMathFixture);
      const a = ethers.parseUnits("2", 18);
      const b = ethers.parseUnits("3", 18);
      const expected = ethers.parseUnits("6", 18);
      
      expect(await mockWadRayMath.wadMul(a, b)).to.equal(expected);
      expect(await mockWadRayMath.testWadMulAttached(a, b)).to.equal(expected);
    });

    it("Should correctly divide wads using both methods", async function () {
      const { mockWadRayMath } = await loadFixture(deployMockWadRayMathFixture);
      const a = ethers.parseUnits("6", 18);
      const b = ethers.parseUnits("2", 18);
      const expected = ethers.parseUnits("3", 18);
      
      expect(await mockWadRayMath.wadDiv(a, b)).to.equal(expected);
      expect(await mockWadRayMath.testWadDivAttached(a, b)).to.equal(expected);
    });

    it("Should handle zero inputs in wad operations using both methods", async function () {
      const { mockWadRayMath } = await loadFixture(deployMockWadRayMathFixture);
      const a = ethers.parseUnits("2", 18);
      
      // Direct calls
      expect(await mockWadRayMath.wadMul(a, 0)).to.equal(0);
      expect(await mockWadRayMath.wadMul(0, a)).to.equal(0);
      expect(await mockWadRayMath.wadDiv(0, a)).to.equal(0);
      
      // Attached calls
      expect(await mockWadRayMath.testWadMulAttached(a, 0)).to.equal(0);
      expect(await mockWadRayMath.testWadMulAttached(0, a)).to.equal(0);
      expect(await mockWadRayMath.testWadDivAttached(0, a)).to.equal(0);
    });

    it("Should revert on division by zero using both methods", async function () {
      const { mockWadRayMath } = await loadFixture(deployMockWadRayMathFixture);
      const a = ethers.parseUnits("2", 18);
      
      await expect(mockWadRayMath.wadDiv(a, 0))
        .to.be.revertedWith("Errors.MATH_DIVISION_BY_ZERO");
      await expect(mockWadRayMath.testWadDivAttached(a, 0))
        .to.be.revertedWith("Errors.MATH_DIVISION_BY_ZERO");
    });
  });

  describe("Ray operations", function () {
    it("Should correctly multiply rays using both methods", async function () {
      const { mockWadRayMath } = await loadFixture(deployMockWadRayMathFixture);
      const a = ethers.parseUnits("2", 27);
      const b = ethers.parseUnits("3", 27);
      const expected = ethers.parseUnits("6", 27);
      
      expect(await mockWadRayMath.rayMul(a, b)).to.equal(expected);
      expect(await mockWadRayMath.testRayMulAttached(a, b)).to.equal(expected);
    });

    it("Should correctly divide rays using both methods", async function () {
      const { mockWadRayMath } = await loadFixture(deployMockWadRayMathFixture);
      const a = ethers.parseUnits("6", 27);
      const b = ethers.parseUnits("2", 27);
      const expected = ethers.parseUnits("3", 27);
      
      expect(await mockWadRayMath.rayDiv(a, b)).to.equal(expected);
      expect(await mockWadRayMath.testRayDivAttached(a, b)).to.equal(expected);
    });

    it("Should handle zero inputs in ray operations using both methods", async function () {
      const { mockWadRayMath } = await loadFixture(deployMockWadRayMathFixture);
      const a = ethers.parseUnits("2", 27);
      
      // Direct calls
      expect(await mockWadRayMath.rayMul(a, 0)).to.equal(0);
      expect(await mockWadRayMath.rayMul(0, a)).to.equal(0);
      expect(await mockWadRayMath.rayDiv(0, a)).to.equal(0);
      
      // Attached calls
      expect(await mockWadRayMath.testRayMulAttached(a, 0)).to.equal(0);
      expect(await mockWadRayMath.testRayMulAttached(0, a)).to.equal(0);
      expect(await mockWadRayMath.testRayDivAttached(0, a)).to.equal(0);
    });
  });

  describe("Down rounding operations", function () {
    it("Should correctly multiply wads rounding down using both methods", async function () {
      const { mockWadRayMath } = await loadFixture(deployMockWadRayMathFixture);
      const a = ethers.parseUnits("2", 18);
      const b = ethers.parseUnits("3", 18);
      const expected = ethers.parseUnits("6", 18);
      
      expect(await mockWadRayMath.wadMulDown(a, b)).to.equal(expected);
      expect(await mockWadRayMath.testWadMulDownAttached(a, b)).to.equal(expected);
    });

    it("Should correctly multiply rays rounding down using both methods", async function () {
      const { mockWadRayMath } = await loadFixture(deployMockWadRayMathFixture);
      const a = ethers.parseUnits("2", 27);
      const b = ethers.parseUnits("3", 27);
      const expected = ethers.parseUnits("6", 27);
      
      expect(await mockWadRayMath.rayMulDown(a, b)).to.equal(expected);
      expect(await mockWadRayMath.testRayMulDownAttached(a, b)).to.equal(expected);
    });
  });

  describe("Conversion operations", function () {
    it("Should correctly convert between ray and wad", async function () {
      const { mockWadRayMath } = await loadFixture(deployMockWadRayMathFixture);
      const ray = ethers.parseUnits("2", 27);
      const wad = ethers.parseUnits("2", 18);
      
      expect(await mockWadRayMath.rayToWad(ray)).to.equal(wad);
      expect(await mockWadRayMath.wadToRay(wad)).to.equal(ray);
    });

    it("Should handle conversion of complex numbers", async function () {
      const { mockWadRayMath } = await loadFixture(deployMockWadRayMathFixture);
      const ray = ethers.parseUnits("2.5", 27);
      const wad = ethers.parseUnits("2.5", 18);
      
      expect(await mockWadRayMath.rayToWad(ray)).to.equal(wad);
      expect(await mockWadRayMath.wadToRay(wad)).to.equal(ray);
    });

    it("Should handle zero conversions", async function () {
      const { mockWadRayMath } = await loadFixture(deployMockWadRayMathFixture);
      expect(await mockWadRayMath.rayToWad(0)).to.equal(0);
      expect(await mockWadRayMath.wadToRay(0)).to.equal(0);
    });
  });
}); 