import { ethers } from "hardhat";
const ERC20 = require("./helpers/abi/IERC20.json");
import { initWallet, getContract } from "./helpers/script-utils";

async function main() {

    let signer = await initWallet();

    let exchange = await getContract('ExchangeChild');
    let market = await getContract('Market');
    let asset = await getContract("XusdToken");

    // await asset.approve(market.target, "100000");
    console.log('Asset approve done');
    console.log(asset.target, "100000", signer.address);
    await (await market.wrap(asset.target, "100000", signer.address)).wait();
    console.log('Exchange.buy done');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

