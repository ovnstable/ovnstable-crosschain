import { ethers, network, upgrades } from "hardhat";
const hre = require("hardhat");
const { getImplementationAddress } = require('@openzeppelin/upgrades-core');
const fs = require('fs');
const chain = {
        NAME: "ARBITRUM",
        RPC_URL: process.env.ARBITRUM_RPC,
        BLOCK_NUMBER: 284113241,
        ccipRouterAddress: "0x141fa059441E0ca23ce184B6A78bafD2A517DdE8",
        chainSelector: "4949039107694359620",
        ccipPool: "0x86d99f9b22052645eA076cd16da091b9E87fB6d6",
        liqIndex: ""
    };

let contractName = "RemoteHub";
let networkName = "arbitrum";
let initParams = [chain.chainSelector, chain.chainSelector];
let unsafeAllow = ['constructor', 'state-variable-immutable'];
let contrParams = [chain.ccipRouterAddress];

async function main() {

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

// Run the script with proper error handling
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});