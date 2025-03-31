import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("ExchangeChild", function () {
    async function deployExchangeChildFixture() {
        const [owner, user, payoutExecutor, unit] = await ethers.getSigners();

        // Deploy mock tokens and contracts
        const MockXusdToken = await ethers.getContractFactory("MockXusdToken");
        const xusdToken = await MockXusdToken.deploy("XUSD Token", "XUSD");

        const MockRoleManager = await ethers.getContractFactory("MockRoleManager");
        const roleManager = await MockRoleManager.deploy();

        // Setup roles
        await roleManager.grantRole(roleManager.UNIT_ROLE(), unit.address);

        // Deploy PayoutManager mock
        const MockPayoutManager = await ethers.getContractFactory("ArbitrumPayoutManager");
        const payoutManager = await MockPayoutManager.deploy();

        // Deploy ExchangeChild
        const ExchangeChild = await ethers.getContractFactory("ExchangeChild");
        const exchangeChild = await upgrades.deployProxy(ExchangeChild, [
            ethers.ZeroAddress
        ]);

        // Deploy mock RemoteHub
        const MockRemoteHub = await ethers.getContractFactory("MockRemoteHub");
        const remoteHub = await MockRemoteHub.deploy(
            await xusdToken.getAddress(),
            ethers.ZeroAddress,
            exchangeChild.target,
            await roleManager.getAddress()
        );

        await remoteHub.setPayoutManager(payoutManager.target);
        await exchangeChild.setRemoteHub(remoteHub.target);

        const UPGRADER_ROLE = await exchangeChild.UPGRADER_ROLE();
        const PAYOUT_EXECUTOR_ROLE = await exchangeChild.PAYOUT_EXECUTOR_ROLE();

        await exchangeChild.grantRole(PAYOUT_EXECUTOR_ROLE, payoutExecutor.address);

        // Constants
        const LIQ_DELTA_DM = 1000000; // 1e6

        return {
            exchangeChild,
            xusdToken,
            remoteHub,
            roleManager,
            payoutManager,
            owner,
            user,
            payoutExecutor,
            unit,
            UPGRADER_ROLE,
            PAYOUT_EXECUTOR_ROLE,
            LIQ_DELTA_DM
        };
    }

    describe("Initialization", function () {
        it("Should initialize with correct values", async function () {
            const { exchangeChild, remoteHub } = await loadFixture(deployExchangeChildFixture);
            
            expect(await exchangeChild.remoteHub()).to.equal(remoteHub.target);
            expect(await exchangeChild.newDelta()).to.equal(0);
            expect(await exchangeChild.payoutDeadline()).to.equal(0);
            expect(await exchangeChild.payoutDelta()).to.equal(0);
        });

        it("Should set correct roles", async function () {
            const { exchangeChild, owner, payoutExecutor, UPGRADER_ROLE, PAYOUT_EXECUTOR_ROLE } = 
                await loadFixture(deployExchangeChildFixture);
            
            expect(await exchangeChild.hasRole(await exchangeChild.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
            expect(await exchangeChild.hasRole(UPGRADER_ROLE, owner.address)).to.be.true;
            expect(await exchangeChild.hasRole(PAYOUT_EXECUTOR_ROLE, payoutExecutor.address)).to.be.true;
        });
    });

    describe("Admin Functions", function () {
        it("Should allow upgrader to set new remoteHub", async function () {
            const { exchangeChild, remoteHub, owner } = await loadFixture(deployExchangeChildFixture);
            
            await expect(exchangeChild.connect(owner).setRemoteHub(remoteHub.target))
                .to.emit(exchangeChild, "RemoteHubUpdated")
                .withArgs(remoteHub.target);
        });

        it("Should not allow non-upgrader to set remoteHub", async function () {
            const { exchangeChild, remoteHub, user } = await loadFixture(deployExchangeChildFixture);
            
            await expect(exchangeChild.connect(user).setRemoteHub(remoteHub.target))
                .to.be.revertedWith("Caller doesn't have UPGRADER_ROLE role");
        });

        it("Should allow upgrader to set payoutDelta", async function () {
            const { exchangeChild, owner } = await loadFixture(deployExchangeChildFixture);
            const newDelta = 3600; // 1 hour
            
            await expect(exchangeChild.connect(owner).setPayoutDelta(newDelta))
                .to.emit(exchangeChild, "PayoutDeltaUpdated")
                .withArgs(newDelta);
            
            expect(await exchangeChild.payoutDelta()).to.equal(newDelta);
        });
    });

    describe("Payout Functions", function () {
        describe("payout(uint256)", function () {
            it("Should allow payout executor to initiate payout", async function () {
                const { exchangeChild, payoutExecutor, LIQ_DELTA_DM } = 
                    await loadFixture(deployExchangeChildFixture);
                const newDelta = LIQ_DELTA_DM + 1000; // Greater than LIQ_DELTA_DM
                
                await expect(exchangeChild.connect(payoutExecutor)["payout(uint256)"](newDelta))
                    .to.emit(exchangeChild, "PayoutInfoStored")
                    .withArgs(newDelta, await time.latest() + 0 + 1); // payoutDelta is 0
            });

            it("Should not allow non-payout executor to initiate payout", async function () {
                const { exchangeChild, user, LIQ_DELTA_DM } = await loadFixture(deployExchangeChildFixture);
                const newDelta = LIQ_DELTA_DM + 1000;
                
                await expect(exchangeChild.connect(user)["payout(uint256)"](newDelta))
                    .to.be.revertedWith("Caller is not the payout executor");
            });

            it("Should revert if delta is too low", async function () {
                const { exchangeChild, payoutExecutor, LIQ_DELTA_DM } = 
                    await loadFixture(deployExchangeChildFixture);
                const newDelta = LIQ_DELTA_DM - 1; // Less than LIQ_DELTA_DM
                
                await expect(exchangeChild.connect(payoutExecutor)["payout(uint256)"](newDelta))
                    .to.be.revertedWith("Negative rebase");
            });
        });

        describe("payout()", function () {
            it("Should execute payout when conditions are met", async function () {
                const { exchangeChild, payoutExecutor, unit, LIQ_DELTA_DM } = 
                    await loadFixture(deployExchangeChildFixture);
                const newDelta = LIQ_DELTA_DM + 1000;

                await expect(exchangeChild.connect(payoutExecutor)["payout(uint256)"](newDelta))
                    .to.emit(exchangeChild, "PayoutShortEvent")
                    .withArgs(0, 0);
            });

            it("Should revert if new delta is not ready", async function () {
                const { exchangeChild, unit } = await loadFixture(deployExchangeChildFixture);
                
                await expect(exchangeChild.connect(unit)["payout()"]())
                    .to.be.revertedWith("new delta is not ready");
            });
        });
    });

    describe("Integration Tests", function () {
        it("Should handle complete payout flow", async function () {
            const { exchangeChild, payoutExecutor, unit, LIQ_DELTA_DM } = 
                await loadFixture(deployExchangeChildFixture);
            const newDelta = LIQ_DELTA_DM + 1000;

            // Set payout delta
            await exchangeChild.setPayoutDelta(3600);

            // Initiate payout
            await exchangeChild.connect(payoutExecutor)["payout(uint256)"](newDelta);
            expect(await exchangeChild.newDelta()).to.equal(newDelta);
            expect(await exchangeChild.payoutDeadline()).to.be.gt(await time.latest());

            // Execute payout
            await exchangeChild.connect(unit)["payout()"]();
            expect(await exchangeChild.newDelta()).to.equal(0);
        });

        it("Should handle immediate payout when delta is 0", async function () {
            const { exchangeChild, payoutExecutor, LIQ_DELTA_DM } = 
                await loadFixture(deployExchangeChildFixture);
            const newDelta = LIQ_DELTA_DM + 1000;

            // Payout should execute immediately when payoutDelta is 0
            await expect(exchangeChild.connect(payoutExecutor)["payout(uint256)"](newDelta))
                .to.emit(exchangeChild, "PayoutShortEvent")
                .withArgs(0, 0);

            expect(await exchangeChild.newDelta()).to.equal(0);
        });
    });
}); 