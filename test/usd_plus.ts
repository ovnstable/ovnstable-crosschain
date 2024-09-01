import { ethers, upgrades } from "hardhat";
import { expect, use } from "chai";
import { Contract } from "ethers";
import BigNumber from "bignumber.js";


describe("MyToken", function () {
  let usdPlus: Contract;
  let account:any;

  let user1:any;
  let user2:any;
  let user3:any;

  let nonRebaseUser1:any;
  let nonRebaseUser2:any;

  beforeEach(async function () {
    const MyToken = await ethers.getContractFactory("XusdToken");
    usdPlus = await upgrades.deployProxy(MyToken, ["xUSD", "xUSD", 6, "0x0000000000000000000000000000000000000000"], { initializer: 'initialize' });

    const [deployerSigner, otherSigner, otherSigner2, otherSigner3] = await ethers.getSigners();
    account = deployerSigner.address;
    
    user1 = otherSigner.address;
    user2 = otherSigner2.address;
    user3 = otherSigner3.address;
    
    // nonRebaseUser1 = await createRandomWallet();
    // nonRebaseUser2 = await createRandomWallet();
    
    // await usdPlus.setExchanger(account);
    // await usdPlus.setPayoutManager(account);
  });

  function fromE6(value:any) {
    return value / 10 ** 6;
  }

  function toE6(value:any) {
      return new BigNumber(value.toString()).times(new BigNumber(10).pow(6)).toFixed(0);
  }

  async function balanceOf(user:any, amount:any) {
      let balanceValue = await usdPlus.balanceOf(user.address);
      let balance = Math.ceil(fromE6(balanceValue));
      expect(balance).to.eq(amount);
  }

  it("should check the initial supply", async function () {
    // Check the initial supply
    const totalSupply = await usdPlus.totalSupply();
    expect(totalSupply).to.equal(0);  // assuming initial supply is 0
  });

  it("Should return the token name and symbol", async () => {
      expect(await usdPlus.name()).to.equal("xUSD");
      expect(await usdPlus.symbol()).to.equal("xUSD");
  });

  it("Should have 6 decimals", async () => {
      expect(await usdPlus.decimals()).to.equal(6);
  });

  it("Should return 0 balance for the zero address", async () => {
      expect(
          await usdPlus.balanceOf("0x0000000000000000000000000000000000000000")
      ).to.equal(0);
  });

  // it("Should not allow anyone to mint USD+ directly", async () => {
  //   const [owner] = await ethers.getSigners();

  //   // Try to transfer more tokens than the balance and expect it to revert
  //   await expect(usdPlus.transfer("0x0000000000000000000000000000000000000001", 1))
  //     .to.be.revertedWith("ERC20: transfer amount exceeds balance");
  // });

  // it("Should allow a simple transfer of 1 USD+", async () => {
  //     await usdPlus.mint(user2, toE6(100));
  //     await balanceOf(user1, 0);
  //     await balanceOf(user2, 100);
  //     await usdPlus.connect(user2).transfer(user1, toE6(1));
  //     await balanceOf(user1, 1);
  //     await balanceOf(user2, 99);
  // });

  // it("Should allow a transferFrom with an allowance", async () => {
  //     await usdPlus.mint(user1.address, toE6(1000));

  //     await usdPlus.connect(user1).approve(user2.address, toE6(1000));
  //     expect(await usdPlus.allowance(user1.address, user2.address)).to.eq(toE6(1000));

  //     await usdPlus.connect(user2).transferFrom(user1.address, user2.address, toE6(1));
  //     await balanceOf(user2, 1);
  //     expect(await usdPlus.allowance(user1.address, user2.address)).to.eq(toE6(999));

  // });
});
