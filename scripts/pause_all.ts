import { ethers } from "hardhat";
import { initWallet, getContract } from "./helpers/script-utils";

async function main() {

    let exchange = await getContract('ExchangeMother');
    let xusdToken = await getContract('XusdToken');
    let remoteHub = await getContract('RemoteHub');
    let remoteHubUpgrader = await getContract('RemoteHubUpgrader');
    let wrappedXusdToken = await getContract('WrappedXusdToken');

    await exchange.pause();
    await xusdToken.pause();
    await remoteHub.pause();
    await remoteHubUpgrader.pause();
    await wrappedXusdToken.pause();
    
    console.log('All contracts paused');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

