import { ethers, network, upgrades } from "hardhat";
const hre = require("hardhat");
const { getImplementationAddress } = require('@openzeppelin/upgrades-core');
const fs = require('fs');
const { getContract } = require('../scripts/helpers/script-utils');

const chain = {
    NAME: "OPTIMISM",
    RPC_URL: process.env.OPTIMISM_RPC,
    BLOCK_NUMBER: 129437283,
    ccipRouterAddress: "0x3206695CaE29952f4b0c22a169725a865bc8Ce0f",
    chainSelector: "3734403246176062136",
    ccipPool: "0xe660606961DF8855E589d59795FAe4b0ecD41FD3",
    liqIndex: ""
};

async function main() {

    let contractName = "XusdToken";
    let networkName = "optimism";
    let remoteHub = await getContract("RemoteHub", networkName);
    let initParams = ["xUSD", "xUSD", 6, remoteHub.target];
    let unsafeAllow = [];
    let contrParams = [];

    const contractFactory = await ethers.getContractFactory(contractName, initParams);


    let proxy;
    try{
        proxy = await getContract(contractName, networkName);

        // await upgrades.forceImport(proxy.target, contractFactory, {
        //     kind: 'uups',
        //     unsafeAllow: unsafeAllow,
        //     constructorArgs: contrParams
        // });
        console.log("Proxy already deployed.");

        // let newImpl = await upgrades.deployImplementation(contractFactory, {
        //     kind: 'uups',
        //     unsafeAllow: unsafeAllow,
        //     constructorArgs: contrParams,
        //     redeployImplementation: 'always'
        // });

        // console.log("Implementation address: ", newImpl);

    } catch(e) {
        console.log("Proxy not deployed, deploying...");
        proxy = await upgrades.deployProxy(contractFactory, initParams, {
            kind: 'uups',
            unsafeAllow: unsafeAllow,
            constructorArgs: contrParams
        });
        
    }
    
    
    console.log("Proxy address: ", proxy.target);
    await upgrades.upgradeProxy(proxy, contractFactory, {
        kind: 'uups',
        unsafeAllow: unsafeAllow,
        constructorArgs: contrParams,
        redeployImplementation: 'always'
    });
    console.log("Upgraded proxy address: ", proxy.target);

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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});