import { ethers } from "hardhat";
const ERC20 = require("../helpers/abi/IERC20.json");
import { initWallet, getContract } from "./helpers/script-utils";

async function main() {

    let signer = await initWallet();

    let exchange = await getContract('ExchangeMother');
    let usdc = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
    let asset = await ethers.getContractAt(ERC20, usdc, signer);

    // await showM2M();
    // console.log(await asset.balanceOf((await initWallet()).address));
    // return

    await asset.connect(signer).approve(exchange.target, "1000000");
    console.log('Asset approve done');
    await exchange.connect(signer).buy(asset.target, "1000000");
    console.log('Exchange.buy done');

    // await showM2M();
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

