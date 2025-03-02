import { ethers } from "hardhat";
const ERC20 = require("./helpers/abi/IERC20.json");
import { initWallet, getContract } from "./helpers/script-utils";

let config = {
    "arbitrum": {
        networkName: "arbitrum",
        chainSelector: "4949039107694359620",
        remoteHub: "0x5ed71817935B2f94e9F3661E9b4C64C546736F42",
        remoteHubUpgrader: "0x51ea40845f1654ab9ce309166DcE60B514c8d7ED"
    },
    "mode": {
        networkName: "mode",
        chainSelector: "7264351850409363825",
        remoteHub: "0x85DE18Bc9719CF673A9F4dF709cbAB701BcC9704",
        remoteHubUpgrader: "0x1705E9E103dBaa234CD6D27B0E9CA8F4E4D47ec7"
    },
    "ethereum": {
        networkName: "ethereum",
        chainSelector: "5009297550715157269",
        remoteHub: "0x85de18bc9719cf673a9f4df709cbab701bcc9704",
        remoteHubUpgrader: "0x1705E9E103dBaa234CD6D27B0E9CA8F4E4D47ec7",
    },
    "bsc": {
        networkName: "bsc",
        chainSelector: "11344663589394136015",
        remoteHub: "0x5560Eb50028b9f6547a83b8fAa52Ab9CB315aC68",
        remoteHubUpgrader: "0x8691117eD0244F340951f3f474FCeec2973EfAc7",
    },
    "optimism": {
        networkName: "optimism",
        chainSelector: "3734403246176062136",
        remoteHub: "0x09d39311b962aA803D32BD79DAA3Fe3ae9E5E579",
        remoteHubUpgrader: "0x60c8A332Fd6d67F80cC4906f31ce9c5043fab992"
    },
    "sonic": {
        networkName: "sonic",
        chainSelector: "1673871237479749969",
        remoteHub: "0xd9c4B3d7D014A5C37e751D5DF9b209213d04d91c",
        remoteHubUpgrader: "0xaD4939705B9d1207415A4B2E7818714455fD9137"
    }
}

async function main() {

    let remoteHub = await getContract('RemoteHub');
    let remoteHubUpgrader = await getContract('RemoteHubUpgrader');

    let len = 0;
    for (let i = 0; i < 100; i++) {
        try {
            let chainItems = await remoteHub.chainItems(i);
        } catch (e) {
            len = i;
            break;
        }
    }

    for (let chain in config) {
        let a = await remoteHub.allowlistedDestinationChains(config[chain].chainSelector);
        let b = await remoteHub.allowlistedSourceChains(config[chain].chainSelector);
        let c = await remoteHub.allowlistedSenders(config[chain].remoteHub);
        let d = await remoteHub.allowlistedSenders(config[chain].remoteHubUpgrader);
        let a2 = await remoteHubUpgrader.allowlistedDestinationChains(config[chain].chainSelector);
        let b2 = await remoteHubUpgrader.allowlistedSourceChains(config[chain].chainSelector);
        let c2 = await remoteHubUpgrader.allowlistedSenders(config[chain].remoteHub);
        let d2 = await remoteHubUpgrader.allowlistedSenders(config[chain].remoteHubUpgrader);
        let chainItem = (await remoteHub.chainItemById(config[chain].chainSelector)).chainSelector == config[chain].chainSelector;

        let f = false;

        for (let i = 0; i < len; i++) {
            let chainItems = await remoteHub.chainItems(i);
            if (chainItems.chainSelector == config[chain].chainSelector) {
                f = true;
                break;
            }
        }

        let agr = a && b && c && d && a2 && b2 && c2 && d2 && f && chainItem;
        console.log(`${config[chain].networkName}: ${agr ? "OK" : "NG"} ${a} ${b} ${c} ${d} ${a2} ${b2} ${c2} ${d2} ${f} ${chainItem}`);
    }
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

