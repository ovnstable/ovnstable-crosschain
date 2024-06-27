import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre from "hardhat";

describe("TransferTest", function () {
  
  async function deployCrossContracts() {

    const ccipLocalSimulatorFactory = await hre.ethers.getContractFactory("CCIPLocalSimulator");
    const ccipLocalSimulator = await ccipLocalSimulatorFactory.deploy();

    const config: {
      chainSelector_: bigint;
      sourceRouter_: string;
      destinationRouter_: string;
      wrappedNative_: string;
      linkToken_: string;
      ccipBnM_: string;
      ccipLnM_: string;
    } = await ccipLocalSimulator.configuration();

    const remoteHubFactory = await hre.ethers.getContractFactory("RemoteHub");
    const remoteHubSender = await remoteHubFactory.deploy();
    const remoteHubReceiver = await remoteHubFactory.deploy();
    await remoteHubSender.initialize(config.sourceRouter_, config.chainSelector_);
    await remoteHubReceiver.initialize(config.destinationRouter_, config.chainSelector_);


    const ccipBnMFactory = await hre.ethers.getContractFactory("BurnMintERC677Helper");
    const ccipBnM = await ccipBnMFactory.attach(config.ccipBnM_);

    await ccipBnM.drip(ccipSender_Unsafe.target);

    await ccipLocalSimulator.requestLinkFromFaucet(ccipSender_Unsafe.target, 5_000_000_000_000_000_000n);

    return { ccipLocalSimulator, ccipSender_Unsafe, ccipReceiver_Unsafe, ccipBnM };

  }

  describe("Deployment", function () {
    it("Should set the right unlockTime", async function () {
      
      const { ccipLocalSimulator, ccipSender_Unsafe, ccipReceiver_Unsafe, ccipBnM } = await loadFixture(deployCrossContracts);

      const config: {
        chainSelector_: bigint;
        sourceRouter_: string;
        destenationRouter_: string;
        wrappedNative_: string;
        linkToken_: string;
        ccipBnM_: string;
        ccipLnM_: string;
      } = await ccipLocalSimulator.configuration();

      console.log(await ccipBnM.balanceOf(ccipSender_Unsafe.target));
      console.log(await ccipBnM.balanceOf(ccipReceiver_Unsafe.target));

      const someText = "Hello World";
      const amountToSend = 100;

      await ccipSender_Unsafe.send(ccipReceiver_Unsafe.target, someText, config.chainSelector_, ccipBnM.target, amountToSend);
      console.log(await ccipReceiver_Unsafe.text());

      console.log(await ccipBnM.balanceOf(ccipSender_Unsafe.target));
      console.log(await ccipBnM.balanceOf(ccipReceiver_Unsafe.target));

    });


  });


});
