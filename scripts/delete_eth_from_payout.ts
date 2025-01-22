import { ethers } from "hardhat";
const ERC20 = require("./helpers/abi/IERC20.json");
import { initWallet, getContract } from "./helpers/script-utils";

async function main() {

    let signer = await initWallet();

    let remoteHub = await getContract("RemoteHub");

    await(await remoteHub.removeChainItem("5009297550715157269")).wait();
    console.log("done");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

