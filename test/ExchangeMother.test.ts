import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("ExchangeMother", function () {
    async function deployExchangeMotherFixture() {
        const [owner, user, portfolioAgent, unit, freeRider, profitRecipient] = await ethers.getSigners();

        // Deploy mock tokens
        const MockToken = await ethers.getContractFactory("MockERC20");
        const asset = await MockToken.deploy("Mock USDC", "USDC");

        const MockXusdToken = await ethers.getContractFactory("MockXusdToken");
        const xusdToken = await MockXusdToken.deploy("XUSD Token", "XUSD");

        // Deploy mock contracts
        const MockRoleManager = await ethers.getContractFactory("MockRoleManager");
        const roleManager = await MockRoleManager.deploy();

        const MockPayoutManager = await ethers.getContractFactory("ArbitrumPayoutManager");
        const payoutManager = await MockPayoutManager.deploy();

        const MockPortfolioManager = await ethers.getContractFactory("MockPortfolioManager");
        const portfolioManager = await MockPortfolioManager.deploy();

        // Setup roles
        await roleManager.grantRole(roleManager.UNIT_ROLE(), unit.address);
        await roleManager.grantRole(roleManager.PORTFOLIO_AGENT_ROLE(), portfolioAgent.address);
        await roleManager.grantRole(roleManager.FREE_RIDER_ROLE(), freeRider.address);

        // Deploy ExchangeMother
        const ExchangeMother = await ethers.getContractFactory("ExchangeMother");
        const exchangeMother = await upgrades.deployProxy(ExchangeMother, [
            ethers.ZeroAddress
        ]);

        // Deploy mock RemoteHub
        const MockRemoteHub = await ethers.getContractFactory("MockRemoteHub");
        const remoteHub = await MockRemoteHub.deploy(
            await xusdToken.getAddress(),
            ethers.ZeroAddress,
            exchangeMother.target,
            await roleManager.getAddress()
        );

        await remoteHub.setPayoutManager(payoutManager.target);
        await exchangeMother.setRemoteHub(remoteHub.target);
        await exchangeMother.setAsset(asset.target);
        await exchangeMother.setPortfolioManager(portfolioManager.target);
        await exchangeMother.setProfitRecipient(profitRecipient.address);

        // Mint tokens for testing
        await asset.mint(user.address, ethers.parseUnits("10000", 6));
        await asset.mint(portfolioManager.target, ethers.parseUnits("10000", 6));

        const UPGRADER_ROLE = await exchangeMother.UPGRADER_ROLE();
        const LIQ_DELTA_DM = 1000000; // 1e6
        const RISK_FACTOR_DM = 100000; // 1e5

        await portfolioManager.setAsset(asset.target);
        await portfolioManager.setExchange(exchangeMother.target);

        return {
            exchangeMother,
            asset,
            xusdToken,
            remoteHub,
            roleManager,
            payoutManager,
            portfolioManager,
            owner,
            user,
            portfolioAgent,
            unit,
            freeRider,
            profitRecipient,
            UPGRADER_ROLE,
            LIQ_DELTA_DM,
            RISK_FACTOR_DM
        };
    }

    describe("Initialization", function () {
        it("Should initialize with correct values", async function () {
            const { exchangeMother } = await loadFixture(deployExchangeMotherFixture);
            
            expect(await exchangeMother.buyFee()).to.equal(40);
            expect(await exchangeMother.buyFeeDenominator()).to.equal(100000);
            expect(await exchangeMother.redeemFee()).to.equal(40);
            expect(await exchangeMother.redeemFeeDenominator()).to.equal(100000);
            expect(await exchangeMother.payoutPeriod()).to.equal(24 * 60 * 60);
            expect(await exchangeMother.payoutTimeRange()).to.equal(24 * 60 * 60);
            expect(await exchangeMother.abroadMax()).to.equal(1000350);
        });
    });

    describe("Admin Functions", function () {
        it("Should allow upgrader to set asset", async function () {
            const { exchangeMother, asset, owner } = await loadFixture(deployExchangeMotherFixture);
            
            await expect(exchangeMother.connect(owner).setAsset(asset.target))
                .to.emit(exchangeMother, "AssetUpdated")
                .withArgs(asset.target);
        });

        it("Should allow portfolio agent to set fees", async function () {
            const { exchangeMother, portfolioAgent } = await loadFixture(deployExchangeMotherFixture);
            
            await expect(exchangeMother.connect(portfolioAgent).setBuyFee(50, 100000))
                .to.emit(exchangeMother, "BuyFeeUpdated")
                .withArgs(50, 100000);

            await expect(exchangeMother.connect(portfolioAgent).setRedeemFee(50, 100000))
                .to.emit(exchangeMother, "RedeemFeeUpdated")
                .withArgs(50, 100000);
        });

        it("Should allow portfolio agent to set payout times", async function () {
            const { exchangeMother, portfolioAgent } = await loadFixture(deployExchangeMotherFixture);
            const nextTime = Math.floor(Date.now() / 1000) + 3600;
            
            await expect(exchangeMother.connect(portfolioAgent).setPayoutTimes(
                nextTime,
                24 * 60 * 60,
                60 * 60
            )).to.emit(exchangeMother, "PayoutTimesUpdated");
        });
    });

    describe("Exchange Operations", function () {
        describe("Mint", function () {
            it("Should mint xUSD correctly", async function () {
                const { exchangeMother, asset, user, xusdToken } = await loadFixture(deployExchangeMotherFixture);
                const mintAmount = ethers.parseUnits("100", 6);

                await asset.connect(user).approve(exchangeMother.target, mintAmount);
                
                await expect(exchangeMother.connect(user).mint({
                    asset: asset.target,
                    amount: mintAmount
                })).to.emit(exchangeMother, "EventExchange")
                  .withArgs("mint", "99960000", "40000", user.address);
            });

            it("Should fail mint when paused", async function () {
                const { exchangeMother, asset, user, portfolioAgent } = await loadFixture(deployExchangeMotherFixture);
                
                await exchangeMother.connect(portfolioAgent).pause();
                
                await expect(exchangeMother.connect(user).mint({
                    asset: asset.target,
                    amount: 100
                })).to.be.revertedWith("Pausable: paused");
            });
        });

        describe("Redeem", function () {
            it("Should redeem xUSD correctly", async function () {
                const { exchangeMother, asset, xusdToken, user } = await loadFixture(deployExchangeMotherFixture);
                const mintAmount = ethers.parseUnits("100", 6);

                // First mint some xUSD
                await asset.connect(user).approve(exchangeMother.target, mintAmount);
                await exchangeMother.connect(user).mint({
                    asset: asset.target,
                    amount: mintAmount
                });

                // Then redeem
                const redeemAmount = ethers.parseUnits("50", 6);
                await expect(exchangeMother.connect(user).redeem(asset.target, redeemAmount))
                    .to.emit(exchangeMother, "EventExchange")
                    .withArgs("redeem", "49980000", "20000", user.address);
            });
        });
    });

    describe("Payout Operations", function () {
        it("Should execute payout correctly", async function () {
            const { exchangeMother, unit, asset, user } = await loadFixture(deployExchangeMotherFixture);
            
            const mintAmount = ethers.parseUnits("100", 6);
            await asset.connect(user).approve(exchangeMother.target, mintAmount);
            await exchangeMother.connect(user).mint({
                asset: asset.target,
                amount: mintAmount
            });

            const nextTime = 3601;
            await exchangeMother.setPayoutTimes(nextTime, 24 * 60 * 60, 3600);
            await time.increase(3601);

            await expect(exchangeMother.connect(unit).payout(false, {
                inputTokenAddress: "0x0000000000000000000000000000000000000000",
                outputTokenAddress: "0x0000000000000000000000000000000000000000",
                amountIn: 0,
                data: "0x"
            })).to.revertedWith("negative rebase");
        });

        it("Should fail payout when not ready", async function () {
            const { exchangeMother, unit } = await loadFixture(deployExchangeMotherFixture);

            const nextTime = Math.floor(Date.now() / 1000) + 3600;
            await exchangeMother.setPayoutTimes(nextTime, 24 * 60 * 60, 3600);
            await time.increase(3601);
            
            await expect(exchangeMother.connect(unit).payout(false, {
                inputTokenAddress: "0x0000000000000000000000000000000000000000",
                outputTokenAddress: "0x0000000000000000000000000000000000000000",
                amountIn: 0,
                data: "0x"
            })).to.be.revertedWith("payout not ready");
        });

        it("Should handle simulation correctly", async function () {
            const { exchangeMother, unit } = await loadFixture(deployExchangeMotherFixture);
            
            const nextTime = 3601;
            await exchangeMother.setPayoutTimes(nextTime, 24 * 60 * 60, 3600);
            await time.increase(3601);

            await expect(exchangeMother.connect(unit).payout(true, {
                inputTokenAddress: "0x0000000000000000000000000000000000000000",
                outputTokenAddress: "0x0000000000000000000000000000000000000000",
                amountIn: 0,
                data: "0x"
            })).to.be.revertedWithCustomError(exchangeMother, "SimilationRevert");
        });
    });

    describe("Fee Calculations", function () {
        it("Should not charge fees for free riders", async function () {
            const { exchangeMother, asset, freeRider } = await loadFixture(deployExchangeMotherFixture);
            const mintAmount = ethers.parseUnits("100", 6);

            await asset.mint(freeRider.address, mintAmount);
            await asset.connect(freeRider).approve(exchangeMother.target, mintAmount);
            
            await expect(exchangeMother.connect(freeRider).mint({
                asset: asset.target,
                amount: mintAmount
            })).to.emit(exchangeMother, "EventExchange")
              .withArgs("mint", mintAmount, 0, freeRider.address);
        });

    });

    describe("Parameter Settings", function () {
        describe("setCompensateLoss", function () {
            it("Should allow portfolio agent to set compensate loss", async function () {
                const { exchangeMother, portfolioAgent } = await loadFixture(deployExchangeMotherFixture);
                const newCompensateLoss = 100;
                const newDenominator = 10000;

                await expect(exchangeMother.connect(portfolioAgent).setCompensateLoss(newCompensateLoss, newDenominator))
                    .to.emit(exchangeMother, "CompensateLossUpdate")
                    .withArgs(newCompensateLoss, newDenominator);

                expect(await exchangeMother.compensateLoss()).to.equal(newCompensateLoss);
                expect(await exchangeMother.compensateLossDenominator()).to.equal(newDenominator);
            });

            it("Should not allow non-portfolio agent to set compensate loss", async function () {
                const { exchangeMother, user } = await loadFixture(deployExchangeMotherFixture);
                
                await expect(exchangeMother.connect(user).setCompensateLoss(100, 10000))
                    .to.be.revertedWith("Caller doesn't have PORTFOLIO_AGENT_ROLE role");
            });

            it("Should revert with zero denominator", async function () {
                const { exchangeMother, portfolioAgent } = await loadFixture(deployExchangeMotherFixture);
                
                await expect(exchangeMother.connect(portfolioAgent).setCompensateLoss(100, 0))
                    .to.be.revertedWith("Zero denominator not allowed");
            });
        });

        describe("setMaxAbroad", function () {
            it("Should allow portfolio agent to set max abroad", async function () {
                const { exchangeMother, portfolioAgent } = await loadFixture(deployExchangeMotherFixture);
                const newMax = 1000500;

                await expect(exchangeMother.connect(portfolioAgent).setMaxAbroad(newMax))
                    .to.emit(exchangeMother, "MaxAbroadUpdated")
                    .withArgs(newMax);

                expect(await exchangeMother.abroadMax()).to.equal(newMax);
            });

            it("Should not allow non-portfolio agent to set max abroad", async function () {
                const { exchangeMother, user } = await loadFixture(deployExchangeMotherFixture);
                
                await expect(exchangeMother.connect(user).setMaxAbroad(1000500))
                    .to.be.revertedWith("Caller doesn't have PORTFOLIO_AGENT_ROLE role");
            });
        });

        describe("setOracleLoss", function () {
            it("Should allow portfolio agent to set oracle loss", async function () {
                const { exchangeMother, portfolioAgent } = await loadFixture(deployExchangeMotherFixture);
                const newOracleLoss = 50;
                const newDenominator = 10000;

                await expect(exchangeMother.connect(portfolioAgent).setOracleLoss(newOracleLoss, newDenominator))
                    .to.emit(exchangeMother, "OracleLossUpdate")
                    .withArgs(newOracleLoss, newDenominator);

                expect(await exchangeMother.oracleLoss()).to.equal(newOracleLoss);
                expect(await exchangeMother.oracleLossDenominator()).to.equal(newDenominator);
            });

            it("Should not allow non-portfolio agent to set oracle loss", async function () {
                const { exchangeMother, user } = await loadFixture(deployExchangeMotherFixture);
                
                await expect(exchangeMother.connect(user).setOracleLoss(50, 10000))
                    .to.be.revertedWith("Caller doesn't have PORTFOLIO_AGENT_ROLE role");
            });

            it("Should revert with zero denominator", async function () {
                const { exchangeMother, portfolioAgent } = await loadFixture(deployExchangeMotherFixture);
                
                await expect(exchangeMother.connect(portfolioAgent).setOracleLoss(50, 0))
                    .to.be.revertedWith("Zero denominator not allowed");
            });
        });

        describe("setProfitFee", function () {
            it("Should allow portfolio agent to set profit fee", async function () {
                const { exchangeMother, portfolioAgent } = await loadFixture(deployExchangeMotherFixture);
                const newFee = 1000;
                const newDenominator = 10000;

                await expect(exchangeMother.connect(portfolioAgent).setProfitFee(newFee, newDenominator))
                    .to.emit(exchangeMother, "ProfitFeeUpdated")
                    .withArgs(newFee, newDenominator);

                expect(await exchangeMother.profitFee()).to.equal(newFee);
                expect(await exchangeMother.profitFeeDenominator()).to.equal(newDenominator);
            });

            it("Should not allow non-portfolio agent to set profit fee", async function () {
                const { exchangeMother, user } = await loadFixture(deployExchangeMotherFixture);
                
                await expect(exchangeMother.connect(user).setProfitFee(1000, 10000))
                    .to.be.revertedWith("Caller doesn't have PORTFOLIO_AGENT_ROLE role");
            });

            it("Should revert with zero denominator", async function () {
                const { exchangeMother, portfolioAgent } = await loadFixture(deployExchangeMotherFixture);
                
                await expect(exchangeMother.connect(portfolioAgent).setProfitFee(1000, 0))
                    .to.be.revertedWith("Zero denominator not allowed");
            });

            it("Should revert when fee greater than denominator", async function () {
                const { exchangeMother, portfolioAgent } = await loadFixture(deployExchangeMotherFixture);
                
                await expect(exchangeMother.connect(portfolioAgent).setProfitFee(11000, 10000))
                    .to.be.revertedWith("fee > denominator");
            });
        });
    });

}); 