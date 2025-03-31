import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
// import { Market, MockERC20, MockExchange, MockRemoteHub } from "/mocks";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Market", function () {
  async function deployMarketFixture() {
    const [owner, user] = await ethers.getSigners();

    // Deploy mock tokens
    const MockToken = await ethers.getContractFactory("MockERC20");
    const MockWrapper = await ethers.getContractFactory("MockWrappedXusdToken");
    const assetToken = await MockToken.deploy("Asset Token", "AST");
    const xusdToken = await MockToken.deploy("XUSD Token", "XUSD");
    const wrappedXusdToken = await MockWrapper.deploy("Wrapped XUSD", "wXUSD");

    // Deploy mock Exchange
    const MockExchange = await ethers.getContractFactory("MockExchange");
    const exchange = await MockExchange.deploy();

    // Deploy mock RemoteHub
    const MockRemoteHub = await ethers.getContractFactory("MockRemoteHub");
    const remoteHub = await MockRemoteHub.deploy(
      await xusdToken.getAddress(),
      await wrappedXusdToken.getAddress(),
      await exchange.getAddress()
    );

    // Deploy Market contract
    const Market = await ethers.getContractFactory("Market");
    const market = await upgrades.deployProxy(Market, [await remoteHub.getAddress()]);

    // Set up asset token
    await market.setToken(await assetToken.getAddress());

    return {
      market,
      remoteHub,
      assetToken,
      xusdToken,
      wrappedXusdToken,
      exchange,
      owner,
      user
    };
  }

  describe("Initialization", function () {
    it("Should set the right owner", async function () {
      const { market, owner } = await loadFixture(deployMarketFixture);
      expect(await market.hasRole(await market.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
    });

    it("Should set the right upgrader role", async function () {
      const { market, owner } = await loadFixture(deployMarketFixture);
      const UPGRADER_ROLE = await market.UPGRADER_ROLE();
      expect(await market.hasRole(UPGRADER_ROLE, owner.address)).to.be.true;
    });

    it("Should set the correct remoteHub address", async function () {
      const { market, remoteHub } = await loadFixture(deployMarketFixture);
      expect(await market.remoteHub()).to.equal(await remoteHub.getAddress());
    });
  });

  describe("Admin functions", function () {
    it("Should allow upgrader to set new remoteHub", async function () {
      const { market, remoteHub } = await loadFixture(deployMarketFixture);
      const newRemoteHubAddress = await remoteHub.getAddress();
      await expect(market.setRemoteHub(newRemoteHubAddress))
        .to.emit(market, "RemoteHubUpdated")
        .withArgs(newRemoteHubAddress);
    });

    it("Should not allow non-upgrader to set remoteHub", async function () {
      const { market, remoteHub, user } = await loadFixture(deployMarketFixture);
      await expect(market.connect(user).setRemoteHub(await remoteHub.getAddress()))
        .to.be.revertedWith("Caller doesn't have UPGRADER_ROLE role");
    });

    it("Should not allow setting zero address as remoteHub", async function () {
      const { market } = await loadFixture(deployMarketFixture);
      await expect(market.setRemoteHub(ethers.ZeroAddress))
        .to.be.revertedWith("Zero address not allowed");
    });
  });

  describe("Wrap functionality", function () {
    async function setupWrapFixture() {
      const fixture = await deployMarketFixture();
      const amount = ethers.parseEther("1000");
      
      await fixture.assetToken.mint(fixture.user.address, amount);
      await fixture.assetToken.connect(fixture.user).approve(
        await fixture.market.getAddress(),
        amount
      );

      return { ...fixture, amount };
    }

    it("Should preview wrap amount correctly", async function () {
      const { market, assetToken, amount } = await loadFixture(setupWrapFixture);
      const wrapAmount = ethers.parseEther("100");
      const previewAmount = await market.previewWrap(await assetToken.getAddress(), wrapAmount);
      expect(previewAmount).to.be.gt(0);
    });

    it("Should wrap asset tokens successfully", async function () {
      const { market, assetToken, user } = await loadFixture(setupWrapFixture);
      const wrapAmount = ethers.parseEther("100");
      const wrapAmountAfter = ethers.parseEther("97");
      
      await expect(market.connect(user).wrap(
        await assetToken.getAddress(),
        wrapAmount,
        user.address
      )).to.emit(market, "Wrap")
        .withArgs(await assetToken.getAddress(), wrapAmount, user.address, wrapAmountAfter);
    });

    it("Should fail wrapping with zero amount", async function () {
      const { market, assetToken, user } = await loadFixture(setupWrapFixture);
      await expect(market.connect(user).wrap(
        await assetToken.getAddress(),
        0,
        user.address
      )).to.be.revertedWith("Zero amount not allowed");
    });
  });

  describe("Unwrap functionality", function () {
    async function setupUnwrapFixture() {
      const fixture = await deployMarketFixture();
      const amount = ethers.parseEther("1000");
      
      // await fixture.xusdToken.mint(fixture.user.address, amount);
      await fixture.wrappedXusdToken.mint(amount, fixture.user.address);
      await fixture.wrappedXusdToken.connect(fixture.user).approve(
        await fixture.market.getAddress(),
        amount
      );

      return { ...fixture, amount };
    }

    it("Should preview unwrap amount correctly", async function () {
      const { market, assetToken } = await loadFixture(setupUnwrapFixture);
      const unwrapAmount = ethers.parseEther("100");
      const previewAmount = await market.previewUnwrap(await assetToken.getAddress(), unwrapAmount);
      expect(previewAmount).to.be.gt(0);
    });

    // it("Should unwrap tokens successfully", async function () {
    //   const { market, assetToken, user } = await loadFixture(setupUnwrapFixture);
    //   const unwrapAmount = ethers.parseEther("100");
      
    //   await expect(market.connect(user).unwrap(
    //     await assetToken.getAddress(),
    //     unwrapAmount,
    //     user.address
    //   )).to.emit(market, "Unwrap")
    //     .withArgs(await assetToken.getAddress(), unwrapAmount, user.address, unwrapAmount);
    // });

    it("Should fail unwrapping with zero amount", async function () {
      const { market, assetToken, user } = await loadFixture(setupUnwrapFixture);
      await expect(market.connect(user).unwrap(
        await assetToken.getAddress(),
        0,
        user.address
      )).to.be.revertedWith("Zero amount not allowed");
    });
  });
}); 