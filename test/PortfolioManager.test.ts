import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("PortfolioManager", function () {
    async function deployPortfolioManagerFixture() {
        const [owner, user, portfolioAgent, exchanger, upgrader] = await ethers.getSigners();
        console.log("owner", owner.address);
        console.log("user", user.address);
        console.log("portfolioAgent", portfolioAgent.address);
        console.log("exchanger", exchanger.address);
        console.log("upgrader", upgrader.address);

        // Deploy mock tokens
        const MockToken = await ethers.getContractFactory("MockERC20");
        const asset = await MockToken.deploy("Mock USDC", "USDC");

        // Deploy mock contracts
        const MockRoleManager = await ethers.getContractFactory("MockRoleManager");
        const roleManager = await MockRoleManager.deploy();

        const MockXusdToken = await ethers.getContractFactory("MockXusdToken");
        const xusdToken = await MockXusdToken.deploy("XUSD Token", "XUSD");

        const MockPayoutManager = await ethers.getContractFactory("ArbitrumPayoutManager");
        const payoutManager = await MockPayoutManager.deploy();

        // Setup roles
        await roleManager.grantRole(roleManager.PORTFOLIO_AGENT_ROLE(), portfolioAgent.address);
        await roleManager.grantRole(roleManager.EXCHANGER(), exchanger.address);
        await roleManager.grantRole(roleManager.UPGRADER_ROLE(), upgrader.address);
        // Deploy PortfolioManager
        const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
        const portfolioManager = await upgrades.deployProxy(PortfolioManager);

        await portfolioManager.connect(owner).grantRole(portfolioManager.UPGRADER_ROLE(), upgrader.address);
        await portfolioManager.connect(owner).grantRole(portfolioManager.UPGRADER_ROLE(), owner.address);
        await portfolioManager.connect(owner).grantRole(portfolioManager.UPGRADER_ROLE(), portfolioAgent.address);
        await portfolioManager.connect(owner).grantRole(roleManager.EXCHANGER(), exchanger.address);
        await portfolioManager.setAsset(asset.target);

        // Deploy ExchangeMother
        const ExchangeMother = await ethers.getContractFactory("ExchangeMother");
        const exchangeMother = await upgrades.deployProxy(ExchangeMother, [
            ethers.ZeroAddress
        ]);

        const MockRemoteHub = await ethers.getContractFactory("MockRemoteHub");
        const remoteHub = await MockRemoteHub.deploy(
            await xusdToken.getAddress(),
            ethers.ZeroAddress,
            exchangeMother.target,
            await roleManager.getAddress()
        );
        await remoteHub.setPayoutManager(payoutManager.target);
        
        await portfolioManager.setRemoteHub(remoteHub.target);

        // Deploy mock strategy
        const MockStrategy = await ethers.getContractFactory("MockStrategy");
        const strategy1 = await MockStrategy.deploy();
        const strategy2 = await MockStrategy.deploy();
        const strategy3 = await MockStrategy.deploy();

        // Constants
        const UPGRADER_ROLE = await portfolioManager.UPGRADER_ROLE();
        const RISK_FACTOR_DM = 100000; // 1e5

        return {
            portfolioManager,
            asset,
            roleManager,
            strategy1,
            strategy2,
            strategy3,
            owner,
            user,
            portfolioAgent,
            exchanger,
            UPGRADER_ROLE,
            RISK_FACTOR_DM
        };
    }

    describe("Initialization", function () {
        it("Should initialize with correct values", async function () {
            const { portfolioManager, asset, roleManager } = await loadFixture(deployPortfolioManagerFixture);
            
            expect(await portfolioManager.getTotalRiskFactor()).to.equal(0);
        });
    });

    describe("Strategy Management", function () {
        describe("Add Strategy", function () {
            it("Should allow portfolio agent to add strategy", async function () {
                const { portfolioManager, portfolioAgent, strategy1 } = await loadFixture(deployPortfolioManagerFixture);
                
                await expect(portfolioManager.connect(portfolioAgent).addStrategy(
                    strategy1.target
                )).to.emit(portfolioManager, "StrategyWeightUpdated");

                const weights = await portfolioManager.getAllStrategyWeights();
                expect(weights.length).to.equal(1);
                expect(weights[0].strategy).to.equal(strategy1.target);
                expect(weights[0].targetWeight).to.equal(0);
                expect(weights[0].maxWeight).to.equal(0);
                expect(weights[0].enabled).to.be.false;
            });

            it("Should not allow non-portfolio agent to add strategy", async function () {
                const { portfolioManager, user, strategy1 } = await loadFixture(deployPortfolioManagerFixture);
                
                await expect(portfolioManager.connect(user).addStrategy(
                    strategy1.target
                )).to.be.revertedWith("Caller doesn't have UPGRADER_ROLE role");
            });
        });

        describe("Remove Strategy", function () {
            it("Should allow portfolio agent to remove strategy", async function () {
                const { portfolioManager, portfolioAgent, strategy1 } = await loadFixture(deployPortfolioManagerFixture);
                
                await portfolioManager.connect(portfolioAgent).addStrategy(strategy1.target);
                
                await expect(portfolioManager.connect(portfolioAgent).removeStrategy(strategy1.target))
                .to.not.be.reverted;

                const weights = await portfolioManager.getAllStrategyWeights();
                expect(weights.length).to.equal(0);
            });
        });
    });

    describe("Balance Operations", function () {
        beforeEach(async function () {
            const { portfolioManager, portfolioAgent, strategy1, strategy2 } = await loadFixture(deployPortfolioManagerFixture);
            
            await portfolioManager.connect(portfolioAgent).addStrategy(strategy1.target);
            await portfolioManager.connect(portfolioAgent).addStrategy(strategy2.target);
        });

        it("Should execute balance correctly", async function () {
            const { portfolioManager, portfolioAgent, strategy1, strategy2, exchanger } = await loadFixture(deployPortfolioManagerFixture);
            
            await portfolioManager.connect(portfolioAgent).addStrategy(strategy1.target);
            await portfolioManager.connect(portfolioAgent).setCashStrategy(strategy1.target);

            await portfolioManager.connect(exchanger).deposit();

            await expect(portfolioManager.connect(portfolioAgent).balance())
                .to.not.be.reverted;
        });
    });

    describe("Deposit/Withdraw Operations", function () {
        beforeEach(async function () {
            const { portfolioManager, portfolioAgent, strategy1, asset } = await loadFixture(deployPortfolioManagerFixture);
            
            await portfolioManager.connect(portfolioAgent).addStrategy(strategy1.target);
            await portfolioManager.connect(portfolioAgent).setCashStrategy(strategy1.target);
            await asset.mint(portfolioManager.target, ethers.parseUnits("1000", 6));
        });

        it("Should execute deposit correctly", async function () {
            const { portfolioManager, exchanger, portfolioAgent, strategy1 } = await loadFixture(deployPortfolioManagerFixture);
            
            await portfolioManager.connect(portfolioAgent).setCashStrategy(strategy1.target);

            await expect(portfolioManager.connect(exchanger).deposit())
                .to.not.be.reverted;
        });

        it("Should execute withdraw correctly", async function () {
            const { portfolioManager, exchanger, portfolioAgent, strategy1 } = await loadFixture(deployPortfolioManagerFixture);

            await portfolioManager.connect(portfolioAgent).setCashStrategy(strategy1.target);

            await portfolioManager.connect(exchanger).deposit();

            const withdrawAmount = ethers.parseUnits("1", 6);
            await expect(portfolioManager.connect(exchanger).withdraw(withdrawAmount))
                .revertedWith("Not enouth money for withdraw during balancing");
            
        });
    });

    describe("View Functions", function () {
        it("Should return correct total net assets", async function () {
            const { portfolioManager, portfolioAgent, strategy1, strategy2 } = await loadFixture(deployPortfolioManagerFixture);
            
            await portfolioManager.connect(portfolioAgent).addStrategy(strategy1.target);
            await portfolioManager.connect(portfolioAgent).addStrategy(strategy2.target);

            await strategy1.setNetAssetValue(ethers.parseUnits("500", 6));
            await strategy2.setNetAssetValue(ethers.parseUnits("500", 6));

            expect(await portfolioManager.totalNetAssets()).to.equal(ethers.parseUnits("1000", 6));
        });
    });

    describe("Access Control", function () {
        it("Should only allow exchanger to deposit", async function () {
            const { portfolioManager, user } = await loadFixture(deployPortfolioManagerFixture);
            
            await expect(portfolioManager.connect(user).deposit())
                .to.be.revertedWith("Caller doesn't have EXCHANGER role");
        });

        it("Should only allow exchanger to withdraw", async function () {
            const { portfolioManager, user, exchanger } = await loadFixture(deployPortfolioManagerFixture);
            
            await expect(portfolioManager.connect(user).withdraw(100))
                .to.be.revertedWith("Caller doesn't have EXCHANGER role");
        });
    });
}); 