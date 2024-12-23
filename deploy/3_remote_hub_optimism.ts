import { ethers, network, upgrades } from "hardhat";
const hre = require("hardhat");
const { getImplementationAddress } = require('@openzeppelin/upgrades-core');
const fs = require('fs');
const chain =     {
    NAME: "OPTIMISM",
    RPC_URL: process.env.OPTIMISM_RPC,
    BLOCK_NUMBER: 129437283,
    ccipRouterAddress: "0x3206695CaE29952f4b0c22a169725a865bc8Ce0f",
    chainSelector: "3734403246176062136",
    ccipPool: "0xe660606961DF8855E589d59795FAe4b0ecD41FD3",
    liqIndex: ""
};

let contractName = "RemoteHub";
let networkName = "optimism";
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