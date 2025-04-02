import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ChainItem } from "../typechain-types/contracts/RemoteHub";

describe("RemoteHub", function () {
    // Constants
    const CHAIN_SELECTOR = "4949039107694359620";
    const SOURCE_CHAIN_SELECTOR = "4949039107694359620";
    const DESTINATION_CHAIN_SELECTOR = "3734403246176062136";

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
        const mockRemoteHubUpgrader = await (await ethers.getContractFactory("MockRemoteHubUpgrader")).deploy();


        const RemoteHub = await ethers.getContractFactory("RemoteHub");
        const remoteHub = await upgrades.deployProxy(RemoteHub,
            [CHAIN_SELECTOR, SOURCE_CHAIN_SELECTOR], 
            {
                initializer: "initialize", 
                unsafeAllow: ['constructor', 'state-variable-immutable'], 
                constructorArgs: [mockRouter]
            });

        // Setup roles
        await remoteHub.grantRole(await remoteHub.DEFAULT_ADMIN_ROLE(), owner.address);
        await remoteHub.grantRole(await remoteHub.UPGRADER_ROLE(), upgrader.address);


        await mockRoleManager.grantRole(await mockRoleManager.PORTFOLIO_AGENT_ROLE(), portfolioAgent.address);
        

        const chainItem: ChainItem = {
            chainSelector: CHAIN_SELECTOR,
            ccipPool: "0x0000000000000000000000000000000000000000",
            xusd: mockXusd.target,
            exchange: exchanger.address,
            payoutManager: mockPayoutManager.target,
            roleManager: mockRoleManager.target,
            remoteHub: remoteHub.target,
            remoteHubUpgrader: mockRemoteHubUpgrader.target,
            wxusd: mockWxusd.target,
            market: mockMarket.target
        };

        await remoteHub.connect(upgrader).addChainItem(chainItem);

        return {
            remoteHub,
            mockXusd,
            mockExchange,
            mockPayoutManager,
            mockRoleManager,
            mockWxusd,
            mockMarket,
            mockRemoteHubUpgrader,
            owner,
            portfolioAgent,
            upgrader,
            exchanger,
            user,
            chainItem
        };
    }

    describe("Initialization", function () {
        it("should initialize with correct chain selectors", async function () {
            const { remoteHub } = await loadFixture(deployFixture);
            expect(await remoteHub.chainSelector()).to.equal(CHAIN_SELECTOR);
            expect(await remoteHub.sourceChainSelector()).to.equal(SOURCE_CHAIN_SELECTOR);
        });

        it("should set correct roles after initialization", async function () {
            const { remoteHub, owner, upgrader } = await loadFixture(deployFixture);
            expect(await remoteHub.hasRole(await remoteHub.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
            expect(await remoteHub.hasRole(await remoteHub.UPGRADER_ROLE(), upgrader.address)).to.be.true;
        });
    });

    describe("Chain Item Management", function () {
        it("should add chain item correctly", async function () {
            const { remoteHub, upgrader, chainItem } = await loadFixture(deployFixture);
            await remoteHub.connect(upgrader).addChainItem(chainItem);
            const addedItem = await remoteHub.chainItemById(CHAIN_SELECTOR);
            expect(addedItem.chainSelector).to.equal(chainItem.chainSelector);
            expect(addedItem.xusd).to.equal(chainItem.xusd);
        });

        it("should update existing chain item", async function () {
            const { remoteHub, upgrader, chainItem, user } = await loadFixture(deployFixture);
            await remoteHub.connect(upgrader).addChainItem(chainItem);

            const updatedItem: ChainItem = {
                ...chainItem,
                xusd: user.address
            };

            await remoteHub.connect(upgrader).addChainItem(updatedItem);
            const item = await remoteHub.chainItemById(CHAIN_SELECTOR);
            expect(item.xusd).to.equal(user.address);
        });

        it("should remove chain item correctly", async function () {
            const { remoteHub, upgrader, chainItem, mockXusd } = await loadFixture(deployFixture);
            await remoteHub.connect(upgrader).addChainItem(chainItem);
            
            await remoteHub.connect(upgrader).removeChainItem(CHAIN_SELECTOR);
            
            const removedItem = await remoteHub.chainItemById(CHAIN_SELECTOR);
            expect(removedItem.chainSelector).to.equal("4949039107694359620");
            expect(removedItem.xusd).to.equal(mockXusd.target);
        });
    });

    describe("Chain Allowlist Management", function () {
        it("should allowlist destination chain", async function () {
            const { remoteHub, owner } = await loadFixture(deployFixture);
            await remoteHub.connect(owner).allowlistDestinationChain(DESTINATION_CHAIN_SELECTOR, true);
            expect(await remoteHub.allowlistedDestinationChains(DESTINATION_CHAIN_SELECTOR)).to.be.true;
        });

        it("should allowlist source chain", async function () {
            const { remoteHub, owner } = await loadFixture(deployFixture);
            await remoteHub.connect(owner).allowlistSourceChain(SOURCE_CHAIN_SELECTOR, true);
            expect(await remoteHub.allowlistedSourceChains(SOURCE_CHAIN_SELECTOR)).to.be.true;
        });

        it("should allowlist sender", async function () {
            const { remoteHub, owner, user } = await loadFixture(deployFixture);
            await remoteHub.connect(owner).allowlistSender(user.address, true);
            expect(await remoteHub.allowlistedSenders(user.address)).to.be.true;
        });
    });

    describe("Pause/Unpause", function () {
        it("should pause contract when called by portfolio agent", async function () {
            const { remoteHub, portfolioAgent } = await loadFixture(deployFixture);
            await remoteHub.connect(portfolioAgent).pause();
            expect(await remoteHub.paused()).to.be.true;
        });

        it("should unpause contract when called by portfolio agent", async function () {
            const { remoteHub, portfolioAgent } = await loadFixture(deployFixture);
            await remoteHub.connect(portfolioAgent).pause();
            await remoteHub.connect(portfolioAgent).unpause();
            expect(await remoteHub.paused()).to.be.false;
        });

        it("should revert when non-portfolio agent tries to pause", async function () {
            const { remoteHub, user } = await loadFixture(deployFixture);
            await expect(remoteHub.connect(user).pause()).to.be.revertedWith(
                "Caller doesn't have PORTFOLIO_AGENT_ROLE role"
            );
        });
    });


    describe("Getter Functions", function () {
        beforeEach(async function () {
            const { remoteHub, upgrader, chainItem } = await loadFixture(deployFixture);
            await remoteHub.connect(upgrader).addChainItem(chainItem);
        });

        it("should return correct addresses for getter functions", async function () {
            const { exchanger, remoteHub, mockXusd, mockPayoutManager, mockRoleManager, mockWxusd, mockMarket, upgrader, chainItem } = await loadFixture(deployFixture);
            await remoteHub.connect(upgrader).addChainItem(chainItem);
            expect(await remoteHub.xusd()).to.equal(mockXusd.target);
            expect(await remoteHub.exchange()).to.equal(exchanger.address);
            expect(await remoteHub.payoutManager()).to.equal(mockPayoutManager.target);
            expect(await remoteHub.roleManager()).to.equal(mockRoleManager.target);
            expect(await remoteHub.wxusd()).to.equal(mockWxusd.target);
            expect(await remoteHub.market()).to.equal(mockMarket.target);
        });
    });

    describe("CCIP Gas Limit", function () {
        it("should set ccip gas limit correctly", async function () {
            const { remoteHub, owner } = await loadFixture(deployFixture);
            const newGasLimit = 300000;
            
            await remoteHub.connect(owner).setCcipGasLimit(newGasLimit);
            
            expect(await remoteHub.ccipGasLimit()).to.equal(newGasLimit);
        });

        it("should revert when non-admin tries to set gas limit", async function () {
            const { remoteHub, user } = await loadFixture(deployFixture);
            const newGasLimit = 300000;
            
            await expect(
                remoteHub.connect(user).setCcipGasLimit(newGasLimit)
            ).to.be.reverted;
        });
    });

    describe("Withdrawals", function () {
        it("should withdraw native tokens", async function () {
            const { remoteHub, owner, user } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("1.0");
            
            // Send ETH to contract first
            await owner.sendTransaction({
                to: remoteHub.target,
                value: amount
            });

            const initialBalance = await ethers.provider.getBalance(owner.address);
            await remoteHub.connect(owner).withdraw(user.address);
            const finalBalance = await ethers.provider.getBalance(owner.address);
            expect(initialBalance - finalBalance).to.be.gt(0);
        });

        it("should withdraw specific tokens", async function () {
            const { remoteHub, owner, user, mockXusd } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("100");

            // Send tokens to contract first
            await mockXusd.mint(remoteHub.target, amount);
            
            await remoteHub.connect(owner).withdrawToken(user.address, mockXusd.target);
            
            expect(await mockXusd.balanceOf(user.address)).to.equal(amount);
        });

        it("should revert withdrawals for non-admin", async function () {
            const { remoteHub, user, mockXusd } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("1.0");

            await expect(
                remoteHub.connect(user).withdraw(user.address)
            ).to.be.reverted;

            await expect(
                remoteHub.connect(user).withdrawToken(user.address, mockXusd.target)
            ).to.be.reverted;
        });
    });

    describe("Multi-chain Operations", function () {
        beforeEach(async function () {
            const { remoteHub, owner } = await loadFixture(deployFixture);
        });

        it("should execute multichain call", async function () {
            const { remoteHub, upgrader, user, owner } = await loadFixture(deployFixture);

            await remoteHub.connect(owner).allowlistDestinationChain(DESTINATION_CHAIN_SELECTOR, true);
            await remoteHub.connect(owner).allowlistSourceChain(SOURCE_CHAIN_SELECTOR, true);

            function encodeWithSignature(signature: string, params: any[]): string {
                const funcName = signature.split('(')[0];
                const ifaceERC20 = new ethers.Interface(["function " + signature])
                let tokenApproveCall = ifaceERC20.encodeFunctionData(funcName, params)
                return tokenApproveCall;
            }

            const signature = 'setToken(address)';
            const params1 = ['0xda10009cbd5d07dd0cecc66161fc93d7c9000da1'];
            const params2 = ['0xda10009cbd5d07dd0cecc66161fc93d7c9000da2'];
            const encoded1 = encodeWithSignature(signature, params1);
            const encoded2 = encodeWithSignature(signature, params2);
        
            let multichainCallItems = [{
                chainSelector: DESTINATION_CHAIN_SELECTOR,
                receiver: ethers.Wallet.createRandom().address,
                token: "0x0000000000000000000000000000000000000000",
                amount: 0,
                batchData: [{
                    executor: ethers.Wallet.createRandom().address,
                    data: encoded1
                }]
            }];

            console.log(multichainCallItems, encoded1);
            console.log(multichainCallItems[0].batchData[0].executor);
            console.log(remoteHub.target);
            console.log(owner.address);
            
            await remoteHub.connect(owner).multichainCall(multichainCallItems, {value: ethers.parseEther("0.001")});
        });

        it("should execute multichain call locally", async function () {
            const { remoteHub, upgrader, user, owner } = await loadFixture(deployFixture);

            await remoteHub.connect(owner).allowlistDestinationChain(DESTINATION_CHAIN_SELECTOR, true);
            await remoteHub.connect(owner).allowlistSourceChain(SOURCE_CHAIN_SELECTOR, true);

            function encodeWithSignature(signature: string, params: any[]): string {
                const funcName = signature.split('(')[0];
                const ifaceERC20 = new ethers.Interface(["function " + signature])
                let tokenApproveCall = ifaceERC20.encodeFunctionData(funcName, params)
                return tokenApproveCall;
            }

            const signature = 'setToken(address)';
            const params1 = ['0xda10009cbd5d07dd0cecc66161fc93d7c9000da1'];
            const params2 = ['0xda10009cbd5d07dd0cecc66161fc93d7c9000da2'];
            const encoded1 = encodeWithSignature(signature, params1);
            const encoded2 = encodeWithSignature(signature, params2);
        
            let multichainCallItems = [{
                chainSelector: SOURCE_CHAIN_SELECTOR,
                receiver: remoteHub.target,
                token: "0x0000000000000000000000000000000000000000",
                amount: 0,
                batchData: [{
                    executor: ethers.Wallet.createRandom().address,
                    data: encoded1
                }]
            }];

            console.log(multichainCallItems, encoded1);
            console.log(multichainCallItems[0].batchData[0].executor);
            console.log(remoteHub.target);
            console.log(owner.address);
            
            await remoteHub.connect(owner).multichainCall(multichainCallItems, {value: ethers.parseEther("0.001")});
        });


        it("should execute multi payout", async function () {
            const { remoteHub, exchanger, mockXusd } = await loadFixture(deployFixture);
            
            // Mint tokens to contract for payout
            await mockXusd.mint(remoteHub.target, ethers.parseEther("10.0"));

            await expect(
                remoteHub.connect(exchanger).execMultiPayout(100)                
            ).to.not.be.reverted;
        });

    });

    describe("Cross Transfer", function () {

        it("should revert if destination chain is not allowlisted", async function () {
            const { remoteHub, mockXusd, user } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("100");
            
            await mockXusd.mint(user.address, amount);
            await mockXusd.connect(user).approve(remoteHub.target, amount);
            
            await expect(
                remoteHub.connect(user).crossTransfer(
                    user.address,
                    amount,
                    DESTINATION_CHAIN_SELECTOR
                )
            ).to.be.revertedWithCustomError(
                remoteHub,
                "DestinationChainNotAllowlisted"
            ).withArgs(DESTINATION_CHAIN_SELECTOR);
        });

        it("should revert when contract is paused", async function () {
            const { remoteHub, mockXusd, user, portfolioAgent, owner } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("100");
            
            await remoteHub.connect(owner).allowlistDestinationChain(DESTINATION_CHAIN_SELECTOR, true);
            await mockXusd.mint(user.address, amount);
            await mockXusd.connect(user).approve(remoteHub.target, amount);
            
            // Pause the contract
            await remoteHub.connect(portfolioAgent).pause();
            
            await expect(
                remoteHub.connect(user).crossTransfer(
                    user.address,
                    amount,
                    DESTINATION_CHAIN_SELECTOR
                )
            ).to.be.revertedWith("Pausable: paused");
        });

        it("should revert if user has insufficient XUSD balance", async function () {
            const { remoteHub, mockXusd, user, owner } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("100");
            
            await remoteHub.connect(owner).allowlistDestinationChain(DESTINATION_CHAIN_SELECTOR, true);
            // Don't mint any tokens to user
            await mockXusd.connect(user).approve(remoteHub.target, amount);
            
            await expect(
                remoteHub.connect(user).crossTransfer(
                    user.address,
                    amount,
                    DESTINATION_CHAIN_SELECTOR
                )
            ).to.be.reverted; // ERC20: transfer amount exceeds balance
        });

        it("should revert if user hasn't approved XUSD transfer", async function () {
            const { remoteHub, mockXusd, user, owner } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("100");
            
            await remoteHub.connect(owner).allowlistDestinationChain(DESTINATION_CHAIN_SELECTOR, true);
            await mockXusd.mint(user.address, amount);
            // Don't approve tokens
            
            await expect(
                remoteHub.connect(user).crossTransfer(
                    user.address,
                    amount,
                    DESTINATION_CHAIN_SELECTOR
                )
            ).to.be.reverted; // ERC20: insufficient allowance
        });

    });
}); 