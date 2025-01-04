import { ethers, network, upgrades } from "hardhat";
const hre = require("hardhat");
const { getImplementationAddress } = require('@openzeppelin/upgrades-core');
const fs = require('fs');
const { getContract } = require('../scripts/helpers/script-utils');

let contractName = "WrappedXusdToken";
let networkName = "sonic";
let remoteHubAddress = "0x0000000000000000000000000000000000000000";
let initParams = ["Wrapped xUSD", "wxUSD", 6, remoteHubAddress];
let unsafeAllow = [];
let contrParams = [];

async function main() {

    const contractFactory = await ethers.getContractFactory(contractName, initParams);
    

    let proxy = await getContract(contractName);

    // let proxy = await upgrades.deployProxy(contractFactory, initParams, {
    //     kind: 'uups',
    //     unsafeAllow: unsafeAllow,
    //     constructorArgs: contrParams
    // });
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