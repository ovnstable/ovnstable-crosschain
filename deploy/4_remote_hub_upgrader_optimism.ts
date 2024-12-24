import { ethers, network, upgrades } from "hardhat";
const hre = require("hardhat");
const { getImplementationAddress } = require('@openzeppelin/upgrades-core');
import appRoot from 'app-root-path';
const fs = require('fs');
const path = require('path');
const chain =     {
    NAME: "OPTIMISM",
    RPC_URL: process.env.OPTIMISM_RPC,
    BLOCK_NUMBER: 129437283,
    ccipRouterAddress: "0x3206695CaE29952f4b0c22a169725a865bc8Ce0f",
    chainSelector: "3734403246176062136",
    ccipPool: "0xe660606961DF8855E589d59795FAe4b0ecD41FD3",
    liqIndex: ""
};



async function main() {


    let contractName = "RemoteHubUpgrader";
    let networkName = "optimism";
    let remoteHub = await getContract("RemoteHub", networkName);
    let initParams = [chain.chainSelector];
    let unsafeAllow = ['constructor', 'state-variable-immutable'];
    let contrParams = [chain.ccipRouterAddress, remoteHub.target];

    console.log("RemoteHub address: ", remoteHub.target);

    const contractFactory = await ethers.getContractFactory(contractName, initParams);
    
    let proxy = await upgrades.deployProxy(contractFactory, initParams, {
        kind: 'uups',
        unsafeAllow: unsafeAllow,
        constructorArgs: contrParams
    });
    console.log("Proxy address: ", proxy.target);

    await upgrades.upgradeProxy(proxy, contractFactory, {
        kind: 'uups',
        unsafeAllow: unsafeAllow,
        constructorArgs: contrParams
    });
    
    console.log("Upgraded proxy address: ", proxy.target);
    // await proxy.waitForDeployment();

    let impl = await getImplementationAddress(ethers.provider, proxy.target);
    console.log("Implementation address: ", impl);

    let artifact  = await hre.artifacts.readArtifact(contractName);
    artifact.implementation = impl;
    let proxyDeployments = {
            address: proxy.target,
            ...artifact
        }

    let newname = 'deployments/' + networkName + '/' + contractName + '.json';
    console.log(newname);
    fs.writeFileSync(newname, JSON.stringify(proxyDeployments, "", 2))
        
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