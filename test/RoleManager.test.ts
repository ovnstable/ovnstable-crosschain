import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

describe("RoleManager", function () {
  async function deployRoleManagerFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    const RoleManager = await ethers.getContractFactory("RoleManager");
    const roleManager = await upgrades.deployProxy(RoleManager, []);

    return { roleManager, owner, user1, user2 };
  }

  describe("Initialization", function () {
    it("Should set the right owner", async function () {
      const { roleManager, owner } = await loadFixture(deployRoleManagerFixture);
      expect(await roleManager.hasRole(await roleManager.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
    });

    it("Should set the right upgrader role", async function () {
      const { roleManager, owner } = await loadFixture(deployRoleManagerFixture);
      expect(await roleManager.hasRole(await roleManager.UPGRADER_ROLE(), owner.address)).to.be.true;
    });

    it("Should set PORTFOLIO_AGENT_ROLE as admin for UNIT_ROLE", async function () {
      const { roleManager } = await loadFixture(deployRoleManagerFixture);
      expect(await roleManager.getRoleAdmin(await roleManager.UNIT_ROLE()))
        .to.equal(await roleManager.PORTFOLIO_AGENT_ROLE());
    });
  });

  describe("Role constants", function () {
    it("Should return correct role hashes", async function () {
      const { roleManager } = await loadFixture(deployRoleManagerFixture);
      
      expect(await roleManager.PORTFOLIO_AGENT_ROLE()).to.equal(ethers.keccak256(ethers.toUtf8Bytes("PORTFOLIO_AGENT_ROLE")));
      expect(await roleManager.UNIT_ROLE()).to.equal(ethers.keccak256(ethers.toUtf8Bytes("UNIT_ROLE")));
      expect(await roleManager.EXCHANGER()).to.equal(ethers.keccak256(ethers.toUtf8Bytes("EXCHANGER")));
      expect(await roleManager.FREE_RIDER_ROLE()).to.equal(ethers.keccak256(ethers.toUtf8Bytes("FREE_RIDER_ROLE")));
      expect(await roleManager.UPGRADER_ROLE()).to.equal(ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE")));
    });
  });

  describe("Role management", function () {
    it("Should allow admin to grant roles", async function () {
      const { roleManager, owner, user1 } = await loadFixture(deployRoleManagerFixture);
      
      await roleManager.grantRole(await roleManager.PORTFOLIO_AGENT_ROLE(), user1.address);
      expect(await roleManager.hasRole(await roleManager.PORTFOLIO_AGENT_ROLE(), user1.address)).to.be.true;
    });

    it("Should allow admin to revoke roles", async function () {
      const { roleManager, owner, user1 } = await loadFixture(deployRoleManagerFixture);
      
      await roleManager.grantRole(await roleManager.EXCHANGER(), user1.address);
      await roleManager.revokeRole(await roleManager.EXCHANGER(), user1.address);
      expect(await roleManager.hasRole(await roleManager.EXCHANGER(), user1.address)).to.be.false;
    });

    it("Should not allow non-admin to grant roles", async function () {
      const { roleManager, user1, user2 } = await loadFixture(deployRoleManagerFixture);
      
      await expect(
        roleManager.connect(user1).grantRole(await roleManager.EXCHANGER(), user2.address)
      ).to.be.reverted;
    });

    it("Should not allow non-admin to revoke roles", async function () {
      const { roleManager, owner, user1, user2 } = await loadFixture(deployRoleManagerFixture);
      
      await roleManager.grantRole(await roleManager.EXCHANGER(), user2.address);
      await expect(
        roleManager.connect(user1).revokeRole(await roleManager.EXCHANGER(), user2.address)
      ).to.be.reverted;
    });

    it("Should allow PORTFOLIO_AGENT to grant UNIT_ROLE", async function () {
      const { roleManager, owner, user1, user2 } = await loadFixture(deployRoleManagerFixture);
      
      await roleManager.grantRole(await roleManager.PORTFOLIO_AGENT_ROLE(), user1.address);
      await roleManager.connect(user1).grantRole(await roleManager.UNIT_ROLE(), user2.address);
      
      expect(await roleManager.hasRole(await roleManager.UNIT_ROLE(), user2.address)).to.be.true;
    });
  });

  describe("Upgrade control", function () {
    it("Should allow upgrader to authorize upgrade", async function () {
      const { roleManager, owner } = await loadFixture(deployRoleManagerFixture);
      
      const RoleManagerV2 = await ethers.getContractFactory("RoleManager");
      await expect(upgrades.upgradeProxy(await roleManager.getAddress(), RoleManagerV2))
        .to.not.be.reverted;
    });

    it("Should not allow non-upgrader to authorize upgrade", async function () {
      const { roleManager, user1 } = await loadFixture(deployRoleManagerFixture);
      
      const RoleManagerV2 = await ethers.getContractFactory("RoleManager", user1);
      await expect(
        upgrades.upgradeProxy(await roleManager.getAddress(), RoleManagerV2)
      ).to.be.reverted;
    });
  });

  describe("Role checks", function () {
    it("Should correctly check role membership", async function () {
      const { roleManager, owner, user1 } = await loadFixture(deployRoleManagerFixture);
      
      expect(await roleManager.hasRole(await roleManager.EXCHANGER(), user1.address)).to.be.false;
      
      await roleManager.grantRole(await roleManager.EXCHANGER(), user1.address);
      expect(await roleManager.hasRole(await roleManager.EXCHANGER(), user1.address)).to.be.true;
    });

    it("Should return correct role counts", async function () {
      const { roleManager, owner, user1, user2 } = await loadFixture(deployRoleManagerFixture);
      
      const exchangerRole = await roleManager.EXCHANGER();
      
      expect(await roleManager.getRoleMemberCount(exchangerRole)).to.equal(0);
      
      await roleManager.grantRole(exchangerRole, user1.address);
      expect(await roleManager.getRoleMemberCount(exchangerRole)).to.equal(1);
      
      await roleManager.grantRole(exchangerRole, user2.address);
      expect(await roleManager.getRoleMemberCount(exchangerRole)).to.equal(2);
    });

    it("Should return correct role members", async function () {
      const { roleManager, user1, user2 } = await loadFixture(deployRoleManagerFixture);
      
      const exchangerRole = await roleManager.EXCHANGER();
      
      await roleManager.grantRole(exchangerRole, user1.address);
      await roleManager.grantRole(exchangerRole, user2.address);
      
      expect(await roleManager.getRoleMember(exchangerRole, 0)).to.equal(user1.address);
      expect(await roleManager.getRoleMember(exchangerRole, 1)).to.equal(user2.address);
    });
  });
}); 