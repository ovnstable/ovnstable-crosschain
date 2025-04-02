import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

describe("PayoutManager", function () {
  async function deployPayoutManagerFixture() {
    const [owner, user] = await ethers.getSigners();

    // Deploy mock tokens
    const MockToken = await ethers.getContractFactory("MockERC20");
    const MockXusdToken = await ethers.getContractFactory("MockXusdToken");
    const xusdToken = await MockXusdToken.deploy("XUSD Token", "XUSD");
    const MockWrapper = await ethers.getContractFactory("MockWrappedXusdToken");
    const wrappedXusdToken = await MockWrapper.deploy("Wrapped XUSD", "wXUSD");
    const MockExchange = await ethers.getContractFactory("MockExchange");
    const exchange = await MockExchange.deploy();

    const MockRoleManager = await ethers.getContractFactory("MockRoleManager");
    const roleManager = await MockRoleManager.deploy();
    await roleManager.grantRole(roleManager.UNIT_ROLE(), user.address);
    await roleManager.grantRole(roleManager.EXCHANGER(), owner.address);

    const asset = await MockToken.deploy("Mock USDC", "USDC");


    // Deploy mock RemoteHub
    const MockRemoteHub = await ethers.getContractFactory("MockRemoteHub");
    const remoteHub = await MockRemoteHub.deploy(
        await xusdToken.getAddress(),
        await wrappedXusdToken.getAddress(),
        await exchange.getAddress(),
        await roleManager.getAddress()
    );

    // Deploy PayoutManager contract
    const PayoutManager = await ethers.getContractFactory("ArbitrumPayoutManager");
    const rewardWallet = user.address; // Using user address as reward wallet for testing
    const payoutManager = await upgrades.deployProxy(PayoutManager, [
      await remoteHub.getAddress(),
      rewardWallet
    ]);
    await payoutManager.grantRole(roleManager.EXCHANGER(), owner.address);

    const BscPayoutManager = await ethers.getContractFactory("BscPayoutManager");
    const bscPayoutManager = await upgrades.deployProxy(BscPayoutManager, [await remoteHub.getAddress(), rewardWallet]);

    const EthereumPayoutManager = await ethers.getContractFactory("EthereumPayoutManager");
    const ethereumPayoutManager = await upgrades.deployProxy(EthereumPayoutManager, [await remoteHub.getAddress(), rewardWallet]);

    const ModePayoutManager = await ethers.getContractFactory("ModePayoutManager");
    const modePayoutManager = await upgrades.deployProxy(ModePayoutManager, [await remoteHub.getAddress(), rewardWallet]);

    const OptimismPayoutManager = await ethers.getContractFactory("OptimismPayoutManager");
    const optimismPayoutManager = await upgrades.deployProxy(OptimismPayoutManager, [await remoteHub.getAddress(), rewardWallet]);

    const SonicPayoutManager = await ethers.getContractFactory("SonicPayoutManager");
    const sonicPayoutManager = await upgrades.deployProxy(SonicPayoutManager, [await remoteHub.getAddress(), rewardWallet]);

    return {
      payoutManager,
      remoteHub,
      xusdToken,
      owner,
      user,
      rewardWallet,
      roleManager,
      asset
    };
  }

  describe("Initialization", function () {
    it("Should set the right owner", async function () {
      const { payoutManager, owner } = await loadFixture(deployPayoutManagerFixture);
      expect(await payoutManager.hasRole(await payoutManager.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
    });

    it("Should set the right upgrader role", async function () {
      const { payoutManager, owner } = await loadFixture(deployPayoutManagerFixture);
      const UPGRADER_ROLE = await payoutManager.UPGRADER_ROLE();
      expect(await payoutManager.hasRole(UPGRADER_ROLE, owner.address)).to.be.true;
    });

    it("Should set the correct remoteHub address", async function () {
      const { payoutManager, remoteHub } = await loadFixture(deployPayoutManagerFixture);
      expect(await payoutManager.remoteHub()).to.equal(await remoteHub.getAddress());
    });

    it("Should set the correct reward wallet", async function () {
      const { payoutManager, rewardWallet } = await loadFixture(deployPayoutManagerFixture);
      expect(await payoutManager.rewardWallet()).to.equal(rewardWallet);
    });
  });

  describe("Admin functions", function () {
    it("Should allow upgrader to set new remoteHub", async function () {
      const { payoutManager, remoteHub } = await loadFixture(deployPayoutManagerFixture);
      const newRemoteHubAddress = await remoteHub.getAddress();
      await expect(payoutManager.setRemoteHub(newRemoteHubAddress))
        .to.emit(payoutManager, "RemoteHubUpdated")
        .withArgs(newRemoteHubAddress);
    });

    it("Should not allow non-upgrader to set remoteHub", async function () {
      const { payoutManager, remoteHub, user } = await loadFixture(deployPayoutManagerFixture);
      await expect(payoutManager.connect(user).setRemoteHub(await remoteHub.getAddress()))
        .to.be.revertedWith("Caller doesn't have UPGRADER_ROLE role");
    });

    it("Should allow upgrader to set new reward wallet", async function () {
      const { payoutManager, user } = await loadFixture(deployPayoutManagerFixture);
      const newRewardWallet = user.address;
      await expect(payoutManager.setRewardWallet(newRewardWallet))
        .to.emit(payoutManager, "RewardWalletUpdated")
        .withArgs(newRewardWallet);
    });

    it("Should not allow setting zero address as reward wallet", async function () {
      const { payoutManager } = await loadFixture(deployPayoutManagerFixture);
      await expect(payoutManager.setRewardWallet(ethers.ZeroAddress))
        .to.be.revertedWith("Zero address not allowed");
    });
  });

  describe("Item management", function () {
    it("Should add new item correctly", async function () {
      const { payoutManager, xusdToken, user } = await loadFixture(deployPayoutManagerFixture);
      const item = {
        pool: user.address,
        token: await xusdToken.getAddress(),
        poolName: "Test Pool",
        bribe: ethers.ZeroAddress,
        operation: 0, // SKIM
        to: user.address,
        dexName: "TestDex",
        feePercent: 0,
        feeReceiver: ethers.ZeroAddress,
        __gap: Array(10).fill(0)
      };

      await expect(payoutManager.addItem(item))
        .to.emit(payoutManager, "AddItem")
        .withArgs(await xusdToken.getAddress(), user.address);

      const items = await payoutManager.getItems();
      expect(items.length).to.equal(1);
    });

    it("Should remove item correctly", async function () {
      const { payoutManager, xusdToken, user } = await loadFixture(deployPayoutManagerFixture);
      const item = {
        pool: user.address,
        token: await xusdToken.getAddress(),
        poolName: "Test Pool",
        bribe: ethers.ZeroAddress,
        operation: 0,
        to: user.address,
        dexName: "TestDex",
        feePercent: 0,
        feeReceiver: ethers.ZeroAddress,
        __gap: Array(10).fill(0)
      };

      await payoutManager.addItem(item);
      await expect(payoutManager.removeItem(await xusdToken.getAddress(), user.address))
        .to.emit(payoutManager, "RemoveItem")
        .withArgs(await xusdToken.getAddress(), user.address);

      const items = await payoutManager.getItems();
      expect(items.length).to.equal(0);
    });
  });

  describe("Item removal", function () {

    it("Should remove item and maintain correct array order", async function () {
      const { payoutManager, xusdToken, owner, user } = await loadFixture(deployPayoutManagerFixture);
      
      // Add two items
      const item1 = {
        pool: user.address,
        token: await xusdToken.getAddress(),
        poolName: "Test Pool 1",
        bribe: ethers.ZeroAddress,
        operation: 0,
        to: user.address,
        dexName: "TestDex1",
        feePercent: 0,
        feeReceiver: ethers.ZeroAddress,
        __gap: Array(10).fill(0)
      };

      const item2 = {
        pool: owner.address,
        token: await xusdToken.getAddress(),
        poolName: "Test Pool 2",
        bribe: ethers.ZeroAddress,
        operation: 0,
        to: owner.address,
        dexName: "TestDex2",
        feePercent: 0,
        feeReceiver: ethers.ZeroAddress,
        __gap: Array(10).fill(0)
      };

      await payoutManager.addItem(item1);
      await payoutManager.addItem(item2);

      // Remove first item
      await expect(payoutManager.removeItem(await xusdToken.getAddress(), user.address))
        .to.emit(payoutManager, "RemoveItem")
        .withArgs(await xusdToken.getAddress(), user.address);

      // Check remaining items
      const items = await payoutManager.getItems();
      expect(items.length).to.equal(1);
      expect(items[0].pool).to.equal(owner.address);
      expect(items[0].poolName).to.equal("Test Pool 2");
    });

    it("Should handle removal of last item correctly", async function () {
      const { payoutManager, xusdToken, user } = await loadFixture(deployPayoutManagerFixture);
      const item = {
        pool: user.address,
        token: await xusdToken.getAddress(),
        poolName: "Test Pool",
        bribe: ethers.ZeroAddress,
        operation: 0,
        to: user.address,
        dexName: "TestDex",
        feePercent: 0,
        feeReceiver: ethers.ZeroAddress,
        __gap: Array(10).fill(0)
      };

      await payoutManager.addItem(item);
      await payoutManager.removeItem(await xusdToken.getAddress(), user.address);

      const items = await payoutManager.getItems();
      expect(items.length).to.equal(0);
    });
  });

  describe("Disabled functionality", function () {
    it("Should allow unit role to set disabled status", async function () {
      const { payoutManager } = await loadFixture(deployPayoutManagerFixture);
      // Note: Mock the UNIT_ROLE permission first
      await expect(payoutManager.setDisabled(true))
        .to.emit(payoutManager, "DisabledUpdated")
        .withArgs(true);
    });

    it("Should not process payouts when disabled", async function () {
      const { payoutManager, xusdToken, user } = await loadFixture(deployPayoutManagerFixture);
      await payoutManager.setDisabled(true);
      
      // Note: Mock the EXCHANGER role permission first
      await expect(payoutManager.payoutDone(ethers.ZeroAddress, []))
        .to.be.revertedWithCustomError(payoutManager, "PayoutManagerDisabled");
    });
  });

  describe("Item queries", function () {
    it("Should return correct items length", async function () {
      const { payoutManager, xusdToken, user, owner } = await loadFixture(deployPayoutManagerFixture);
      
      const item1 = {
        pool: user.address,
        token: await xusdToken.getAddress(),
        poolName: "Test Pool 1",
        bribe: ethers.ZeroAddress,
        operation: 0,
        to: user.address,
        dexName: "TestDex1",
        feePercent: 0,
        feeReceiver: ethers.ZeroAddress,
        __gap: Array(10).fill(0)
      };

      const item2 = {
        pool: owner.address,
        token: await xusdToken.getAddress(),
        poolName: "Test Pool 2",
        bribe: ethers.ZeroAddress,
        operation: 0,
        to: owner.address,
        dexName: "TestDex2",
        feePercent: 0,
        feeReceiver: ethers.ZeroAddress,
        __gap: Array(10).fill(0)
      };

      expect(await payoutManager.getItemsLength()).to.equal(0);
      
      await payoutManager.addItem(item1);
      expect(await payoutManager.getItemsLength()).to.equal(1);
      
      await payoutManager.addItem(item2);
      expect(await payoutManager.getItemsLength()).to.equal(2);
      
      await payoutManager.removeItem(await xusdToken.getAddress(), user.address);
      expect(await payoutManager.getItemsLength()).to.equal(1);
    });

    it("Should return all items correctly", async function () {
      const { payoutManager, xusdToken, user, owner } = await loadFixture(deployPayoutManagerFixture);
      
      const item1 = {
        pool: user.address,
        token: await xusdToken.getAddress(),
        poolName: "Test Pool 1",
        bribe: ethers.ZeroAddress,
        operation: 0,
        to: user.address,
        dexName: "TestDex1",
        feePercent: 0,
        feeReceiver: ethers.ZeroAddress,
        __gap: Array(10).fill(0)
      };

      const item2 = {
        pool: owner.address,
        token: await xusdToken.getAddress(),
        poolName: "Test Pool 2",
        bribe: ethers.ZeroAddress,
        operation: 0,
        to: owner.address,
        dexName: "TestDex2",
        feePercent: 0,
        feeReceiver: ethers.ZeroAddress,
        __gap: Array(10).fill(0)
      };

      // Initially empty
      let items = await payoutManager.getItems();
      expect(items.length).to.equal(0);

      // Add items and verify
      await payoutManager.addItem(item1);
      await payoutManager.addItem(item2);
      
      items = await payoutManager.getItems();
      expect(items.length).to.equal(2);
      expect(items[0].pool).to.equal(user.address);
      expect(items[0].poolName).to.equal("Test Pool 1");
      expect(items[1].pool).to.equal(owner.address);
      expect(items[1].poolName).to.equal("Test Pool 2");
    });

    it("Should find items by pool correctly", async function () {
      const { payoutManager, xusdToken, user, owner } = await loadFixture(deployPayoutManagerFixture);
      
      const item1 = {
        pool: user.address,
        token: await xusdToken.getAddress(),
        poolName: "Test Pool 1",
        bribe: ethers.ZeroAddress,
        operation: 0,
        to: user.address,
        dexName: "TestDex1",
        feePercent: 0,
        feeReceiver: ethers.ZeroAddress,
        __gap: Array(10).fill(0)
      };

      const item2 = {
        pool: owner.address, // Same pool as item1
        token: await xusdToken.getAddress(),
        poolName: "Test Pool 2",
        bribe: ethers.ZeroAddress,
        operation: 1, // Different operation
        to: owner.address,
        dexName: "TestDex2",
        feePercent: 0,
        feeReceiver: ethers.ZeroAddress,
        __gap: Array(10).fill(0)
      };

      await payoutManager.addItem(item1);
      await payoutManager.addItem(item2);

      // Find items for user's pool
      const userPoolItems = await payoutManager.findItemsByPool(user.address);
      expect(userPoolItems.length).to.equal(1);
      expect(userPoolItems[0].poolName).to.equal("Test Pool 1");

      // Find items for owner's pool
      const ownerPoolItems = await payoutManager.findItemsByPool(owner.address);
      expect(ownerPoolItems.length).to.equal(1);
      expect(ownerPoolItems[0].poolName).to.equal("Test Pool 2");

      // Find items for non-existent pool
      const nonExistentPoolItems = await payoutManager.findItemsByPool(ethers.ZeroAddress);
      expect(nonExistentPoolItems.length).to.equal(0);
    });

    it("Should return empty array when finding items for non-existent pool", async function () {
      const { payoutManager } = await loadFixture(deployPayoutManagerFixture);
      const items = await payoutManager.findItemsByPool(ethers.ZeroAddress);
      expect(items.length).to.equal(0);
    });
  });

  describe("Batch operations", function () {
    it("Should add multiple items correctly", async function () {
      const { payoutManager, xusdToken, user, owner } = await loadFixture(deployPayoutManagerFixture);
      
      const items = [
        {
          pool: user.address,
          token: await xusdToken.getAddress(),
          poolName: "Test Pool 1",
          bribe: ethers.ZeroAddress,
          operation: 0,
          to: user.address,
          dexName: "TestDex1",
          feePercent: 0,
          feeReceiver: ethers.ZeroAddress,
          __gap: Array(10).fill(0)
        },
        {
          pool: owner.address,
          token: await xusdToken.getAddress(),
          poolName: "Test Pool 2",
          bribe: ethers.ZeroAddress,
          operation: 1,
          to: owner.address,
          dexName: "TestDex2",
          feePercent: 0,
          feeReceiver: ethers.ZeroAddress,
          __gap: Array(10).fill(0)
        }
      ];

      await expect(payoutManager.addItems(items))
        .to.emit(payoutManager, "AddItem")
        .withArgs(await xusdToken.getAddress(), user.address)
        .to.emit(payoutManager, "AddItem")
        .withArgs(await xusdToken.getAddress(), owner.address);

      const savedItems = await payoutManager.getItems();
      expect(savedItems.length).to.equal(2);
      expect(savedItems[0].poolName).to.equal("Test Pool 1");
      expect(savedItems[1].poolName).to.equal("Test Pool 2");
    });

    it("Should handle empty array in addItems", async function () {
      const { payoutManager } = await loadFixture(deployPayoutManagerFixture);
      await payoutManager.addItems([]);
      expect(await payoutManager.getItemsLength()).to.equal(0);
    });

    it("Should remove multiple items correctly", async function () {
      const { payoutManager, xusdToken, user, owner } = await loadFixture(deployPayoutManagerFixture);
      
      const items = [
        {
          pool: user.address,
          token: await xusdToken.getAddress(),
          poolName: "Test Pool 1",
          bribe: ethers.ZeroAddress,
          operation: 0,
          to: user.address,
          dexName: "TestDex1",
          feePercent: 0,
          feeReceiver: ethers.ZeroAddress,
          __gap: Array(10).fill(0)
        },
        {
          pool: owner.address,
          token: await xusdToken.getAddress(),
          poolName: "Test Pool 2",
          bribe: ethers.ZeroAddress,
          operation: 1,
          to: owner.address,
          dexName: "TestDex2",
          feePercent: 0,
          feeReceiver: ethers.ZeroAddress,
          __gap: Array(10).fill(0)
        }
      ];

      await payoutManager.addItems(items);

      const itemsToRemove = [
        { token: await xusdToken.getAddress(), pool: user.address },
        { token: await xusdToken.getAddress(), pool: owner.address }
      ];

      await payoutManager.removeItems();

      expect(await payoutManager.getItemsLength()).to.equal(0);
    });

    it("Should maintain correct state after mixed operations", async function () {
      const { payoutManager, xusdToken, user, owner } = await loadFixture(deployPayoutManagerFixture);
      
      const itemsToAdd = [
        {
          pool: user.address,
          token: await xusdToken.getAddress(),
          poolName: "Test Pool 1",
          bribe: ethers.ZeroAddress,
          operation: 0,
          to: user.address,
          dexName: "TestDex1",
          feePercent: 0,
          feeReceiver: ethers.ZeroAddress,
          __gap: Array(10).fill(0)
        },
        {
          pool: owner.address,
          token: await xusdToken.getAddress(),
          poolName: "Test Pool 2",
          bribe: ethers.ZeroAddress,
          operation: 1,
          to: owner.address,
          dexName: "TestDex2",
          feePercent: 0,
          feeReceiver: ethers.ZeroAddress,
          __gap: Array(10).fill(0)
        }
      ];

      // Add items
      await payoutManager.addItems(itemsToAdd);
      expect(await payoutManager.getItemsLength()).to.equal(2);

      // Remove one item
      await payoutManager.removeItem(await xusdToken.getAddress(), user.address);
      expect(await payoutManager.getItemsLength()).to.equal(1);

      // Add another item
      await payoutManager.addItem(itemsToAdd[0]);
      expect(await payoutManager.getItemsLength()).to.equal(2);

      // Verify final state
      const finalItems = await payoutManager.getItems();
      expect(finalItems[0].pool).to.equal(owner.address);
      expect(finalItems[1].pool).to.equal(user.address);
    });
  });

  describe("Additional PayoutManager Tests", function () {
    describe("Edge Cases and Error Conditions", function () {
      it("Should revert when trying to set zero address as reward wallet", async function () {
        const { payoutManager, xusdToken, user } = await loadFixture(deployPayoutManagerFixture);
        
        await expect(payoutManager.setRewardWallet(ethers.ZeroAddress))
          .to.be.revertedWith("Zero address not allowed");
      });

      it("Should revert when trying to set zero address as remoteHub", async function () {
        const { payoutManager } = await loadFixture(deployPayoutManagerFixture);
        
        await expect(payoutManager.setRemoteHub(ethers.ZeroAddress))
          .to.be.revertedWith("Zero address not allowed");
      });

      it("Should handle empty nonRebaseInfo array in payoutDone", async function () {
        const { payoutManager, xusdToken, user, asset } = await loadFixture(deployPayoutManagerFixture);
        

        const items = [
          {
            pool: user.address,
            token: asset.target,
            poolName: "Pool 1",
            bribe: ethers.ZeroAddress,
            operation: 0,
            to: user.address,
            dexName: "Dex1",
            feePercent: 0,
            feeReceiver: ethers.ZeroAddress,
            __gap: Array(10).fill(0)
          },
          {
            pool: ethers.Wallet.createRandom().address,
            token: asset.target,
            poolName: "Pool 2",
            bribe: ethers.ZeroAddress,
            operation: 3,
            to: user.address,
            dexName: "Dex2",
            feePercent: 10,
            feeReceiver: ethers.ZeroAddress,
            __gap: Array(10).fill(0)
          }
        ];
  
        await payoutManager.addItems(items);

        const nonRebaseInfo = [
          {
            pool: user.address,
            amount: ethers.parseUnits("10", 6),
            __gap: Array(10).fill(0)
          }
        ];

        await asset.mint(payoutManager.target, ethers.parseUnits("1000", 6));

        await payoutManager.payoutDone(asset.target, nonRebaseInfo);
          
      });
    });

    describe("Disabled Functionality", function () {
      it("Should allow unit role to enable/disable", async function () {
        const { payoutManager, roleManager, user } = await loadFixture(deployPayoutManagerFixture);
        
        await roleManager.grantRole(roleManager.UNIT_ROLE(), user.address);
        
        await expect(payoutManager.connect(user).setDisabled(true))
          .to.emit(payoutManager, "DisabledUpdated")
          .withArgs(true);

        expect(await payoutManager.disabled()).to.be.true;

        await expect(payoutManager.connect(user).setDisabled(false))
          .to.emit(payoutManager, "DisabledUpdated")
          .withArgs(false);
      });

      it("Should not process payouts when disabled", async function () {
        const { payoutManager, xusdToken, user, roleManager } = await loadFixture(deployPayoutManagerFixture);
        
        await roleManager.grantRole(roleManager.UNIT_ROLE(), user.address);
        await payoutManager.connect(user).setDisabled(true);

        await expect(payoutManager.payoutDone(xusdToken.target, []))
          .to.be.revertedWithCustomError(payoutManager, "PayoutManagerDisabled");
      });
    });

    describe("Item Management with Multiple Operations", function () {
      it("Should handle multiple items with same token but different pools", async function () {
        const { payoutManager, xusdToken, user } = await loadFixture(deployPayoutManagerFixture);
        
        const items = [
          {
            pool: user.address,
            token: xusdToken.target,
            poolName: "Pool 1",
            bribe: ethers.ZeroAddress,
            operation: 0,
            to: user.address,
            dexName: "Dex1",
            feePercent: 0,
            feeReceiver: ethers.ZeroAddress,
            __gap: Array(10).fill(0)
          },
          {
            pool: ethers.Wallet.createRandom().address,
            token: xusdToken.target,
            poolName: "Pool 2",
            bribe: ethers.ZeroAddress,
            operation: 0,
            to: user.address,
            dexName: "Dex2",
            feePercent: 0,
            feeReceiver: ethers.ZeroAddress,
            __gap: Array(10).fill(0)
          }
        ];

        await payoutManager.addItems(items);
        expect(await payoutManager.getItemsLength()).to.equal(2);
      });

      it("Should maintain correct order after multiple removals", async function () {
        const { payoutManager, xusdToken, user } = await loadFixture(deployPayoutManagerFixture);
        
        const addresses = Array.from({length: 3}, () => ethers.Wallet.createRandom().address);
        
        // Add multiple items
        for (let i = 0; i < addresses.length; i++) {
          await payoutManager.addItem({
            pool: addresses[i],
            token: xusdToken.target,
            poolName: `Pool ${i}`,
            bribe: ethers.ZeroAddress,
            operation: 0,
            to: user.address,
            dexName: `Dex${i}`,
            feePercent: 0,
            feeReceiver: ethers.ZeroAddress,
            __gap: Array(10).fill(0)
          });
        }

        // Remove middle item
        await payoutManager.removeItem(xusdToken.target, addresses[1]);
        
        const items = await payoutManager.getItems();
        expect(items.length).to.equal(2);
        expect(items[0].pool).to.equal(addresses[0]);
        expect(items[1].pool).to.equal(addresses[2]);
      });
    });

    describe("Upgradeability", function () {
      it("Should not allow non-upgrader to upgrade", async function () {
        const { payoutManager, user } = await loadFixture(deployPayoutManagerFixture);
        
        await expect(payoutManager.connect(user).upgradeTo(ethers.ZeroAddress))
          .to.be.revertedWith("Caller doesn't have UPGRADER_ROLE role");
      });

      it("Should allow upgrader to upgrade", async function () {
        const { payoutManager, owner } = await loadFixture(deployPayoutManagerFixture);
        
        const PayoutManager = await ethers.getContractFactory("ArbitrumPayoutManager");
        const newImplementation = await PayoutManager.deploy();
        
        await expect(payoutManager.connect(owner).upgradeTo(newImplementation.target))
          .to.not.be.reverted;
      });
    });

    describe("Item Search and Validation", function () {
      it("Should find items by specific criteria", async function () {
        const { payoutManager, xusdToken, user } = await loadFixture(deployPayoutManagerFixture);
        
        const item = {
          pool: user.address,
          token: xusdToken.target,
          poolName: "Test Pool",
          bribe: ethers.ZeroAddress,
          operation: 0,
          to: user.address,
          dexName: "TestDex",
          feePercent: 0,
          feeReceiver: ethers.ZeroAddress,
          __gap: Array(10).fill(0)
        };

        await payoutManager.addItem(item);
        
        const foundItems = await payoutManager.findItemsByPool(user.address);
        expect(foundItems.length).to.equal(1);
        expect(foundItems[0].poolName).to.equal("Test Pool");
      });

      it("Should return empty array for non-existent pool", async function () {
        const { payoutManager } = await loadFixture(deployPayoutManagerFixture);
        
        const foundItems = await payoutManager.findItemsByPool(ethers.Wallet.createRandom().address);
        expect(foundItems.length).to.equal(0);
      });
    });
  });
}); 