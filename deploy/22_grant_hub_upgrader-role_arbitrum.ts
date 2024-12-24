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
class Roles {
    static get PORTFOLIO_AGENT_ROLE() { return '0xd67ad422505496469a1adf6cdf9e5ee92ac5d33992843c9ecc4b2f6d6cde9137'; }
    static get UNIT_ROLE() { return '0xede8101501d89b9894e78e4f219420b6ddb840e8e75dde35741a0745408476d7'; }
    static get DEFAULT_ADMIN_ROLE() { return '0x0000000000000000000000000000000000000000000000000000000000000000'; }
    static get UPGRADER_ROLE() { return '0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3'; }
    static get EXCHANGER() { return '0x3eb675f159e6ca6cf5de6bfbbc8c4521cfd428f5e9166e51094d5898504caf2d'; }
}

async function main() {

    let networkName = "arbitrum";
    let remoteHub = await getContract("RemoteHub", networkName);
    let remoteHubUpgrader = await getContract("RemoteHubUpgrader", networkName);
    
    let dev5Signer = "0x086dFe298907DFf27BD593BD85208D57e0155c94";

    await remoteHub.grantRole(Roles.UPGRADER_ROLE, dev5Signer);
    await remoteHubUpgrader.grantRole(Roles.UPGRADER_ROLE, dev5Signer);

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