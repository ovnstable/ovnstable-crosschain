import { ethers, network, upgrades } from "hardhat";
const hre = require("hardhat");
const { getImplementationAddress } = require('@openzeppelin/upgrades-core');
const fs = require('fs');
const { getContract, initWallet } = require('../scripts/helpers/script-utils');

class Roles {
    static get PORTFOLIO_AGENT_ROLE() { return '0xd67ad422505496469a1adf6cdf9e5ee92ac5d33992843c9ecc4b2f6d6cde9137'; }
    static get UNIT_ROLE() { return '0xede8101501d89b9894e78e4f219420b6ddb840e8e75dde35741a0745408476d7'; }
    static get DEFAULT_ADMIN_ROLE() { return '0x0000000000000000000000000000000000000000000000000000000000000000'; }
    static get UPGRADER_ROLE() { return '0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3'; }
    static get EXCHANGER() { return '0x3eb675f159e6ca6cf5de6bfbbc8c4521cfd428f5e9166e51094d5898504caf2d'; }
    static get PAYOUT_EXECUTOR_ROLE() { return '0xd77df84835b214746cc9546302d3e1df1d6b06740a1f528273c85999497318eb'; }
}


const bscConfig = {
    networkName: "bsc",
    ccipRouterAddress: "0x34B03Cb9086d7D758AC55af71584F81A598759FE",
    chainSelector: "11344663589394136015",
    ccipPool: "0xD9c00B874fB86d2A09b5BA1DfF7fb05554DB4B6d",

    xusdToken: "0x5D49Db58c97F77F7d99ef1698f14AaAF29a1F2C1",
    exchange: "0xce6B16baa9A148001fc43fD7B97bd196040B857b",
    payoutManager: "0x2AbF1714B464eF3B2da7ae8A7437c12A347Ca9aA",
    roleManager: "0x240a500a1058cBbC2312983F886B5Cf2679Bf227",
    remoteHub: "0x5560Eb50028b9f6547a83b8fAa52Ab9CB315aC68",
    remoteHubUpgrader: "0x8691117eD0244F340951f3f474FCeec2973EfAc7",
    market: "0xF4D6Ce795D43f73ddcd7112bE04361cD9F4dd50b",
    wrappedXusdToken: "0x2d7e22Fb0fb7A7F0d1fef70ad8873A9ffDe18007",
    portfolioManager: "0x91b82ECac33002eBAaE4967C30eE93316159Df39"
};

const arbConfig = {
    networkName: "arbitrum",
    ccipRouterAddress: "0x141fa059441E0ca23ce184B6A78bafD2A517DdE8",
    chainSelector: "4949039107694359620",
    ccipPool: "0x86d99f9b22052645eA076cd16da091b9E87fB6d6",

    xusdToken: "0xe80772Eaf6e2E18B651F160Bc9158b2A5caFCA65",
    exchange: "0x73cb180bf0521828d8849bc8CF2B920918e23032",
    payoutManager: "0x764424B7Dc62c4cB57898Ee47DcDeEe8CCC5D5b8",
    roleManager: "0xD9F74C70c28bba1d9dB0c44c5a2651cBEB45f3BA",
    remoteHub: "0x5ed71817935B2f94e9F3661E9b4C64C546736F42",
    remoteHubUpgrader: "0x51ea40845f1654ab9ce309166DcE60B514c8d7ED",
    market: "0x149Eb6E777aDa78D383bD93c57D45a9A71b171B1",
    wrappedXusdToken: "0xB86fb1047A955C0186c77ff6263819b37B32440D",
    portfolioManager: "0x5Fb8ab30E3cC24b976c005e0C4B5eAf88A537276",
};

const opConfig = {
    networkName: "optimism",
    ccipRouterAddress: "0x3206695CaE29952f4b0c22a169725a865bc8Ce0f",
    chainSelector: "3734403246176062136",
    ccipPool: "0xe660606961DF8855E589d59795FAe4b0ecD41FD3",

    xusdToken: "0xA9c6b33CDD4D5EA1929826A846a1c04Fb3a5732e",
    exchange: "0xd9239aB483CdcE215dB4F4c344Ce6ea27E2EF9Cd",
    payoutManager: "0x5Cd6c78522a92591479A65d43cc5fbD046D6FdBE",
    roleManager: "0x65B6747470441c28D91B77dDFef6d4969805089b",
    remoteHub: "0x09d39311b962aA803D32BD79DAA3Fe3ae9E5E579",
    remoteHubUpgrader: "0x60c8A332Fd6d67F80cC4906f31ce9c5043fab992",
    market: "0xe7Fe20C74E209C51671e7c54509846EF96eBA939",
    wrappedXusdToken: "0xe49465604e25cd5167005e0cEbD8Af461e833b83",
    portfolioManager: "0xB04ae3248216cE8A5B52620820f7eDe27281AE10",
};

const rewardWallet = "0x9030D5C596d636eEFC8f0ad7b2788AE7E9ef3D46";
const dev5 = "0x086dFe298907DFf27BD593BD85208D57e0155c94";
const networkName = bscConfig.networkName;

let contracts = {
    "RemoteHub": {
        "name": "RemoteHub",
        "initParams": [bscConfig.chainSelector, bscConfig.chainSelector],
        "unsafeAllow": ['constructor', 'state-variable-immutable'],
        "contrParams": [bscConfig.ccipRouterAddress]
    },
    "RemoteHubUpgrader": {
        "name": "RemoteHubUpgrader",
        "initParams": [bscConfig.chainSelector],
        "unsafeAllow": ['constructor', 'state-variable-immutable'],
        "contrParams": [bscConfig.ccipRouterAddress, bscConfig.remoteHub]
    },
    "ExchangeChild": {
        "name": "ExchangeChild",
        "initParams": [bscConfig.remoteHub],
        "unsafeAllow": [],
        "contrParams": []
    },
    "Market": {
        "name": "Market",
        "initParams": [bscConfig.remoteHub],
        "unsafeAllow": [],
        "contrParams": []
    },
    "RoleManager": {
        "name": "RoleManager",
        "initParams": [],
        "unsafeAllow": [],
        "contrParams": []
    },
    "PortfolioManager": {
        "name": "PortfolioManager",
        "initParams": [],
        "unsafeAllow": [],
        "contrParams": []
    },
    "XusdToken": {
        "name": "XusdToken",
        "initParams": ["xUSD", "xUSD", 6, bscConfig.remoteHub],
        "unsafeAllow": [],
        "contrParams": []
    },  
    "PayoutManager": {
        "name": "BscPayoutManager",
        "initParams": [bscConfig.remoteHub, rewardWallet],
        "unsafeAllow": [],
        "contrParams": []
    },
    "WrappedXusdToken": {
        "name": "WrappedXusdToken",
        "initParams": ["Wrapped xUSD", "wxUSD", 6, bscConfig.remoteHub],
        "unsafeAllow": [],
        "contrParams": []
    }
};


async function main() {

    // await deployContract(contracts.RemoteHub);
    // await deployContract(contracts.RemoteHubUpgrader);
    // await deployContract(contracts.ExchangeChild);
    // await deployContract(contracts.Market);
    // await deployContract(contracts.RoleManager);
    // await deployContract(contracts.PortfolioManager);
    // await deployContract(contracts.XusdToken);
    // await deployContract(contracts.PayoutManager);
    // await deployContract(contracts.WrappedXusdToken);

    let wallet = await initWallet();

    let remoteHub = await getContract("RemoteHub");
    let xusdToken = await getContract("XusdToken");
    let exchange = await getContract("ExchangeChild");
    let payoutManager = await getContract("BscPayoutManager");
    let roleManager = await getContract("RoleManager");
    let remoteHubUpgrader = await getContract("RemoteHubUpgrader");
    let market = await getContract("Market");
    let wrappedXusdToken = await getContract("WrappedXusdToken");
    let portfolioManager = await getContract("PortfolioManager");

    

    await (await roleManager.connect(wallet).grantRole(Roles.PORTFOLIO_AGENT_ROLE, dev5)).wait();
    await (await roleManager.connect(wallet).grantRole(Roles.UNIT_ROLE, dev5)).wait();
    await (await exchange.connect(wallet).grantRole(Roles.PAYOUT_EXECUTOR_ROLE, remoteHub.target)).wait();
    await (await wrappedXusdToken.connect(wallet).grantRole(Roles.DEFAULT_ADMIN_ROLE, dev5)).wait();
    
    await (await exchange.connect(wallet).grantRole(Roles.UPGRADER_ROLE, dev5)).wait();
    await (await market.connect(wallet).grantRole(Roles.UPGRADER_ROLE, dev5)).wait();
    await (await payoutManager.connect(wallet).grantRole(Roles.UPGRADER_ROLE, dev5)).wait();
    await (await portfolioManager.connect(wallet).grantRole(Roles.UPGRADER_ROLE, dev5)).wait();
    await (await remoteHub.connect(wallet).grantRole(Roles.UPGRADER_ROLE, dev5)).wait();
    await (await remoteHubUpgrader.connect(wallet).grantRole(Roles.UPGRADER_ROLE, dev5)).wait();
    await (await roleManager.connect(wallet).grantRole(Roles.UPGRADER_ROLE, dev5)).wait();
    await (await wrappedXusdToken.connect(wallet).grantRole(Roles.UPGRADER_ROLE, dev5)).wait();
    await (await xusdToken.connect(wallet).grantRole(Roles.UPGRADER_ROLE, dev5)).wait();
    await (await remoteHubUpgrader.connect(wallet).setRemoteHub(remoteHub.target)).wait();
    await (await exchange.connect(wallet).setRemoteHub(remoteHub.target)).wait();
    await (await market.connect(wallet).setRemoteHub(remoteHub.target)).wait();
    await (await portfolioManager.connect(wallet).setRemoteHub(remoteHub.target)).wait();
    await (await xusdToken.connect(wallet).setRemoteHub(remoteHub.target)).wait();
    await (await wrappedXusdToken.connect(wallet).setRemoteHub(remoteHub.target)).wait();
    await (await payoutManager.connect(wallet).setRemoteHub(remoteHub.target)).wait();
    
    await (await remoteHub.addChainItem({
        chainSelector: bscConfig.chainSelector,
        xusd: xusdToken.target,
        exchange: exchange.target,
        payoutManager: payoutManager.target,
        roleManager: roleManager.target,
        remoteHub: remoteHub.target,
        remoteHubUpgrader: remoteHubUpgrader.target,
        market: market.target,
        wxusd: wrappedXusdToken.target,
        ccipPool: bscConfig.ccipPool
    })).wait();

    // info about arb
    await (await remoteHub.addChainItem({
        chainSelector: arbConfig.chainSelector,
        xusd: arbConfig.xusdToken,
        exchange: arbConfig.exchange,
        payoutManager: arbConfig.payoutManager,
        roleManager: arbConfig.roleManager,
        remoteHub: arbConfig.remoteHub,
        remoteHubUpgrader: arbConfig.remoteHubUpgrader,
        market: arbConfig.market,
        wxusd: arbConfig.wrappedXusdToken,
        ccipPool: arbConfig.ccipPool
    })).wait();

    // info about op
    await (await remoteHub.addChainItem({
        chainSelector: opConfig.chainSelector,
        xusd: opConfig.xusdToken,
        exchange: opConfig.exchange,
        payoutManager: opConfig.payoutManager,
        roleManager: opConfig.roleManager,
        remoteHub: opConfig.remoteHub,
        remoteHubUpgrader: opConfig.remoteHubUpgrader,
        market: opConfig.market,
        wxusd: opConfig.wrappedXusdToken,
        ccipPool: opConfig.ccipPool
    })).wait();    

    await (await remoteHub.allowlistDestinationChain(bscConfig.chainSelector, true)).wait();
    await (await remoteHubUpgrader.allowlistDestinationChain(bscConfig.chainSelector, true)).wait();
    await (await remoteHub.allowlistSourceChain(bscConfig.chainSelector, true)).wait();
    await (await remoteHubUpgrader.allowlistSourceChain(bscConfig.chainSelector, true)).wait();
    await (await remoteHub.allowlistSender(remoteHub.target, true)).wait();
    await (await remoteHub.allowlistSender(remoteHubUpgrader.target, true)).wait();
    await (await remoteHubUpgrader.allowlistSender(remoteHub.target, true)).wait();
    await (await remoteHubUpgrader.allowlistSender(remoteHubUpgrader.target, true)).wait();
    
    //for arbitrum 
    await (await remoteHub.allowlistDestinationChain(arbConfig.chainSelector, true)).wait();
    await (await remoteHubUpgrader.allowlistDestinationChain(arbConfig.chainSelector, true)).wait();
    await (await remoteHub.allowlistSourceChain(arbConfig.chainSelector, true)).wait();
    await (await remoteHubUpgrader.allowlistSourceChain(arbConfig.chainSelector, true)).wait();
    await (await remoteHub.allowlistSender(arbConfig.remoteHub, true)).wait();
    await (await remoteHub.allowlistSender(arbConfig.remoteHubUpgrader, true)).wait();
    await (await remoteHubUpgrader.allowlistSender(arbConfig.remoteHub, true)).wait();
    await (await remoteHubUpgrader.allowlistSender(arbConfig.remoteHubUpgrader, true)).wait();
    
    //for optimism
    await (await remoteHub.allowlistDestinationChain(opConfig.chainSelector, true)).wait();
    await (await remoteHubUpgrader.allowlistDestinationChain(opConfig.chainSelector, true)).wait();
    await (await remoteHub.allowlistSourceChain(opConfig.chainSelector, true)).wait();
    await (await remoteHubUpgrader.allowlistSourceChain(opConfig.chainSelector, true)).wait();
    await (await remoteHub.allowlistSender(opConfig.remoteHub, true)).wait();
    await (await remoteHub.allowlistSender(opConfig.remoteHubUpgrader, true)).wait();
    await (await remoteHubUpgrader.allowlistSender(opConfig.remoteHub, true)).wait();
    await (await remoteHubUpgrader.allowlistSender(opConfig.remoteHubUpgrader, true)).wait();
        
}

async function deployContract(params: any): Promise<any> {

    const contractFactory = await ethers.getContractFactory(params.name, params.initParams);

    let proxy;
    try {
        proxy = await getContract(params.name);
        // await upgrades.forceImport(proxy.target, contractFactory, {
        //     kind: 'uups',
        //     unsafeAllow: params.unsafeAllow,
        //     constructorArgs: params.contrParams
        // });
        console.log("Proxy address found: ", proxy.target);
    } catch (error) {
        console.log("Error getting contract: ", error);

        let proxy = await upgrades.deployProxy(contractFactory, params.initParams, {
            kind: 'uups',
            unsafeAllow: params.unsafeAllow,
            constructorArgs: params.contrParams
        });
        console.log("Proxy address created: ", proxy.target);
    }

    
    await new Promise(resolve => setTimeout(resolve, 10000));

    await upgrades.upgradeProxy(proxy, contractFactory, {
        kind: 'uups',
        unsafeAllow: params.unsafeAllow,
        constructorArgs: params.contrParams,
        redeployImplementation: 'always'
    });
    
    console.log("Upgraded proxy address: ", proxy.target);

    await new Promise(resolve => setTimeout(resolve, 10000));

    let impl = await getImplementationAddress(ethers.provider, proxy.target);
    console.log("Implementation address: ", impl);
    
    let artifact  = await hre.artifacts.readArtifact(params.name);
    artifact.implementation = impl;
    let proxyDeployments = {
        address: proxy.target,
        ...artifact
    };

    let newname = 'deployments/' + networkName + '/' + params.name + '.json';
    console.log(newname);
    fs.writeFileSync(newname, JSON.stringify(proxyDeployments, "", 2))
}



// Run the script with proper error handling
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});