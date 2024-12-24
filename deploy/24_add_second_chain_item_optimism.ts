import { ethers, network, upgrades } from "hardhat";
const hre = require("hardhat");
const { getImplementationAddress } = require('@openzeppelin/upgrades-core');
const fs = require('fs');
import appRoot from 'app-root-path';
const path = require('path');
const chain = {
    NAME: "ARBITRUM",
    RPC_URL: process.env.ARBITRUM_RPC,
    BLOCK_NUMBER: 284113241,
    ccipRouterAddress: "0x141fa059441E0ca23ce184B6A78bafD2A517DdE8",
    chainSelector: "4949039107694359620",
    ccipPool: "0x86d99f9b22052645eA076cd16da091b9E87fB6d6",
    liqIndex: ""
};

async function main() {

    let networkName = "arbitrum";

    let remoteHubOptimism = await getContract("RemoteHub", "optimism");


    let remoteHub = await getContract("RemoteHub", networkName);
    let xusdToken = await getContract("XusdToken", networkName);
    let exchange = await getContract("ExchangeMother", networkName);
    let payoutManager = await getContract("ArbitrumPayoutManager", networkName);
    let roleManager = await getContract("RoleManager", networkName);
    let remoteHubUpgrader = await getContract("RemoteHubUpgrader", networkName);
    let market = await getContract("Market", networkName);
    let wrappedXusdToken = await getContract("WrappedXusdToken", networkName);

    await remoteHubOptimism.addChainItem({
        chainSelector: chain.chainSelector,
        xusd: xusdToken.target,
        exchange: exchange.target,
        payoutManager: payoutManager.target,
        roleManager: roleManager.target,
        remoteHub: remoteHub.target,
        remoteHubUpgrader: remoteHubUpgrader.target,
        market: market.target,
        wxusd: wrappedXusdToken.target,
        ccipPool: chain.ccipPool
    });
    console.log("Initialized wxusd token");
}

async function getContract(name: string, networkName: string): Promise<any> {
    const searchPath = fromDir(appRoot.path, path.join(networkName, `${name}.json`));
    if (searchPath === undefined) {
        throw new Error(`Contract file not found for ${name} on ${networkName}`);
    }
    const contractJson = JSON.parse(fs.readFileSync(searchPath, 'utf-8'));
    return await ethers.getContractAt(contractJson.abi, contractJson.address);
}


function fromDir(startPath: string, filter: string): string | undefined {
    if (!fs.existsSync(startPath)) {
        console.error(`Directory does not exist: ${startPath}`);
        return undefined;
    }

    try {
        const files = fs.readdirSync(startPath);

        for (const file of files) {
            const filename = path.join(startPath, file);
            const stat = fs.lstatSync(filename);

            if (stat.isDirectory()) {
                const result = fromDir(filename, filter);
                if (result) return result;
            } else if (filename.endsWith(filter)) {
                return filename;
            }
        }
    } catch (error) {
        console.error(`Error reading directory ${startPath}:`, error);
    }

    return undefined;
}

// Run the script with proper error handling
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});