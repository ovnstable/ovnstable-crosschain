import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ethers, network, upgrades } from "hardhat";
const hre = require("hardhat");
const { getImplementationAddress } = require('@openzeppelin/upgrades-core');
const sampleModule = require('@openzeppelin/hardhat-upgrades/dist/utils/deploy-impl');
import { getEvm2EvmMessage, requestLinkFromTheFaucet, routeMessage } from "@chainlink/local/scripts/CCIPLocalSimulatorFork";
const path = require('path');
const fs = require('fs');
import { keccak256 } from 'ethereumjs-util';
import { bufferToHex } from 'ethereumjs-util';
import { boolean } from 'hardhat/internal/core/params/argumentTypes';
import { Contract } from 'hardhat/internal/hardhat-network/stack-traces/model';
const { expect } = require("chai");
const  dotenv  = require('dotenv');
dotenv.config({ path: __dirname + '/../.env' });

// 1st Terminal: npx hardhat node2 --src arbitrum --dest optimism
// 2nd Terminal: npx hardhat run ./scripts/test.ts --network localhost

class Roles {

    static get PORTFOLIO_AGENT_ROLE() { return '0xd67ad422505496469a1adf6cdf9e5ee92ac5d33992843c9ecc4b2f6d6cde9137'; }
    static get UNIT_ROLE() { return '0xede8101501d89b9894e78e4f219420b6ddb840e8e75dde35741a0745408476d7'; }
    static get DEFAULT_ADMIN_ROLE() { return '0x0000000000000000000000000000000000000000000000000000000000000000'; }
    static get UPGRADER_ROLE() { return '0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3'; }
    static get EXCHANGER() { return '0x3eb675f159e6ca6cf5de6bfbbc8c4521cfd428f5e9166e51094d5898504caf2d'; }
}

type Contracts = {
    remoteHub: any;
    remoteHubUpgrader: any;
    exchange: any;
    market: any;
    roleManager: any;
    portfolioManager: any;
    xusdToken: any;
    wrappedXusdToken: any;
    payoutManager: any;
    test: {
        marketTestImpl: any;
        remoteHubTestImpl: any;
        remoteHubUpgraderTestImpl: any;
    }
}

type ThreeContracts = [Contracts | undefined, Contracts | undefined, Contracts | undefined];

let contracts: ThreeContracts = [undefined, undefined, undefined];

const chain = [
    {
        NAME: "ARBITRUM",
        RPC_URL: process.env.ARBITRUM_RPC,
        BLOCK_NUMBER: 249265030, //248538793, // payout: 226076577 
        ccipRouterAddress: "0x141fa059441E0ca23ce184B6A78bafD2A517DdE8",
        chainSelector: 4949039107694359620n,
        ccipPool: "0x86d99f9b22052645eA076cd16da091b9E87fB6d6",
        liqIndex: ""
    },
    {
        NAME: "OPTIMISM",
        RPC_URL: process.env.OPTIMISM_RPC,
        BLOCK_NUMBER: 124835124,
        ccipRouterAddress: "0x3206695CaE29952f4b0c22a169725a865bc8Ce0f",
        chainSelector: 3734403246176062136n,
        ccipPool: "0xe660606961DF8855E589d59795FAe4b0ecD41FD3",
        liqIndex: ""
    },
    {
        NAME: "ETHEREUM",
        RPC_URL: process.env.ETHEREUM_RPC,
        BLOCK_NUMBER: 20661968,
        ccipRouterAddress: "0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D",
        chainSelector: 5009297550715157269n,
        ccipPool: "0xd72F7010f0Fa621aB0869e61e9bb4e3cC887c66c",
        liqIndex: ""
    }
    // {
    //     NAME: "BASE",
    //     RPC_URL: process.env.BASE_RPC,
    //     BLOCK_NUMBER: 18815183,
    //     ccipRouterAddress: "0x881e3A65B4d4a04dD529061dd0071cf975F58bCD",
    //     chainSelector: 15971525489660198786n,
    //     ccipPool: "0xd54fE63Dbd928cA9BB89DB502F939DE673518EB7",
    //     liqIndex: ""
    // }
]

enum ChainType {
    SOURCE = 0,
    DESTINATION = 1,
    DESTINATION2 = 2
}

const textToSend = `Hello World`;

let timelock = "0xa44dF8A8581C2cb536234E6640112fFf932ED2c4";
let dev1 = "0x66B439c0a695cc3Ed3d9f50aA4E6D2D917659FfD";
let dev4 = "0xcd8562CD85fD93C7e2E80B4Cf69097E5562a76f9";
let ganache = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
let unit = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";
let rewardWallet = "0x9030D5C596d636eEFC8f0ad7b2788AE7E9ef3D46";
let usdpRich = "0x036b8593b217ceaA9A2B46ca52d3Dc2bAFAA29AB";

function fromDir(startPath:any, filter:any) {

    if (!fs.existsSync(startPath)) {
        console.log("no dir ", startPath);
        return;
    }

    let files = fs.readdirSync(startPath);
    for (let i = 0; i < files.length; i++) {
        let filename = path.join(startPath, files[i]);
        let stat = fs.lstatSync(filename);
        if (stat.isDirectory()) {
            let value:any = fromDir(filename, filter);
            if (value)
                return value;

        } else if (filename.endsWith(filter)) {
            return filename;
        }
    }
}

async function getContract(name:string, networkName:string) {

    // networkName = networkName.toLowerCase();

    try {
        let searchPath = fromDir(require('app-root-path').path, path.join(networkName, name + ".json"));
        if (searchPath === undefined) {
            throw new Error("");
        }
        let contractJson = JSON.parse(fs.readFileSync(searchPath));
        return await ethers.getContractAt(contractJson.abi, contractJson.address);
    } catch (e:any) {
    }
}

async function transferETH(amount:any, to:any) {
    let privateKey = "0xea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0"; // Ganache key
    const signer = new ethers.Wallet(privateKey, ethers.provider);

    await signer.sendTransaction({
        to: to,
        value: ethers.parseEther(amount + "")
    });
}

async function deployOrUpgrade(contractName:any, initParams:any, contrParams:any, unsafeAllow:any, networkName:string, imper:string) {

    const contractFactory = await ethers.getContractFactory(contractName, initParams);
    networkName = networkName === "ARBITRUM" ? "_S" : (networkName === "OPTIMISM" ? "_D1" : "_D2");

    let proxy;
    try {
        proxy = await getContract(contractName, networkName);
    } catch (e) {
    }

    if (!proxy) {
        // console.log(`Deploy new Proxy and Impl for ${contractName}`)
        proxy = await upgrades.deployProxy(contractFactory, initParams, {
            kind: 'uups',
            unsafeAllow: unsafeAllow,
            constructorArgs: contrParams
        });
        await upgrades.upgradeProxy(proxy, contractFactory, {
            kind: 'uups',
            unsafeAllow: unsafeAllow,
            constructorArgs: contrParams
        });
        // await proxy.waitForDeployment();
        
        let impl = await getImplementationAddress(ethers.provider, proxy.target);
        // console.log("New Proxy: " + proxy.target + ", New Impl " + impl);
        // console.log(contractName + " on " + networkName.toLocaleLowerCase() + " is deployed");
        // console.log("------------------");

        // let artifact  = await hre.artifacts.readArtifact(contractName);
        // artifact.implementation = impl;
        // let proxyDeployments = {
        //         address: proxy.target,
        //         ...artifact
        //     }
        
        // let newname = 'deployments/' + networkName + '/' + contractName + '.json';
        // console.log(newname);
        // fs.writeFileSync(newname, JSON.stringify(proxyDeployments, "", 2))
        return proxy;
    }
    
    let oldImpl = await getImplementationAddress(ethers.provider, proxy.target);
    // console.log("Old Proxy: " + proxy.target + ", Old Impl " + oldImpl);

    let newImpl = await upgrades.deployImplementation(contractFactory, {
        kind: 'uups',
        unsafeAllow: unsafeAllow,
        constructorArgs: contrParams
    });

    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [imper],
    });

    const timelockAccount = await ethers.getSigner(imper);
    await transferETH(10, imper);
    await proxy.connect(timelockAccount).upgradeTo(newImpl);
    
    let new2Impl = await getImplementationAddress(ethers.provider, proxy.target);
    // console.log("New Proxy: " + proxy.target + ", New Impl " + new2Impl);

    // console.log(contractName + " on " + networkName.toLocaleLowerCase() + " is deployed");
    // console.log("------------------");

    return proxy;
}

async function moveRules(contract:any, oldAddress:any, newAddress:any) {

    let signer = await ethers.getSigner(oldAddress);
    let hasUpgradeRole = true;

    try {
        await contract.UPGRADER_ROLE();
    } catch (e) {
        hasUpgradeRole = false;
    }

    await (await contract.connect(signer).grantRole(Roles.DEFAULT_ADMIN_ROLE, newAddress)).wait();

    if (hasUpgradeRole) {
        await (await contract.connect(signer).grantRole(Roles.UPGRADER_ROLE, newAddress)).wait();
    }

    if (hasUpgradeRole) {
        if (await contract.hasRole(Roles.UPGRADER_ROLE, newAddress)){
            await (await contract.connect(signer).revokeRole(Roles.UPGRADER_ROLE, oldAddress)).wait();
        } else {
            throw new Error(`${newAddress} not has UPGRADER_ROLE`);
        }
    }

    if (await contract.hasRole(Roles.DEFAULT_ADMIN_ROLE, newAddress)){
        await (await contract.connect(signer).revokeRole(Roles.DEFAULT_ADMIN_ROLE, oldAddress)).wait();
    } else {
        throw new Error(`${newAddress} not has DEFAULT_ADMIN_ROLE`);
    }
}

async function initDeploySet(chainType: ChainType) {

    await network.provider.request({
        method: "hardhat_reset",
        params: [{
            forking: {
                jsonRpcUrl: chain[chainType].RPC_URL,
                blockNumber: chain[chainType].BLOCK_NUMBER
            },
            // hardfork: "london"
        }],
    });

    let timelockSigner = await ethers.getSigner(timelock);
    let dev1Signer = await ethers.getSigner(dev1);
    let dev4Signer = await ethers.getSigner(dev4);
    let ganacheSigner = await ethers.getSigner(ganache);
    let signer = chainType == ChainType.SOURCE ? timelockSigner : ganacheSigner;
    let signer1 = chainType == ChainType.SOURCE ? dev1Signer : ganacheSigner;
    let signer2 = ganacheSigner;
    let signer3 = chainType == ChainType.SOURCE ? timelockSigner : dev4Signer;
    

    let richSigner = await ethers.getSigner(usdpRich);

    // deploy all contracts (or redeploy)
    let remoteHub = await deployOrUpgrade("RemoteHub", [chain[chainType].chainSelector], [chain[chainType].ccipRouterAddress], ['constructor', 'state-variable-immutable'], chain[chainType].NAME, ganache);
    let remoteHubUpgrader = await deployOrUpgrade("RemoteHubUpgrader", [], [chain[chainType].ccipRouterAddress, remoteHub.target], ['constructor', 'state-variable-immutable'], chain[chainType].NAME, ganache);
    let exchange = await deployOrUpgrade(chainType == ChainType.SOURCE ? "ExchangeMother" : "ExchangeChild", [remoteHub.target], [], [], chain[chainType].NAME, timelock);
    let market = await deployOrUpgrade("Market", [ganache], [], [], chain[chainType].NAME, timelock);
    let roleManager = await deployOrUpgrade("RoleManager", [], [], [], chain[chainType].NAME, timelock);
    let portfolioManager = await deployOrUpgrade("PortfolioManager", [], [], [], chain[chainType].NAME, timelock);
    let xusdToken = await deployOrUpgrade("XusdToken", ["xUSD", "xUSD", 6, remoteHub.target], [], [], chain[chainType].NAME, timelock);
    let wrappedXusdToken = await deployOrUpgrade("WrappedXusdToken", ["Wrapped xUSD", "wxUSD", 6, remoteHub.target], [], [], chain[chainType].NAME, chainType == ChainType.SOURCE ? timelock : dev4);    
    let payoutManager = await deployOrUpgrade(chainType == ChainType.SOURCE ? "ArbitrumPayoutManager" : "OptimismPayoutManager", [remoteHub.target, rewardWallet], [], [], chain[chainType].NAME, dev1); 
    
    // write all setRemoteHub
    await remoteHubUpgrader.connect(signer2).setRemoteHub(remoteHub.target);
    await exchange.connect(signer).setRemoteHub(remoteHub.target);
    await market.connect(signer).setRemoteHub(remoteHub.target);
    await portfolioManager.connect(signer).setRemoteHub(remoteHub.target);
    await xusdToken.connect(signer).setRemoteHub(remoteHub.target);
    await wrappedXusdToken.connect(signer3).setRemoteHub(remoteHub.target);
    await payoutManager.connect(signer1).setRemoteHub(remoteHub.target);

    await remoteHub.addChainItem({
        chainSelector: chain[chainType].chainSelector,
        xusd: xusdToken.target,
        exchange: exchange.target,
        payoutManager: payoutManager.target,
        roleManager: roleManager.target,
        remoteHub: remoteHub.target,
        remoteHubUpgrader: remoteHubUpgrader.target,
        market: market.target,
        wxusd: wrappedXusdToken.target,
        ccipPool: chain[chainType].ccipPool
    });

    if (chainType == ChainType.SOURCE) {

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [usdpRich],
          }); 

        await exchange.afterRedeploy();
        await portfolioManager.afterRedeploy();
        await xusdToken.afterRedeploy(0);
        await wrappedXusdToken.afterRedeploy(remoteHub.target);
        await xusdToken.connect(richSigner).approve(wrappedXusdToken.target, 10000000000);
        await wrappedXusdToken.connect(signer3).getMoney(richSigner, chain[ChainType.SOURCE].ccipPool, 1000000000); // return for transfer, delete for payout
        chain[chainType].liqIndex = await xusdToken.rebasingCreditsPerTokenHighres();
    } else {
        await xusdToken.afterRedeploy(chain[0].liqIndex);
        await xusdToken.connect(signer3).mint2(wrappedXusdToken.target, 1000000000000);
    }

    for (let i = 0; i < contracts.length; i++) {
        if (contracts[i] === undefined || i === chainType) {
            continue;
        }

        await remoteHub.allowlistDestinationChain(chain[i].chainSelector, true);
        await remoteHubUpgrader.allowlistDestinationChain(chain[i].chainSelector, true);
        await remoteHub.allowlistSourceChain(chain[i].chainSelector, true);
        await remoteHubUpgrader.allowlistSourceChain(chain[i].chainSelector, true);

        await remoteHub.allowlistSender(contracts[i].remoteHub.target, true);
        await remoteHubUpgrader.allowlistSender(contracts[i].remoteHubUpgrader.target, true);

        await remoteHub.addChainItem({
            chainSelector: chain[i].chainSelector,
            xusd: contracts[i].xusdToken.target,
            exchange: contracts[i].exchange.target,
            payoutManager: contracts[i].payoutManager.target,
            roleManager: contracts[i].roleManager.target,
            remoteHub: contracts[i].remoteHub.target,
            remoteHubUpgrader: contracts[i].remoteHubUpgrader.target,
            market: contracts[i].market.target,
            wxusd: contracts[i].wrappedXusdToken.target,
            ccipPool: chain[i].ccipPool
        });
    }

    // write all roles
    await roleManager.connect(signer).grantRole(Roles.PORTFOLIO_AGENT_ROLE, signer);
    await roleManager.connect(signer).grantRole(Roles.UNIT_ROLE, unit);
    await moveRules(remoteHub, signer2.address, chainType == ChainType.SOURCE ? timelock : remoteHubUpgrader.target);
    await moveRules(remoteHubUpgrader, signer2.address, remoteHub.target);
    await moveRules(exchange, signer.address, remoteHub.target);
    await moveRules(market, signer.address, remoteHub.target);
    await moveRules(roleManager, signer.address, remoteHub.target);
    await moveRules(xusdToken, signer.address, remoteHub.target);
    await moveRules(wrappedXusdToken, signer3.address, remoteHub.target);
    await moveRules(payoutManager, signer1.address, remoteHub.target);

    let marketTestImpl = await upgrades.deployImplementation(await ethers.getContractFactory("MarketTest", []), {
        kind: 'uups',
        unsafeAllow: [],
        constructorArgs: []
    });

    let remoteHubTestImpl = await upgrades.deployImplementation(await ethers.getContractFactory("RemoteHubTest", [chain[chainType].chainSelector]), {
        kind: 'uups',
        unsafeAllow: ['constructor', 'state-variable-immutable'],
        constructorArgs: [chain[chainType].ccipRouterAddress]
    });

    let remoteHubUpgraderTestImpl = await upgrades.deployImplementation(await ethers.getContractFactory("RemoteHubUpgraderTest", []), {
        kind: 'uups',
        unsafeAllow: ['constructor', 'state-variable-immutable'],
        constructorArgs: [chain[chainType].ccipRouterAddress, remoteHub.target]
    });

    const returnContracts: Contracts = {
        remoteHub: remoteHub,
        remoteHubUpgrader: remoteHubUpgrader,
        exchange: exchange,
        market: market,
        roleManager: roleManager,
        portfolioManager: portfolioManager,
        xusdToken: xusdToken,
        wrappedXusdToken: wrappedXusdToken,
        payoutManager: payoutManager,
        test: {
            marketTestImpl: marketTestImpl,
            remoteHubTestImpl: remoteHubTestImpl,
            remoteHubUpgraderTestImpl: remoteHubUpgraderTestImpl
        }
    }

    contracts[chainType] = returnContracts;
}

async function applyMessage(_to: ChainType, multichainCallItems: any, iter: any) {

    await initDeploySet(ChainType.SOURCE);
    const tx = await contracts[ChainType.SOURCE].remoteHub.connect(await ethers.getSigner(timelock)).multichainCall(multichainCallItems, { value: "1000000000000000000" });

    // console.log("Transaction hash: ", tx.hash);
    const receipt = await tx.wait();
    if (!receipt) return;
    const evm2EvmMessage = getEvm2EvmMessage(receipt, iter);
    if (!evm2EvmMessage) return;
    // console.log(evm2EvmMessage);
    
    await initDeploySet(_to);
    
    // console.log(_to, evm2EvmMessage);
    await routeMessage(chain[_to].ccipRouterAddress, evm2EvmMessage);
}

async function multichainCallLocal(S: Contracts, D: Contracts, multichainCallItems: any) {

    // await initDeploySet(ChainType.SOURCE);
    const tx = await S.remoteHub.connect(await ethers.getSigner(timelock)).multichainCall(multichainCallItems, { value: "1000000000000000000" });
}

async function upgradeRemoteHub(S: Contracts, D: Contracts, _chainSelector: any, newImplementation: any) {

    await initDeploySet(ChainType.SOURCE);
    const tx = await S.remoteHubUpgrader.connect(await ethers.getSigner(timelock)).upgradeRemoteHub(_chainSelector, newImplementation, { value: "1000000000000000000" });
    // console.log("Transaction hash: ", tx.hash);
    const receipt = await tx.wait();
    if (!receipt) return;
    const evm2EvmMessage = getEvm2EvmMessage(receipt);
    if (!evm2EvmMessage) return;
    // console.log(evm2EvmMessage);

    await initDeploySet(ChainType.DESTINATION);

    await routeMessage(chain[ChainType.DESTINATION].ccipRouterAddress, evm2EvmMessage);
}

async function upgradeRemoteHubLocal(S: Contracts, D: Contracts, newImplementation: any) {
    await initDeploySet(ChainType.SOURCE);
    const tx = await S.remoteHub.connect(await ethers.getSigner(timelock)).upgradeTo(newImplementation);
}

function getEmptyOdosData() {

    let zeroAddress = "0x0000000000000000000000000000000000000000";
    let odosEmptyData = {
        inputTokenAddress: zeroAddress,
        outputTokenAddress: zeroAddress,
        amountIn: 0,
        data: ethers.encodeBytes32String("")
    }

    return odosEmptyData;
}

async function applyPayout(_to: ChainType, iter: any) {

    await initDeploySet(ChainType.SOURCE);

    const tx = await contracts[ChainType.SOURCE].exchange.connect(await ethers.getSigner(unit)).payout(false, getEmptyOdosData(), { value: "1000000000000000000" });
    // console.log("Transaction hash: ", tx.hash);
    const receipt = await tx.wait();
    if (!receipt) return;
    const evm2EvmMessage = getEvm2EvmMessage(receipt, iter);
    if (!evm2EvmMessage) return;
    // console.log(evm2EvmMessage);

    await initDeploySet(_to);

    await routeMessage(chain[_to].ccipRouterAddress, evm2EvmMessage);    
}

async function initAllAddresses() {
    await upgrades.silenceWarnings();
    await initDeploySet(ChainType.SOURCE);
    await initDeploySet(ChainType.DESTINATION);
    await initDeploySet(ChainType.DESTINATION2);
    await initDeploySet(ChainType.DESTINATION);
    await initDeploySet(ChainType.SOURCE);
}

function encodeWithSignature(signature: string, params: any[]): string {
    const funcName = signature.split('(')[0];
    const ifaceERC20 = new ethers.Interface(["function "+ signature])
    let tokenApproveCall = ifaceERC20.encodeFunctionData(funcName, params)
    return tokenApproveCall;
}

// set admin param to child from mother (market)
async function setParamTest(_to: ChainType, _to2: ChainType) {

    await initDeploySet(_to);
    const before = await contracts[_to].market.usdcToken();
    console.log(`usdcToken before:`, before);

    await initDeploySet(_to2);
    const before2 = await contracts[_to2].market.usdcToken();
    console.log(`usdcToken before:`, before2);

    await initDeploySet(ChainType.SOURCE);

    const signature = 'setToken(address)';
    const params1 = ['0xda10009cbd5d07dd0cecc66161fc93d7c9000da1'];
    const params2 = ['0xda10009cbd5d07dd0cecc66161fc93d7c9000da2'];
    const encoded1 = encodeWithSignature(signature, params1);
    const encoded2 = encodeWithSignature(signature, params2);

    let multichainCallItems = [{
        chainSelector: chain[_to].chainSelector,
        receiver: contracts[_to].remoteHub.target,
        token: "0x0000000000000000000000000000000000000000",
        amount: 0,
        batchData: [{
            executor: contracts[_to].market.target,
            data: encoded1
        }]
    },
    {
        chainSelector: chain[_to2].chainSelector,
        receiver: contracts[_to2].remoteHub.target,
        token: "0x0000000000000000000000000000000000000000",
        amount: 0,
        batchData: [{
            executor: contracts[_to2].market.target,
            data: encoded2
        }]
    }   
    ]

    await applyMessage(_to, multichainCallItems, 0);

    const after = await contracts[_to].market.usdcToken();
    console.log(`usdcToken after:`, after);

    await applyMessage(_to2, multichainCallItems, 1);

    const after2 = await contracts[_to2].market.usdcToken();
    console.log(`usdcToken after:`, after2);
}

async function payoutTest(_to: ChainType, _to2: ChainType) {

    await initDeploySet(_to);
    const before = await contracts[_to].xusdToken.totalSupply();
    console.log(`totalSupply before:`, before);

    await initDeploySet(_to2);
    const before2 = await contracts[_to2].xusdToken.totalSupply();
    console.log(`totalSupply before:`, before2);

    await applyPayout(_to, 0);
    
    const after = await contracts[_to].xusdToken.totalSupply();
    console.log(`totalSupply after:`, after);

    await applyPayout(_to2, 1);
    
    const after2 = await contracts[_to2].xusdToken.totalSupply();
    console.log(`totalSupply after:`, after2);
}

async function makeUpgradeToData(newImpl: string, receiver: string, executor: string, chainType: ChainType) {
    const signature = 'upgradeTo(address)';
    const params = [newImpl];
    const encoded = encodeWithSignature(signature, params);

    let multichainCallItems = [{
        chainSelector: chain[chainType].chainSelector,
        receiver: receiver,
        token: "0x0000000000000000000000000000000000000000",
        amount: 0,
        batchData: [{
            executor: executor,
            data: encoded
        }]
    }]

    return multichainCallItems;
}

async function upgradeTest(contractName: string, type: string): Promise<boolean> {

    let S = contracts[ChainType.SOURCE];
    let D = contracts[ChainType.DESTINATION];

    if (type === "remote") {
        if (contractName === "RemoteHub") {
            await upgradeRemoteHub(S, D, chain[ChainType.DESTINATION].chainSelector, D.test.remoteHubTestImpl);
            return await D.remoteHub.checkUpgrading();
        } else if (contractName === "RemoteHubUpgrader") {
            let multichainCallItems = await makeUpgradeToData(D.test.remoteHubUpgraderTestImpl, D.remoteHub.target, D.remoteHubUpgrader.target, ChainType.DESTINATION);
            await applyMessage(ChainType.DESTINATION, multichainCallItems, 0);
            return await D.remoteHubUpgrader.checkUpgrading();
        } else {
            let multichainCallItems = await makeUpgradeToData(D.test.marketTestImpl, D.remoteHub.target, D.market.target, ChainType.DESTINATION);
            await applyMessage(ChainType.DESTINATION, multichainCallItems, 0);
            return await D.market.checkUpgrading();
        }
    } else {
        if (contractName === "RemoteHub") {
            await upgradeRemoteHubLocal(S, D, S.test.remoteHubTestImpl);
            return await S.remoteHub.checkUpgrading();
        } else if (contractName === "RemoteHubUpgrader") {
            let multichainCallItems = await makeUpgradeToData(S.test.remoteHubUpgraderTestImpl, S.remoteHub.target, S.remoteHubUpgrader.target, ChainType.SOURCE);
            await multichainCallLocal(S, D, multichainCallItems);
            return await S.remoteHubUpgrader.checkUpgrading();
        } else {
            let multichainCallItems = await makeUpgradeToData(S.test.marketTestImpl, S.remoteHub.target, S.market.target, ChainType.SOURCE);
            await multichainCallLocal(S, D, multichainCallItems);
            return await S.market.checkUpgrading();
        }
    }
}

async function transferTest(_from: ChainType, _to: ChainType): Promise<boolean> {
    
    await initDeploySet(_from);
    let A = contracts[_from];
    let B = contracts[_to];

    let direct: boolean = _from === ChainType.SOURCE;

    let sender = direct ? timelock : "0xcd8562CD85fD93C7e2E80B4Cf69097E5562a76f9";
    let receiver = "0x086dFe298907DFf27BD593BD85208D57e0155c94";
    let onexUsd = "1000000";

    let signer = await ethers.getSigner(sender);
    await A.xusdToken.mint2(signer.address, onexUsd);

    console.log("balanceBefore", (await A.xusdToken.balanceOf(sender)).toString());

    await A.xusdToken.connect(signer).approve(A.remoteHub.target, onexUsd);

    const tx = await A.remoteHub.connect(signer).crossTransfer(receiver, onexUsd, chain[_to].chainSelector, { value: "1000000000000000000" });
    
    const receipt = await tx.wait();
    // if (!receipt) return;
    const evm2EvmMessage = getEvm2EvmMessage(receipt);
    // if (!evm2EvmMessage) return; 

    await initDeploySet(_to);
    await transferETH(10, timelock);
    
    await routeMessage(chain[_to].ccipRouterAddress, evm2EvmMessage);

    console.log("balanceAfter", (await B.xusdToken.balanceOf(receiver)).toString());

    return true;
}

async function main() {

    await initAllAddresses();

    await setParamTest(ChainType.DESTINATION, ChainType.DESTINATION2);
    // await payoutTest(ChainType.DESTINATION, ChainType.DESTINATION2);
    
    // expect(await upgradeTest("Market", "remote")).to.equal(true);
    // expect(await upgradeTest("RemoteHub", "remote")).to.equal(true);
    // expect(await upgradeTest("RemoteHubUpgrader", "remote")).to.equal(true);

    // expect(await upgradeTest("Market", "local")).to.equal(true);
    // expect(await upgradeTest("RemoteHub", "local")).to.equal(true);
    // expect(await upgradeTest("RemoteHubUpgrader", "local")).to.equal(true);

    // expect(await transferTest(ChainType.SOURCE, ChainType.DESTINATION)).to.equal(true);
    // expect(await transferTest(ChainType.DESTINATION, ChainType.SOURCE)).to.equal(true);
    // expect(await transferTest(ChainType.DESTINATION, ChainType.DESTINATION2)).to.equal(true);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});