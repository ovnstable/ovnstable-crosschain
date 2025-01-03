import { ethers } from "hardhat";
import { initWallet, getContract } from "./helpers/script-utils";

async function main() {

    let exchange = await getContract('ExchangeMother');
    let xusdToken = await getContract('XusdToken');
    let remoteHub = await getContract('RemoteHub');
    let remoteHubUpgrader = await getContract('RemoteHubUpgrader');
    let wrappedXusdToken = await getContract('WrappedXusdToken');

    await exchange.unpause();
    await xusdToken.unpause();
    await remoteHub.unpause();
    await remoteHubUpgrader.unpause();
    await wrappedXusdToken.unpause();
    
    console.log('All contracts paused');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

