import { ethers } from "hardhat";
const ERC20 = require("./helpers/abi/IERC20.json");
import { initWallet, getContract, switchNetwork } from "./helpers/script-utils";

async function main() {

    // let networkName = await switchNetwork();

    let signer = await initWallet();

    let remoteHub = await getContract('RemoteHub');
    let xusdToken = await getContract('XusdToken');
    // let usdc = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
    // let asset = await ethers.getContractAt(ERC20, usdc, signer);

    // await (await xusdToken.approve(remoteHub.target, "100000")).wait();
    console.log('Asset approve done');
    await (await remoteHub.crossTransfer(signer.address, "100000", "11344663589394136015", {value: "100000000000"})).wait();
    console.log('RemoteHub.crossTransfer done');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

