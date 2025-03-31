import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("OvnMath", function () {
  async function deployMockOvnMathFixture() {
    const MockOvnMath = await ethers.getContractFactory("MockOvnMath");
    const mockOvnMath = await MockOvnMath.deploy();
    return { mockOvnMath };
  }

  describe("abs", function () {
    it("Should return correct absolute difference when x > y", async function () {
      const { mockOvnMath } = await loadFixture(deployMockOvnMathFixture);
      expect(await mockOvnMath.abs(100, 60)).to.equal(40);
      expect(await mockOvnMath.testAbsAttached(100, 60)).to.equal(40);
    });

    it("Should return correct absolute difference when x < y", async function () {
      const { mockOvnMath } = await loadFixture(deployMockOvnMathFixture);
      expect(await mockOvnMath.abs(60, 100)).to.equal(40);
      expect(await mockOvnMath.testAbsAttached(60, 100)).to.equal(40);
    });

    it("Should return 0 when x equals y", async function () {
      const { mockOvnMath } = await loadFixture(deployMockOvnMathFixture);
      expect(await mockOvnMath.abs(100, 100)).to.equal(0);
      expect(await mockOvnMath.testAbsAttached(100, 100)).to.equal(0);
    });
  });

  describe("Basis points calculations", function () {
    it("Should correctly add basis points using both methods", async function () {
      const { mockOvnMath } = await loadFixture(deployMockOvnMathFixture);
      // Add 10% (1000 basis points)
      expect(await mockOvnMath.addBasisPoints(1000, 1000)).to.equal(1100);
      expect(await mockOvnMath.testAddBasisPointsAttached(1000, 1000)).to.equal(1100);
      // Add 1% (100 basis points)
      expect(await mockOvnMath.addBasisPoints(1000, 100)).to.equal(1010);
      expect(await mockOvnMath.testAddBasisPointsAttached(1000, 100)).to.equal(1010);
    });

    it("Should correctly reverse add basis points using both methods", async function () {
      const { mockOvnMath } = await loadFixture(deployMockOvnMathFixture);
      // Reverse 10% addition
      expect(await mockOvnMath.reverseAddBasisPoints(1100, 1000)).to.equal(1000);
      expect(await mockOvnMath.testReverseAddBasisPointsAttached(1100, 1000)).to.equal(1000);
      // Reverse 1% addition
      expect(await mockOvnMath.reverseAddBasisPoints(1010, 100)).to.equal(1000);
      expect(await mockOvnMath.testReverseAddBasisPointsAttached(1010, 100)).to.equal(1000);
    });

    it("Should correctly subtract basis points using both methods", async function () {
      const { mockOvnMath } = await loadFixture(deployMockOvnMathFixture);
      // Subtract 10% (1000 basis points)
      expect(await mockOvnMath.subBasisPoints(1000, 1000)).to.equal(900);
      expect(await mockOvnMath.testSubBasisPointsAttached(1000, 1000)).to.equal(900);
      // Subtract 1% (100 basis points)
      expect(await mockOvnMath.subBasisPoints(1000, 100)).to.equal(990);
      expect(await mockOvnMath.testSubBasisPointsAttached(1000, 100)).to.equal(990);
    });

    it("Should correctly reverse subtract basis points using both methods", async function () {
      const { mockOvnMath } = await loadFixture(deployMockOvnMathFixture);
      // Reverse 10% subtraction
      expect(await mockOvnMath.reverseSubBasisPoints(900, 1000)).to.equal(1000);
      expect(await mockOvnMath.testReverseSubBasisPointsAttached(900, 1000)).to.equal(1000);
      // Reverse 1% subtraction
      expect(await mockOvnMath.reverseSubBasisPoints(990, 100)).to.equal(1000);
      expect(await mockOvnMath.testReverseSubBasisPointsAttached(990, 100)).to.equal(1000);
    });

    it("Should handle zero amount using both methods", async function () {
      const { mockOvnMath } = await loadFixture(deployMockOvnMathFixture);
      // Direct calls
      expect(await mockOvnMath.addBasisPoints(0, 1000)).to.equal(0);
      expect(await mockOvnMath.reverseAddBasisPoints(0, 1000)).to.equal(0);
      expect(await mockOvnMath.subBasisPoints(0, 1000)).to.equal(0);
      expect(await mockOvnMath.reverseSubBasisPoints(0, 1000)).to.equal(0);
      
      // Attached function calls
      expect(await mockOvnMath.testAddBasisPointsAttached(0, 1000)).to.equal(0);
      expect(await mockOvnMath.testReverseAddBasisPointsAttached(0, 1000)).to.equal(0);
      expect(await mockOvnMath.testSubBasisPointsAttached(0, 1000)).to.equal(0);
      expect(await mockOvnMath.testReverseSubBasisPointsAttached(0, 1000)).to.equal(0);
    });

    it("Should handle zero basis points using both methods", async function () {
      const { mockOvnMath } = await loadFixture(deployMockOvnMathFixture);
      // Direct calls
      expect(await mockOvnMath.addBasisPoints(1000, 0)).to.equal(1000);
      expect(await mockOvnMath.reverseAddBasisPoints(1000, 0)).to.equal(1000);
      expect(await mockOvnMath.subBasisPoints(1000, 0)).to.equal(1000);
      expect(await mockOvnMath.reverseSubBasisPoints(1000, 0)).to.equal(1000);

      // Attached function calls
      expect(await mockOvnMath.testAddBasisPointsAttached(1000, 0)).to.equal(1000);
      expect(await mockOvnMath.testReverseAddBasisPointsAttached(1000, 0)).to.equal(1000);
      expect(await mockOvnMath.testSubBasisPointsAttached(1000, 0)).to.equal(1000);
      expect(await mockOvnMath.testReverseSubBasisPointsAttached(1000, 0)).to.equal(1000);
    });

    it("Should handle large numbers", async function () {
      const { mockOvnMath } = await loadFixture(deployMockOvnMathFixture);
      const largeNumber = ethers.parseEther("1000000"); // 1 million ETH
      
      // Test with 10% (1000 basis points)
      const expectedAdd = largeNumber * 11n / 10n;
      const expectedSub = largeNumber * 9n / 10n;
      
      expect(await mockOvnMath.addBasisPoints(largeNumber, 1000)).to.equal(expectedAdd);
      expect(await mockOvnMath.subBasisPoints(largeNumber, 1000)).to.equal(expectedSub);
      
      // Verify reverse operations
      expect(await mockOvnMath.reverseAddBasisPoints(expectedAdd, 1000)).to.equal(largeNumber);
      expect(await mockOvnMath.reverseSubBasisPoints(expectedSub, 1000)).to.equal(largeNumber);
    });
  });
}); 