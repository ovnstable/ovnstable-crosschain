import { ethers } from "hardhat";
const ERC20 = require("./helpers/abi/IERC20.json");
import { initWallet, getContract } from "./helpers/script-utils";

async function main() {

    let signer = await initWallet();

    let remoteHub = await getContract('RemoteHub');
    let xusdToken = await getContract('XusdToken');
    // let usdc = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
    // let asset = await ethers.getContractAt(ERC20, usdc, signer);

    await (await xusdToken.approve(remoteHub.target, "5000")).wait();
    console.log('Asset approve done');
    await (await remoteHub.crossTransfer(signer.address, "5000", "7264351850409363825", {value: "1000000000"})).wait();
    console.log('RemoteHub.crossTransfer done');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

