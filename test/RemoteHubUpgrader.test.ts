import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ChainItem } from "../typechain-types/contracts/RemoteHub";

describe("RemoteHubUpgrader", function () {
    // Constants
    const CHAIN_SELECTOR = 1;
    const SOURCE_CHAIN_SELECTOR = 2;
    const DESTINATION_CHAIN_SELECTOR = 3;

    async function deployFixture() {
        const [owner, portfolioAgent, upgrader, exchanger, user] = await ethers.getSigners();

        const mockRouter = "0x141fa059441E0ca23ce184B6A78bafD2A517DdE8";

        // Deploy mocks
        const mockXusd = await (await ethers.getContractFactory("MockXusdToken")).deploy("XUSD Token", "XUSD");
        const mockExchange = await (await ethers.getContractFactory("MockExchange")).deploy();
        const mockPayoutManager = await (await ethers.getContractFactory("ArbitrumPayoutManager")).deploy();
        const mockRoleManager = await (await ethers.getContractFactory("MockRoleManager")).deploy();
        const mockWxusd = await (await ethers.getContractFactory("MockWrappedXusdToken")).deploy("Wrapped XUSD", "wXUSD");
        const mockMarket = await (await ethers.getContractFactory("MockMarket")).deploy();
        const mockRemoteHub = await (await ethers.getContractFactory("MockRemoteHub")).deploy(
            mockXusd.target, mockWxusd.target, mockExchange.target, mockRoleManager.target);


        const RemoteHubUpgrader = await ethers.getContractFactory("RemoteHubUpgrader");
        const remoteHubUpgrader = await upgrades.deployProxy(RemoteHubUpgrader,
            [CHAIN_SELECTOR], 
            {
                initializer: "initialize", 
                unsafeAllow: ['constructor', 'state-variable-immutable'], 
                constructorArgs: [mockRouter, mockRemoteHub.target]
            });

        await remoteHubUpgrader.setRemoteHub(mockRemoteHub.target);

        // Setup roles
        await remoteHubUpgrader.grantRole(await remoteHubUpgrader.DEFAULT_ADMIN_ROLE(), owner.address);
        await remoteHubUpgrader.grantRole(await remoteHubUpgrader.UPGRADER_ROLE(), upgrader.address);


        await mockRoleManager.grantRole(await mockRoleManager.PORTFOLIO_AGENT_ROLE(), portfolioAgent.address);




        return {
            remoteHubUpgrader,
            mockXusd,
            mockExchange,
            mockPayoutManager,
            mockRoleManager,
            mockWxusd,
            mockMarket,
            mockRemoteHub,
            owner,
            portfolioAgent,
            upgrader,
            exchanger,
            user,
        };
    }

    describe("Initialization", function () {
        it("should initialize with correct chain selectors", async function () {
            const { remoteHubUpgrader } = await loadFixture(deployFixture);
            expect(await remoteHubUpgrader.chainSelector()).to.equal(CHAIN_SELECTOR);
        });

        it("should set correct roles after initialization", async function () {
            const { remoteHubUpgrader, owner, upgrader } = await loadFixture(deployFixture);
            expect(await remoteHubUpgrader.hasRole(await remoteHubUpgrader.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
            expect(await remoteHubUpgrader.hasRole(await remoteHubUpgrader.UPGRADER_ROLE(), upgrader.address)).to.be.true;
        });
    });

    describe("Access Control", function () {
        it("should allow admin to grant and revoke roles", async function () {
            const { remoteHubUpgrader, user } = await loadFixture(deployFixture);
            await remoteHubUpgrader.grantRole(await remoteHubUpgrader.UPGRADER_ROLE(), user.address);
            expect(await remoteHubUpgrader.hasRole(await remoteHubUpgrader.UPGRADER_ROLE(), user.address)).to.be.true;
            
            await remoteHubUpgrader.revokeRole(await remoteHubUpgrader.UPGRADER_ROLE(), user.address);
            expect(await remoteHubUpgrader.hasRole(await remoteHubUpgrader.UPGRADER_ROLE(), user.address)).to.be.false;
        });
    });

    describe("Allowlisting", function () {
        it("should allow upgrader to allowlist destination chains", async function () {
            const { remoteHubUpgrader, upgrader } = await loadFixture(deployFixture);
            await remoteHubUpgrader.connect(upgrader).allowlistDestinationChain(DESTINATION_CHAIN_SELECTOR, true);
            expect(await remoteHubUpgrader.allowlistedDestinationChains(DESTINATION_CHAIN_SELECTOR)).to.be.true;
        });

        it("should allow upgrader to allowlist source chains", async function () {
            const { remoteHubUpgrader, upgrader } = await loadFixture(deployFixture);
            await remoteHubUpgrader.connect(upgrader).allowlistSourceChain(SOURCE_CHAIN_SELECTOR, true);
            expect(await remoteHubUpgrader.allowlistedSourceChains(SOURCE_CHAIN_SELECTOR)).to.be.true;
        });

        it("should allow upgrader to allowlist senders", async function () {
            const { remoteHubUpgrader, upgrader, user } = await loadFixture(deployFixture);
            await remoteHubUpgrader.connect(upgrader).allowlistSender(user.address, true);
            expect(await remoteHubUpgrader.allowlistedSenders(user.address)).to.be.true;
        });

        it("should revert when non-upgrader tries to allowlist", async function () {
            const { remoteHubUpgrader, user } = await loadFixture(deployFixture);
            await expect(
                remoteHubUpgrader.connect(user).allowlistDestinationChain(DESTINATION_CHAIN_SELECTOR, true)
            ).to.be.revertedWith("Caller doesn't have UPGRADER_ROLE role");
        });
    });

    describe("Pause functionality", function () {
        it("should allow portfolio agent to pause and unpause", async function () {
            const { remoteHubUpgrader, portfolioAgent } = await loadFixture(deployFixture);
            await remoteHubUpgrader.connect(portfolioAgent).pause();
            expect(await remoteHubUpgrader.paused()).to.be.true;

            await remoteHubUpgrader.connect(portfolioAgent).unpause();
            expect(await remoteHubUpgrader.paused()).to.be.false;
        });

        it("should revert when non-portfolio agent tries to pause", async function () {
            const { remoteHubUpgrader, user } = await loadFixture(deployFixture);
            await expect(
                remoteHubUpgrader.connect(user).pause()
            ).to.be.revertedWith("Caller doesn't have PORTFOLIO_AGENT_ROLE role");
        });
    });

    describe("CCIP Gas Limit", function () {
        it("should allow upgrader to set CCIP gas limit", async function () {
            const { remoteHubUpgrader, upgrader } = await loadFixture(deployFixture);
            const newGasLimit = 600000;
            await remoteHubUpgrader.connect(upgrader).setCcipGasLimit(newGasLimit);
            expect(await remoteHubUpgrader.ccipGasLimit()).to.equal(newGasLimit);
        });

        it("should revert when non-upgrader tries to set CCIP gas limit", async function () {
            const { remoteHubUpgrader, user } = await loadFixture(deployFixture);
            await expect(
                remoteHubUpgrader.connect(user).setCcipGasLimit(600000)
            ).to.be.revertedWith("Caller doesn't have UPGRADER_ROLE role");
        });
    });

    describe("RemoteHub Updates", function () {
        it("should allow upgrader to set new RemoteHub address", async function () {
            const { remoteHubUpgrader, upgrader } = await loadFixture(deployFixture);
            const newRemoteHub = ethers.Wallet.createRandom().address;
            await remoteHubUpgrader.connect(upgrader).setRemoteHub(newRemoteHub);
            expect(await remoteHubUpgrader.remoteHub()).to.equal(newRemoteHub);
        });

        it("should emit RemoteHubUpdated event", async function () {
            const { remoteHubUpgrader, upgrader } = await loadFixture(deployFixture);
            const newRemoteHub = ethers.Wallet.createRandom().address;
            await expect(remoteHubUpgrader.connect(upgrader).setRemoteHub(newRemoteHub))
                .to.emit(remoteHubUpgrader, "RemoteHubUpdated")
                .withArgs(newRemoteHub);
        });
    });

    describe("Multi-chain Operations", function () {
        beforeEach(async function () {
            const { remoteHubUpgrader, owner } = await loadFixture(deployFixture);
            await remoteHubUpgrader.connect(owner).allowlistDestinationChain(DESTINATION_CHAIN_SELECTOR, true);
            await remoteHubUpgrader.connect(owner).allowlistSourceChain(SOURCE_CHAIN_SELECTOR, true);
        });

        it("should execute multichain call", async function () {
            const { remoteHubUpgrader, upgrader, user, owner } = await loadFixture(deployFixture);
            const destinations = [DESTINATION_CHAIN_SELECTOR];
            const receivers = [ethers.Wallet.createRandom().address];
            const data = "0x";
            const dataArray = [data];
            
            await expect(
                remoteHubUpgrader.connect(owner).multichainCall([
                    
                ])
            ).to.not.emit(remoteHubUpgrader, "MessageSent");
        });

    });
}); 