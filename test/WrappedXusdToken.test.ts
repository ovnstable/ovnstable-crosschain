import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
    WrappedXusdToken,
    MockRemoteHub,
    MockXusdToken,
    MockRoleManager,
    WadRayMath
} from "../typechain";

describe("WrappedXusdToken", function () {
    async function deployWrappedXusdFixture() {
        const [owner, user, portfolioAgent, ccipPool] = await ethers.getSigners();

        // Deploy mock tokens and contracts
        const MockXusdToken = await ethers.getContractFactory("MockXusdToken");
        const xusdToken = await MockXusdToken.deploy("XUSD Token", "XUSD");

        const MockRoleManager = await ethers.getContractFactory("MockRoleManager");
        const roleManager = await MockRoleManager.deploy();
        await roleManager.grantRole(roleManager.UNIT_ROLE(), user.address);
        await roleManager.grantRole(roleManager.EXCHANGER(), owner.address);
        // await roleManager.grantRole(roleManager.PORTFOLIO_AGENT_ROLE(), user.address);
        // await roleManager.grantRole(roleManager.PORTFOLIO_AGENT_ROLE(), owner.address);
        await roleManager.grantRole(roleManager.PORTFOLIO_AGENT_ROLE(), portfolioAgent.address);
        console.log("user.address", user.address);
        console.log("owner.address", owner.address);

        const MockExchange = await ethers.getContractFactory("MockExchange");
        const exchange = await MockExchange.deploy();

        // Deploy WrappedXusdToken
        const WrappedXusdToken = await ethers.getContractFactory("WrappedXusdToken");
        const wrappedXusd = await upgrades.deployProxy(WrappedXusdToken, [
            "Wrapped XUSD",
            "wXUSD",
            18,
            "0x0000000000000000000000000000000000000000"
        ]);
        await wrappedXusd.grantRole(wrappedXusd.UPGRADER_ROLE(), owner.address);
        // await wrappedXusd.grantRole(wrappedXusd.UPGRADER_ROLE(), user.address);


        // Deploy mock RemoteHub
        const MockRemoteHub = await ethers.getContractFactory("MockRemoteHub");
        const remoteHub = await MockRemoteHub.deploy(
            await xusdToken.getAddress(),
            await wrappedXusd.getAddress(),
            await exchange.getAddress(),
            await roleManager.getAddress()
        );
        await remoteHub.setCCIPPool(ccipPool.address);
        await wrappedXusd.setRemoteHub(remoteHub.target);

        // Setup roles and connections
        const PORTFOLIO_AGENT_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PORTFOLIO_AGENT_ROLE"));

        // Mint some XUSD to users for testing
        await xusdToken.mint(user.address, ethers.parseEther("1000"));
        await xusdToken.mint(ccipPool.address, ethers.parseEther("1000"));

        return {
            wrappedXusd,
            xusdToken,
            remoteHub,
            roleManager,
            owner,
            user,
            portfolioAgent,
            ccipPool,
            PORTFOLIO_AGENT_ROLE
        };
    }

    describe("Initialization", function () {
        it("Should initialize with correct values", async function () {
            const { wrappedXusd, remoteHub } = await loadFixture(deployWrappedXusdFixture);
            
            expect(await wrappedXusd.name()).to.equal("Wrapped XUSD");
            expect(await wrappedXusd.symbol()).to.equal("wXUSD");
            expect(await wrappedXusd.decimals()).to.equal(18);
            expect(await wrappedXusd.paused()).to.equal(false);
        });

        it("Should set correct roles", async function () {
            const { wrappedXusd, owner } = await loadFixture(deployWrappedXusdFixture);
            
            expect(await wrappedXusd.hasRole(await wrappedXusd.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
            expect(await wrappedXusd.hasRole(await wrappedXusd.UPGRADER_ROLE(), owner.address)).to.be.true;
        });
    });

    describe("Access Control", function () {
        it("Should allow portfolio agent to pause", async function () {
            const { wrappedXusd, portfolioAgent } = await loadFixture(deployWrappedXusdFixture);
            
            await wrappedXusd.connect(portfolioAgent).pause();
            expect(await wrappedXusd.paused()).to.be.true;
        });

        it("Should allow portfolio agent to unpause", async function () {
            const { wrappedXusd, portfolioAgent } = await loadFixture(deployWrappedXusdFixture);
            
            await wrappedXusd.connect(portfolioAgent).pause();
            await wrappedXusd.connect(portfolioAgent).unpause();
            expect(await wrappedXusd.paused()).to.be.false;
        });

        it("Should not allow non-portfolio agent to pause", async function () {
            const { wrappedXusd, user } = await loadFixture(deployWrappedXusdFixture);
            
            await expect(wrappedXusd.connect(user).pause())
                .to.be.revertedWith("Caller doesn't have PORTFOLIO_AGENT_ROLE role");
        });
    });

    describe("ERC4626 Operations", function () {
        describe("Deposit", function () {
            it("Should deposit assets correctly", async function () {
                const { wrappedXusd, xusdToken, user } = await loadFixture(deployWrappedXusdFixture);
                const depositAmount = ethers.parseEther("100");

                console.log("wrappedXusd.address", wrappedXusd.address);
                await xusdToken.connect(user).approve(wrappedXusd.target, depositAmount);
                await wrappedXusd.connect(user).deposit(depositAmount, user.address);

                expect(await wrappedXusd.balanceOf(user.address)).to.be.gt(0);
                console.log("wrappedXusd.address", wrappedXusd.target);
                expect(await xusdToken.balanceOf(wrappedXusd.target)).to.equal(depositAmount);
            });

            it("Should fail deposit when paused", async function () {
                const { wrappedXusd, xusdToken, user, portfolioAgent } = await loadFixture(deployWrappedXusdFixture);
                const depositAmount = ethers.parseEther("100");

                await wrappedXusd.connect(portfolioAgent).pause();
                await xusdToken.connect(user).approve(wrappedXusd.target, depositAmount);

                await expect(wrappedXusd.connect(user).deposit(depositAmount, user.address))
                    .to.be.revertedWith("pause");
            });
        });

        describe("Withdraw", function () {
            it("Should withdraw assets correctly", async function () {
                const { wrappedXusd, xusdToken, user } = await loadFixture(deployWrappedXusdFixture);
                const depositAmount = ethers.parseEther("100");

                await xusdToken.connect(user).approve(wrappedXusd.target, depositAmount);
                await wrappedXusd.connect(user).deposit(depositAmount, user.address);

                const withdrawAmount = ethers.parseEther("50");
                await wrappedXusd.connect(user).withdraw(withdrawAmount, user.address, user.address);

                expect(await xusdToken.balanceOf(user.address)).to.be.gt(ethers.parseEther("900"));
            });

            it("Should fail withdraw when paused", async function () {
                const { wrappedXusd, xusdToken, user, portfolioAgent } = await loadFixture(deployWrappedXusdFixture);
                const depositAmount = ethers.parseEther("100");

                await xusdToken.connect(user).approve(wrappedXusd.target, depositAmount);
                await wrappedXusd.connect(user).deposit(depositAmount, user.address);
                await wrappedXusd.connect(portfolioAgent).pause();

                await expect(wrappedXusd.connect(user).withdraw(depositAmount, user.address, user.address))
                    .to.be.revertedWith("pause");
            });
        });
    });

    describe("mint and redeem operations", function () {
        it("Should allow to mint", async function () {
            const { wrappedXusd, ccipPool, user } = await loadFixture(deployWrappedXusdFixture);
            const mintAmount = ethers.parseEther("100");

            // Use the function selector to specify which mint function to call
            const mintFunction = wrappedXusd.interface.getFunction("mint(uint256,address)");
            await wrappedXusd.connect(ccipPool)[mintFunction.format()](mintAmount, user.address);
            expect(await wrappedXusd.balanceOf(user.address)).to.equal(mintAmount);
        });

        it("Should allow to burn", async function () {
            const { wrappedXusd, user } = await loadFixture(deployWrappedXusdFixture);
            const mintAmount = ethers.parseEther("100");

            const mintFunction = wrappedXusd.interface.getFunction("mint(uint256,address)");
            await wrappedXusd.connect(user)[mintFunction.format()](mintAmount, user.address);
            await wrappedXusd.connect(user).redeem(mintAmount, user.address, user.address);
            expect(await wrappedXusd.balanceOf(user.address)).to.equal(0);
        });
    });

    describe("Rate Calculations", function () {
        it("Should calculate rate correctly", async function () {
            const { wrappedXusd } = await loadFixture(deployWrappedXusdFixture);
            const rate = await wrappedXusd.rate();
            expect(rate).to.not.equal(0);
        });

        it("Should convert between assets and shares correctly", async function () {
            const { wrappedXusd } = await loadFixture(deployWrappedXusdFixture);
            const assets = ethers.parseEther("100");

            const shares = await wrappedXusd.convertToShares(assets);
            const backToAssets = await wrappedXusd.convertToAssets(shares);

            // Allow for small rounding differences
            expect(backToAssets).to.be.closeTo(assets, ethers.parseEther("0.0001"));
        });
    });

    describe("Upgradeability", function () {
        it("Should allow upgrader to set new remoteHub", async function () {
            const { wrappedXusd, remoteHub, owner } = await loadFixture(deployWrappedXusdFixture);
            
            await expect(wrappedXusd.connect(owner).setRemoteHub(remoteHub.target))
                .to.emit(wrappedXusd, "RemoteHubUpdated")
                .withArgs(remoteHub.target);
        });

        it("Should not allow non-upgrader to set remoteHub", async function () {
            const { wrappedXusd, remoteHub, user } = await loadFixture(deployWrappedXusdFixture);
            
            await expect(wrappedXusd.connect(user).setRemoteHub(remoteHub.target))
                .to.be.revertedWith("Caller doesn't have UPGRADER_ROLE role");
        });
    });

    describe("ERC4626 View Functions", function () {
        const depositAmount = ethers.parseEther("100");

        beforeEach(async function () {
            const { wrappedXusd, xusdToken, user } = await loadFixture(deployWrappedXusdFixture);
            await xusdToken.connect(user).approve(wrappedXusd.target, depositAmount);
            await wrappedXusd.connect(user).deposit(depositAmount, user.address);
        });

        describe("Withdraw Preview Functions", function () {
            it("Should calculate maxWithdraw correctly", async function () {
                const { wrappedXusd, user } = await loadFixture(deployWrappedXusdFixture);
                const maxWithdraw = await wrappedXusd.maxWithdraw(user.address);
                const balance = await wrappedXusd.balanceOf(user.address);
                const convertedBalance = await wrappedXusd.convertToAssets(balance);
                expect(maxWithdraw).to.equal(convertedBalance);
            });

            it("Should calculate previewWithdraw correctly", async function () {
                const { wrappedXusd } = await loadFixture(deployWrappedXusdFixture);
                const withdrawAmount = "5000000";
                const preview = await wrappedXusd.previewWithdraw(withdrawAmount);
                expect(preview).to.equal("5000000000000000000000000000000000");
            });

            it("Should calculate maxRedeem correctly", async function () {
                const { wrappedXusd, user } = await loadFixture(deployWrappedXusdFixture);
                const maxRedeem = await wrappedXusd.maxRedeem(user.address);
                const balance = await wrappedXusd.balanceOf(user.address);
                expect(maxRedeem).to.equal(balance);
            });

            it("Should calculate previewRedeem correctly", async function () {
                const { wrappedXusd } = await loadFixture(deployWrappedXusdFixture);
                const redeemAmount = "500000000000000000000000000000";
                const preview = await wrappedXusd.previewRedeem(redeemAmount);
                expect(preview).to.equal("500");
            });
        });

    describe("CCIP Mint and Burn Operations", function () {
        describe("CCIP mint(address,uint256)", function () {
            it("Should allow CCIP pool to mint", async function () {
                const { wrappedXusd, ccipPool, user } = await loadFixture(deployWrappedXusdFixture);
                const mintAmount = ethers.parseEther("100");

                await wrappedXusd.connect(ccipPool)["mint(address,uint256)"](user.address, mintAmount);
                
                expect(await wrappedXusd.balanceOf(user.address)).to.equal(mintAmount);
                expect(await wrappedXusd.totalSupply()).to.equal(mintAmount);
            });

            it("Should not allow non-CCIP pool to mint", async function () {
                const { wrappedXusd, user } = await loadFixture(deployWrappedXusdFixture);
                const mintAmount = ethers.parseEther("100");

                await expect(
                    wrappedXusd.connect(user)["mint(address,uint256)"](user.address, mintAmount)
                ).to.be.revertedWith("Caller is not the CCIP pool");
            });

            it("Should fail CCIP mint when paused", async function () {
                const { wrappedXusd, ccipPool, user, portfolioAgent } = await loadFixture(deployWrappedXusdFixture);
                const mintAmount = ethers.parseEther("100");

                await wrappedXusd.connect(portfolioAgent).pause();

                await expect(
                    wrappedXusd.connect(ccipPool)["mint(address,uint256)"](user.address, mintAmount)
                ).to.be.revertedWith("pause");
            });

            it("Should mint correct amount of underlying assets", async function () {
                const { wrappedXusd, ccipPool, user, xusdToken } = await loadFixture(deployWrappedXusdFixture);
                const mintAmount = ethers.parseEther("100");

                const xusdBalanceBefore = await xusdToken.balanceOf(wrappedXusd.target);
                const amount = await wrappedXusd.connect(ccipPool)["mint(address,uint256)"](user.address, mintAmount);
                const xusdBalanceAfter = await xusdToken.balanceOf(user.address);

                expect(xusdBalanceAfter).to.equal("1000000000000000000000");
            });
        });

        describe("CCIP burn", function () {
            beforeEach(async function () {
                const { wrappedXusd, ccipPool, user } = await loadFixture(deployWrappedXusdFixture);
                const mintAmount = ethers.parseEther("100");
                await wrappedXusd.connect(ccipPool)["mint(address,uint256)"](user.address, mintAmount);
            });

            it("Should allow CCIP pool to burn", async function () {
                const { wrappedXusd, ccipPool } = await loadFixture(deployWrappedXusdFixture);
                const burnAmount = ethers.parseEther("50");

                await wrappedXusd.connect(ccipPool)["mint(address,uint256)"](ccipPool.address, burnAmount);
                await wrappedXusd.connect(ccipPool).burn(burnAmount);

                expect(await wrappedXusd.balanceOf(ccipPool.address)).to.equal(0);
                expect(await wrappedXusd.totalSupply()).to.equal(0);
            });

            it("Should not allow non-CCIP pool to burn", async function () {
                const { wrappedXusd, user } = await loadFixture(deployWrappedXusdFixture);
                const burnAmount = ethers.parseEther("50");

                await expect(
                    wrappedXusd.connect(user).burn(burnAmount)
                ).to.be.revertedWith("Caller is not the CCIP pool");
            });

            it("Should fail CCIP burn when paused", async function () {
                const { wrappedXusd, ccipPool, portfolioAgent } = await loadFixture(deployWrappedXusdFixture);
                const burnAmount = ethers.parseEther("50");

                await wrappedXusd.connect(ccipPool)["mint(address,uint256)"](ccipPool.address, burnAmount);
                await wrappedXusd.connect(portfolioAgent).pause();

                await expect(
                    wrappedXusd.connect(ccipPool).burn(burnAmount)
                ).to.be.revertedWith("pause");
            });

            it("Should burn correct amount of underlying assets", async function () {
                const { wrappedXusd, ccipPool, xusdToken, user } = await loadFixture(deployWrappedXusdFixture);
                const burnAmount = ethers.parseEther("50");

                await wrappedXusd.connect(ccipPool)["mint(address,uint256)"](ccipPool.address, burnAmount);
                
                const xusdBalanceBefore = await xusdToken.balanceOf(wrappedXusd.target);
                await wrappedXusd.connect(ccipPool).burn(burnAmount);
                const xusdBalanceAfter = await xusdToken.balanceOf(user.address);

                expect(xusdBalanceAfter).to.equal("1000000000000000000000");
            });

            it("Should fail when burning more than balance", async function () {
                const { wrappedXusd, ccipPool } = await loadFixture(deployWrappedXusdFixture);
                const mintAmount = ethers.parseEther("100");
                const burnAmount = ethers.parseEther("150");

                await wrappedXusd.connect(ccipPool)["mint(address,uint256)"](ccipPool.address, mintAmount);

                await expect(
                    wrappedXusd.connect(ccipPool).burn(burnAmount)
                ).to.be.reverted; // ERC20: burn amount exceeds balance
            });
        });

        describe("CCIP mint/burn interaction with ERC4626", function () {

            it("Should maintain correct total assets after CCIP operations", async function () {
                const { wrappedXusd, ccipPool, user, xusdToken } = await loadFixture(deployWrappedXusdFixture);
                const mintAmount = ethers.parseEther("100");

                // CCIP mint
                await wrappedXusd.connect(ccipPool)["mint(address,uint256)"](user.address, mintAmount);
                const totalAssetsAfterMint = await wrappedXusd.totalAssets();

                // Regular ERC4626 deposit
                const depositAmount = ethers.parseEther("50");
                await xusdToken.connect(user).approve(wrappedXusd.target, depositAmount);
                await wrappedXusd.connect(user).deposit(depositAmount, user.address);

                // Verify total assets includes both CCIP mint and ERC4626 deposit
                const totalAssetsAfterDeposit = await wrappedXusd.totalAssets();
                expect(totalAssetsAfterDeposit).to.equal("50000000000000000000");
            });

            it("Should handle mixed CCIP and ERC4626 operations", async function () {
                const { wrappedXusd, ccipPool, user, xusdToken } = await loadFixture(deployWrappedXusdFixture);
                const mintAmount = ethers.parseEther("100");
                const depositAmount = ethers.parseEther("50");

                // CCIP mint
                await wrappedXusd.connect(ccipPool)["mint(address,uint256)"](user.address, mintAmount);

                // ERC4626 deposit
                await xusdToken.connect(user).approve(wrappedXusd.target, depositAmount);
            });
        });
    });
}); 
});