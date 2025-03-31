import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("XusdToken", function () {
    async function deployXusdTokenFixture() {
        const [owner, user, portfolioAgent, exchanger, rebaseManager] = await ethers.getSigners();

        // Deploy mock contracts
        const MockRoleManager = await ethers.getContractFactory("MockRoleManager");
        const roleManager = await MockRoleManager.deploy();

        const MockExchange = await ethers.getContractFactory("MockExchange");
        const exchange = await MockExchange.deploy();

        const MockPayoutManager = await ethers.getContractFactory("ArbitrumPayoutManager");
        const payoutManager = await MockPayoutManager.deploy();

        const MockWrappedXusdToken = await ethers.getContractFactory("MockWrappedXusdToken");
        const wxusd = await MockWrappedXusdToken.deploy("Wrapped XUSD", "wXUSD");

        // Deploy mock asset
        const MockToken = await ethers.getContractFactory("MockERC20");
        const asset = await MockToken.deploy("Mock USDC", "USDC");

        // Deploy RemoteHub


        // Setup roles
        await roleManager.grantRole(roleManager.PORTFOLIO_AGENT_ROLE(), portfolioAgent.address);
        await roleManager.grantRole(roleManager.EXCHANGER(), exchanger.address);
        // await roleManager.grantRole(roleManager.REBASE_MANAGER(), rebaseManager.address);

        // Deploy XusdToken
        const XusdToken = await ethers.getContractFactory("XusdToken");
        const xusdToken = await upgrades.deployProxy(XusdToken, [
            "XUSD Token",
            "XUSD",
            18,
            "0x0000000000000000000000000000000000000000"
        ]);

        const MockRemoteHub = await ethers.getContractFactory("MockRemoteHub");
        const remoteHub = await MockRemoteHub.deploy(
            await xusdToken.getAddress(),
            await wxusd.getAddress(),
            await exchanger,
            await roleManager.getAddress()
        );

        await xusdToken.grantRole(roleManager.UPGRADER_ROLE(), portfolioAgent.address);
        await xusdToken.grantRole(roleManager.EXCHANGER(), portfolioAgent.address);

        await xusdToken.connect(portfolioAgent).setRemoteHub(remoteHub.target);

        return {
            xusdToken,
            asset,
            roleManager,
            exchange,
            payoutManager,
            wxusd,
            remoteHub,
            owner,
            user,
            portfolioAgent,
            exchanger,
            rebaseManager
        };
    }

    describe("Initialization", function () {
        it("Should initialize with correct values", async function () {
            const { xusdToken, remoteHub } = await loadFixture(deployXusdTokenFixture);
            
            expect(await xusdToken.name()).to.equal("XUSD Token");
            expect(await xusdToken.symbol()).to.equal("XUSD");
            expect(await xusdToken.decimals()).to.equal(18);
            expect(await xusdToken.remoteHub()).to.equal(remoteHub.target);
        });
    });

    describe("Rebase Operations", function () {
        beforeEach(async function () {
            const { xusdToken, asset, user, portfolioAgent, exchanger } = await loadFixture(deployXusdTokenFixture);
            await asset.mint(exchanger.address, ethers.parseUnits("1000", 6));
            await asset.connect(exchanger).approve(xusdToken.target, ethers.MaxUint256);
            await xusdToken.connect(exchanger).mint(exchanger.address, ethers.parseUnits("100", 6));
        });

        it("Should rebase correctly", async function () {
            const { xusdToken, rebaseManager, user, exchanger } = await loadFixture(deployXusdTokenFixture);

            await xusdToken.connect(exchanger).mint(exchanger.address, ethers.parseUnits("100", 6));

            const rebaseAmount = ethers.parseUnits("2000", 6);

            const beforeRebaseCredits = await xusdToken.rebasingCredits();
            const beforeRebaseCreditsPerToken = await xusdToken.rebasingCreditsPerToken();
            const beforeUserBalance = await xusdToken.balanceOf(exchanger.address);

            await expect(xusdToken.connect(exchanger).changeSupply(rebaseAmount))
                .to.emit(xusdToken, "TotalSupplyUpdatedHighres");

            const afterRebaseCredits = await xusdToken.rebasingCredits();
            const afterRebaseCreditsPerToken = await xusdToken.rebasingCreditsPerToken();
            const afterUserBalance = await xusdToken.balanceOf(exchanger.address);

            expect(afterRebaseCredits).to.be.equal(beforeRebaseCredits);
            expect(afterRebaseCreditsPerToken).to.be.lt(beforeRebaseCreditsPerToken);
            expect(afterUserBalance).to.be.gt(beforeUserBalance);
        });

        it("Should only allow rebase manager to rebase", async function () {
            const { xusdToken, user } = await loadFixture(deployXusdTokenFixture);
            await expect(xusdToken.connect(user).changeSupply(100))
                .to.be.revertedWith("Caller is not the EXCHANGER");
        });

    });

    describe("Access Control", function () {
        it("Should respect role-based permissions", async function () {
            const { xusdToken, user } = await loadFixture(deployXusdTokenFixture);
            
            await expect(xusdToken.connect(user).pause())
                .to.be.revertedWith("Caller doesn't have PORTFOLIO_AGENT_ROLE role");
        });
    });

    describe("Pausable", function () {
        it("Should handle pause/unpause correctly", async function () {
            const { xusdToken, portfolioAgent, user, exchanger } = await loadFixture(deployXusdTokenFixture);
            
            await xusdToken.connect(portfolioAgent).pause();
            expect(await xusdToken.paused()).to.be.true;
            
            await expect(xusdToken.connect(exchanger).mint(exchanger.address, ethers.parseUnits("100", 6)))
                .to.be.revertedWith("pause");

            await xusdToken.connect(portfolioAgent).unpause();
            expect(await xusdToken.paused()).to.be.false;
        });
    });

    describe("Upgradeability", function () {
        it("Should be upgradeable", async function () {
            const { xusdToken } = await loadFixture(deployXusdTokenFixture);
            
            const XusdTokenV2 = await ethers.getContractFactory("XusdToken");
            await expect(upgrades.upgradeProxy(xusdToken.target, XusdTokenV2))
                .to.not.be.reverted;
        });
    });

    describe("Allowance Management", function () {
        it("Should handle approve correctly", async function () {
            const { xusdToken, user, exchanger } = await loadFixture(deployXusdTokenFixture);
            const amount = ethers.parseUnits("100", 6);

            await expect(xusdToken.connect(user).approve(exchanger.address, amount))
                .to.emit(xusdToken, "Approval")
                .withArgs(user.address, exchanger.address, "100000000000000000");

            expect(await xusdToken.allowance(user.address, exchanger.address)).to.equal("100000000");
        });

        it("Should handle increaseAllowance correctly", async function () {
            const { xusdToken, user, exchanger } = await loadFixture(deployXusdTokenFixture);
            const initialAmount = ethers.parseUnits("100", 6);
            const increaseAmount = ethers.parseUnits("50", 6);

            await xusdToken.connect(user).approve(exchanger.address, initialAmount);
            
            await expect(xusdToken.connect(user).increaseAllowance(exchanger.address, increaseAmount))
                .to.emit(xusdToken, "Approval")
                .withArgs(user.address, exchanger.address, "150000000000000000");

            expect(await xusdToken.allowance(user.address, exchanger.address))
                .to.equal(initialAmount + increaseAmount);
        });

        it("Should handle decreaseAllowance correctly", async function () {
            const { xusdToken, user, exchanger } = await loadFixture(deployXusdTokenFixture);
            const initialAmount = ethers.parseUnits("100", 6);
            const decreaseAmount = ethers.parseUnits("30", 6);

            await xusdToken.connect(user).approve(exchanger.address, initialAmount);
            
            await expect(xusdToken.connect(user).decreaseAllowance(exchanger.address, decreaseAmount))
                .to.emit(xusdToken, "Approval")
                .withArgs(user.address, exchanger.address, "70000000000000000");

            expect(await xusdToken.allowance(user.address, exchanger.address))
                .to.equal(initialAmount - decreaseAmount);
        });

        it("Should not allow decreaseAllowance below zero", async function () {
            const { xusdToken, user, exchanger } = await loadFixture(deployXusdTokenFixture);
            const initialAmount = ethers.parseUnits("100", 6);
            const decreaseAmount = ethers.parseUnits("150", 20);

            await xusdToken.connect(user).approve(exchanger.address, initialAmount);
            
            await expect(xusdToken.connect(user).decreaseAllowance(exchanger.address, decreaseAmount))
                .to.not.be.reverted;
        });
    });

    describe("Credit Management", function () {
        beforeEach(async function () {
            const { xusdToken, exchanger } = await loadFixture(deployXusdTokenFixture);
            await xusdToken.connect(exchanger).mint(exchanger.address, ethers.parseUnits("100", 18));
        });

        it("Should convert credits to assets correctly", async function () {
            const { xusdToken, exchanger } = await loadFixture(deployXusdTokenFixture);
            const amount = ethers.parseUnits("50", 6);
            
            const credits = await xusdToken.creditToAsset(exchanger.address, amount);
            expect(credits).to.be.gte(0);
        });

        it("Should convert assets to credits correctly", async function () {
            const { xusdToken, exchanger } = await loadFixture(deployXusdTokenFixture);
            const amount = ethers.parseUnits("50", 6);
            
            const assets = await xusdToken.assetToCredit(exchanger.address, amount);
            expect(assets).to.be.gte(0);
        });

        it("Should handle subCredits correctly", async function () {
            const { xusdToken, exchanger } = await loadFixture(deployXusdTokenFixture);
            const amount = ethers.parseUnits("50", 6);
            
            const beforeCredits = await xusdToken.rebasingCredits();
            await xusdToken.connect(exchanger).subCredits(exchanger.address, amount, amount, "ErrorInSubCredits");
            const afterCredits = await xusdToken.rebasingCredits();
            
            expect(afterCredits).to.be.lte(beforeCredits);
        });

    });

    describe("Transfer Operations", function () {
        beforeEach(async function () {
            const { xusdToken, exchanger, user } = await loadFixture(deployXusdTokenFixture);
            await xusdToken.connect(exchanger).mint(exchanger.address, ethers.parseUnits("100", 6));
            await xusdToken.connect(exchanger).transfer(user.address, ethers.parseUnits("50", 6));
        });

        it("Should handle transfer correctly", async function () {
            const { xusdToken, user, exchanger } = await loadFixture(deployXusdTokenFixture);
            const amount = ethers.parseUnits("20", 6);
            
            await xusdToken.connect(exchanger).mint(exchanger.address, ethers.parseUnits("100", 6));
            await xusdToken.connect(exchanger).transfer(user.address, ethers.parseUnits("50", 6));

            const beforeBalance = await xusdToken.balanceOf(user.address);
            console.log("beforeBalance", beforeBalance);
            await xusdToken.connect(user).transfer(exchanger.address, amount);
            const afterBalance = await xusdToken.balanceOf(user.address);
            
            expect(afterBalance).to.equal(beforeBalance - amount);
            expect(await xusdToken.balanceOf(exchanger.address)).to.equal("70000000");
        });

        it("Should handle transferFrom correctly", async function () {
            const { xusdToken, user, exchanger } = await loadFixture(deployXusdTokenFixture);
            const amount = ethers.parseUnits("20", 6);

            await xusdToken.connect(exchanger).mint(exchanger.address, ethers.parseUnits("100", 6));
            await xusdToken.connect(exchanger).transfer(user.address, ethers.parseUnits("50", 6));
            
            await xusdToken.connect(user).approve(exchanger.address, amount);
            
            const beforeBalance = await xusdToken.balanceOf(user.address);
            await xusdToken.connect(exchanger).transferFrom(user.address, exchanger.address, amount);
            const afterBalance = await xusdToken.balanceOf(user.address);
            
            expect(afterBalance).to.equal(beforeBalance - amount);
            expect(await xusdToken.balanceOf(exchanger.address)).to.equal("70000000");
            expect(await xusdToken.allowance(user.address, exchanger.address)).to.equal(0);
        });

        it("Should not allow transfer when paused", async function () {
            const { xusdToken, user, exchanger, portfolioAgent } = await loadFixture(deployXusdTokenFixture);
            const amount = ethers.parseUnits("20", 6);
            
            await xusdToken.connect(portfolioAgent).pause();
            
            await expect(xusdToken.connect(user).transfer(exchanger.address, amount))
                .to.be.revertedWith("pause");
        });
    });
}); 