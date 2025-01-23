import { ethers } from "hardhat";
const ERC20 = require("./helpers/abi/IERC20.json");
import { initWallet, getContract } from "./helpers/script-utils";

const ethConfig = {
    networkName: "ethereum",
    ccipRouterAddress: "0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D",
    chainSelector: "5009297550715157269",
    ccipPool: "0xd72F7010f0Fa621aB0869e61e9bb4e3cC887c66c",

    xusdToken: "0x798295434111F5E088Ebeb892773E6A925d8E011",
    exchange: "0x29A0dc4f509873673B7682B60598d393A1e591b7",
    payoutManager: "0x5560Eb50028b9f6547a83b8fAa52Ab9CB315aC68",
    roleManager: "0xCCd1fBCE567E74d650F680d923D1BCc7C5130d4D",
    remoteHub: "0x85de18bc9719cf673a9f4df709cbab701bcc9704",
    remoteHubUpgrader: "0x1705E9E103dBaa234CD6D27B0E9CA8F4E4D47ec7",
    market: "0xfEeb025dA416cc5B8f8bf0988d0cF2eA4362c0b9",
    wrappedXusdToken: "0xAe770d24ec1580A13392E0B71067571351029203",
};

async function main() {

    let signer = await initWallet();

    let remoteHub = await getContract("RemoteHub");

    await(await remoteHub.removeChainItem("5009297550715157269")).wait();
    
    // await (await remoteHub.addChainItem({
    //     chainSelector: ethConfig.chainSelector,
    //     xusd: ethConfig.xusdToken,
    //     exchange: ethConfig.exchange,
    //     payoutManager: ethConfig.payoutManager,
    //     roleManager: ethConfig.roleManager,
    //     remoteHub: ethConfig.remoteHub,
    //     remoteHubUpgrader: ethConfig.remoteHubUpgrader,
    //     market: ethConfig.market,
    //     wxusd: ethConfig.wrappedXusdToken,
    //     ccipPool: ethConfig.ccipPool
    // })).wait();
    console.log("done");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

