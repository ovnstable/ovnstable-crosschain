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
    usdxToken: any;
    wrappedUsdxToken: any;
    payoutManager: any;
    test: {
        marketTestImpl: any;
        remoteHubTestImpl: any;
        remoteHubUpgraderTestImpl: any;
    }
}

type ThreeContracts = [Contracts | undefined, Contracts | undefined, Contracts | undefined];

function createDefault(): Contracts {
    return { 
        remoteHub: undefined,
        remoteHubUpgrader: undefined,
        exchange: undefined,
        market: undefined,
        roleManager: undefined,
        portfolioManager: undefined,
        usdxToken: undefined,
        wrappedUsdxToken: undefined,
        payoutManager: undefined,
        test: {
            marketTestImpl: undefined,
            remoteHubTestImpl: undefined,
            remoteHubUpgraderTestImpl: undefined
        }
    };
}

let contracts: ThreeContracts = [undefined, undefined, undefined];

const chain = [
    {
        NAME: "ARBITRUM",
        RPC_URL: process.env.ARBITRUM_RPC,
        BLOCK_NUMBER: 245993109,//226076577,
        ccipRouterAddress: "0x141fa059441E0ca23ce184B6A78bafD2A517DdE8",
        chainSelector: 4949039107694359620n,
        ccipPool: "0x86d99f9b22052645eA076cd16da091b9E87fB6d6",
        liqIndex: ""
    },
    {
        NAME: "OPTIMISM",
        RPC_URL: process.env.OPTIMISM_RPC,
        BLOCK_NUMBER: 124424499,// 121937222,
        ccipRouterAddress: "0x3206695CaE29952f4b0c22a169725a865bc8Ce0f",
        chainSelector: 3734403246176062136n,
        ccipPool: "0xe660606961DF8855E589d59795FAe4b0ecD41FD3",
        liqIndex: ""
    },
    {
        NAME: "ETHEREUM",
        RPC_URL: process.env.ETHEREUM_RPC,
        BLOCK_NUMBER: 20593925,
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
// let S: Contracts, D: Contracts, D2: Contracts;

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
        // console.log(searchPath);
        let contractJson = JSON.parse(fs.readFileSync(searchPath));
        return await ethers.getContractAt(contractJson.abi, contractJson.address);
    } catch (e:any) {
        // console.error(`Error: Could not find a contract named [${name}] in network: [${networkName}]`);
        // throw new Error(e);
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

    // console.log(`Move ${contract.target}: oldAddress: ${oldAddress} => newAddress: ${newAddress}`);

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
        }else {
            throw new Error(`${newAddress} not has UPGRADER_ROLE`);
        }

    }

    if (await contract.hasRole(Roles.DEFAULT_ADMIN_ROLE, newAddress)){
        await (await contract.connect(signer).revokeRole(Roles.DEFAULT_ADMIN_ROLE, oldAddress)).wait();
    }else {
        throw new Error(`${newAddress} not has DEFAULT_ADMIN_ROLE`);
    }
}

async function initDeploySet(chainType: ChainType) {

    // console.log("type", chainType);
    await network.provider.request({
        method: "hardhat_reset",
        params: [{
            forking: {
                jsonRpcUrl: chain[chainType].RPC_URL,
                blockNumber: chain[chainType].BLOCK_NUMBER
            },
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
    let remoteHub = await deployOrUpgrade("RemoteHub", [chain[chainType].chainSelector], [chain[chainType].ccipRouterAddress], ['constructor', 'state-variable-immutable'], chain[chainType].NAME, ganache);
    let remoteHubUpgrader = await deployOrUpgrade("RemoteHubUpgrader", [], [chain[chainType].ccipRouterAddress, remoteHub.target], ['constructor', 'state-variable-immutable'], chain[chainType].NAME, ganache);
    await remoteHubUpgrader.connect(signer2).setRemoteHub(remoteHub.target);
    let exchange = await deployOrUpgrade(chainType == ChainType.SOURCE ? "ExchangeMother" : "ExchangeChild", [remoteHub.target], [], [], chain[chainType].NAME, timelock);
    await exchange.connect(signer).setRemoteHub(remoteHub.target);
    let market = await deployOrUpgrade("Market", [ganache], [], [], chain[chainType].NAME, timelock);
    await market.connect(signer).setRemoteHub(remoteHub.target);
    let roleManager = await deployOrUpgrade("RoleManager", [], [], [], chain[chainType].NAME, timelock);
    let portfolioManager = await deployOrUpgrade("PortfolioManager", [], [], [], chain[chainType].NAME, timelock);
    let usdxToken = await deployOrUpgrade("UsdxToken", ["USDx", "USDx", 6, remoteHub.target], [], [], chain[chainType].NAME, timelock);
    await usdxToken.connect(signer).setRemoteHub(remoteHub.target);
    let wrappedUsdxToken = await deployOrUpgrade("WrappedUsdxToken", ["Wrapped USDx", "wUSDx", 6, remoteHub.target], [], [], chain[chainType].NAME, chainType == ChainType.SOURCE ? timelock : dev4);
    await wrappedUsdxToken.connect(signer3).setRemoteHub(remoteHub.target);
    let payoutManager = await deployOrUpgrade(chainType == ChainType.SOURCE ? "ArbitrumPayoutManager" : "OptimismPayoutManager", [remoteHub.target, rewardWallet], [], [], chain[chainType].NAME, dev1); 
    await payoutManager.connect(signer1).setRemoteHub(remoteHub.target);
    if (chainType == ChainType.SOURCE) {
        let liqIndex = await usdxToken.rebasingCreditsPerTokenHighres();
        // console.log("liqIndex", liqIndex.toString());
        chain[chainType].liqIndex = liqIndex;
    }

    await remoteHub.addChainItem({
        chainSelector: chain[chainType].chainSelector,
        usdx: usdxToken.target,
        exchange: exchange.target,
        payoutManager: payoutManager.target,
        roleManager: roleManager.target,
        remoteHub: remoteHub.target,
        remoteHubUpgrader: remoteHubUpgrader.target,
        market: market.target,
        wusdx: wrappedUsdxToken.target,
        ccipPool: chain[chainType].ccipPool
    });

    if (chainType == ChainType.SOURCE) {
        await remoteHub.allowlistDestinationChain(chain[ChainType.DESTINATION].chainSelector, true);
        await remoteHubUpgrader.allowlistDestinationChain(chain[ChainType.DESTINATION].chainSelector, true);
        await remoteHub.allowlistSourceChain(chain[ChainType.DESTINATION].chainSelector, true);
        await remoteHubUpgrader.allowlistSourceChain(chain[ChainType.DESTINATION].chainSelector, true);
        await exchange.renaming();
        await wrappedUsdxToken.connect(signer3).mint2(chain[ChainType.SOURCE].ccipPool, 1000000000000);
    } else {
        await remoteHub.allowlistDestinationChain(chain[ChainType.SOURCE].chainSelector, true);
        await remoteHubUpgrader.allowlistDestinationChain(chain[ChainType.SOURCE].chainSelector, true);
        await remoteHub.allowlistSourceChain(chain[ChainType.SOURCE].chainSelector, true);
        await remoteHubUpgrader.allowlistSourceChain(chain[ChainType.SOURCE].chainSelector, true);
        await usdxToken.renaming(chain[0].liqIndex);
        await usdxToken.connect(signer3).mint2(wrappedUsdxToken.target, 1000000000000);
    }

    let op1, op2;
    let op1c, op2c;
    if (chainType == ChainType.SOURCE) {
        op1 = ChainType.DESTINATION;
        op2 = ChainType.DESTINATION2;
        op1c = contracts[ChainType.DESTINATION];
        op2c = contracts[ChainType.DESTINATION2];
    } else if (chainType == ChainType.DESTINATION) {
        op1 = ChainType.SOURCE;
        op2 = ChainType.DESTINATION2;
        op1c = contracts[ChainType.SOURCE];
        op2c = contracts[ChainType.DESTINATION2];
    } else {
        op1 = ChainType.SOURCE;
        op2 = ChainType.DESTINATION;
        op1c = contracts[ChainType.SOURCE];
        op2c = contracts[ChainType.DESTINATION];
    }

    if (op1c !== undefined) {

        await remoteHub.allowlistSender(op1c.remoteHub.target, true);
        await remoteHubUpgrader.allowlistSender(op1c.remoteHubUpgrader.target, true);

        await remoteHub.addChainItem({
            chainSelector: chain[op1].chainSelector,
            usdx: op1c.usdxToken.target,
            exchange: op1c.exchange.target,
            payoutManager: op1c.payoutManager.target,
            roleManager: op1c.roleManager.target,
            remoteHub: op1c.remoteHub.target,
            remoteHubUpgrader: op1c.remoteHubUpgrader.target,
            market: op1c.market.target,
            wusdx: op1c.wrappedUsdxToken.target,
            ccipPool: chain[op1].ccipPool
        });
    }

    if (op2c !== undefined) {

        await remoteHub.allowlistSender(op2c.remoteHub.target, true);
        await remoteHubUpgrader.allowlistSender(op2c.remoteHubUpgrader.target, true);

        await remoteHub.addChainItem({
            chainSelector: chain[op2].chainSelector,
            usdx: op2c.usdxToken.target,
            exchange: op2c.exchange.target,
            payoutManager: op2c.payoutManager.target,
            roleManager: op2c.roleManager.target,
            remoteHub: op2c.remoteHub.target,
            remoteHubUpgrader: op2c.remoteHubUpgrader.target,
            market: op2c.market.target,
            wusdx: op2c.wrappedUsdxToken.target,
            ccipPool: chain[op2].ccipPool
        });
    }

    await roleManager.connect(signer).grantRole(Roles.PORTFOLIO_AGENT_ROLE, signer);
    await roleManager.connect(signer).grantRole(Roles.UNIT_ROLE, unit);

    await moveRules(remoteHub, signer2.address, chainType == ChainType.SOURCE ? timelock : remoteHubUpgrader.target);
    await moveRules(remoteHubUpgrader, signer2.address, chainType == ChainType.SOURCE ? timelock : remoteHub.target);
    await moveRules(exchange, signer.address, remoteHub.target);
    await moveRules(market, signer.address, remoteHub.target);
    await moveRules(roleManager, signer.address, remoteHub.target);
    await moveRules(usdxToken, signer.address, remoteHub.target);
    await moveRules(wrappedUsdxToken, signer3.address, remoteHub.target);
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
        usdxToken: usdxToken,
        wrappedUsdxToken: wrappedUsdxToken,
        payoutManager: payoutManager,
        test: {
            marketTestImpl: marketTestImpl,
            remoteHubTestImpl: remoteHubTestImpl,
            remoteHubUpgraderTestImpl: remoteHubUpgraderTestImpl
        }
    }

    contracts[chainType] = returnContracts;

    // if (chainType == ChainType.SOURCE) {
    //     let onexUsd = "1000000";
    //     console.log("a", contracts[chainType].usdxToken.target);
    //     await contracts[chainType].usdxToken.mint2(timelock, onexUsd);
    //     console.log("a lol");
    // }
}

async function applyMessage(S: Contracts, D: Contracts, multichainCallItems: any) {

    await initDeploySet(ChainType.SOURCE);

    const tx = await S.remoteHub.connect(await ethers.getSigner(timelock)).multichainCall(multichainCallItems, { value: "1000000000000000000" });
    // console.log("Transaction hash: ", tx.hash);
    const receipt = await tx.wait();
    if (!receipt) return;
    const evm2EvmMessage = getEvm2EvmMessage(receipt);
    if (!evm2EvmMessage) return;
    // console.log(evm2EvmMessage);

    await initDeploySet(ChainType.DESTINATION);

    await routeMessage(chain[ChainType.DESTINATION].ccipRouterAddress, evm2EvmMessage);    
}

async function multichainCallLocal(S: Contracts, D: Contracts, multichainCallItems: any) {

    await initDeploySet(ChainType.SOURCE);
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
    S = await initDeploySet(ChainType.SOURCE);
    const tx = await S.remoteHub.connect(await ethers.getSigner(timelock)).upgradeTo(newImplementation);
}

async function upgradeRemoteHubUpgraderLocal(S: Contracts, D: Contracts, newImplementation: any) {
    S = await initDeploySet(ChainType.SOURCE);
    const tx = await S.remoteHubUpgrader.connect(await ethers.getSigner(timelock)).upgradeTo(newImplementation);
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

async function applyPayout(S: Contracts, D: Contracts) {

    S = await initDeploySet(ChainType.SOURCE);
    const tx = await S.exchange.connect(await ethers.getSigner(unit)).payout(false, getEmptyOdosData(), { value: "1000000000000000000" });
    // console.log("Transaction hash: ", tx.hash);
    const receipt = await tx.wait();
    if (!receipt) return;
    const evm2EvmMessage = getEvm2EvmMessage(receipt);
    if (!evm2EvmMessage) return;
    // console.log(evm2EvmMessage);

    await initDeploySet(ChainType.DESTINATION);

    await routeMessage(chain[ChainType.DESTINATION].ccipRouterAddress, evm2EvmMessage);    
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
async function setParamTest() {
    await initAllAddresses();

    let D = contracts[ChainType.DESTINATION];
    let S = contracts[ChainType.SOURCE];

    const before = await D.market.usdcToken();
    console.log(`usdcToken before:`, before);

    const signature = 'setTokens(address)';
    const params = ['0xda10009cbd5d07dd0cecc66161fc93d7c9000da1'];
    const encoded = encodeWithSignature(signature, params);

    let multichainCallItems = [{
        chainSelector: chain[ChainType.DESTINATION].chainSelector,
        receiver: D.remoteHub.target,
        token: "0x0000000000000000000000000000000000000000",
        amount: 0,
        batchData: [{
            executor: D.market.target,
            data: encoded
        }]
    }]

    await applyMessage(S, D, multichainCallItems);

    const after = await D.market.usdcToken();
    console.log(`usdcToken after:`, after);
}

async function payoutTest() {
    await initAllAddresses();

    let D = contracts[ChainType.DESTINATION];
    let S = contracts[ChainType.SOURCE];

    const before = await D.usdxToken.totalSupply();
    console.log(`totalSupply before:`, before);

    await applyPayout(S, D);
    console.log(D.usdxToken.target);
    const after = await D.usdxToken.totalSupply();
    console.log(`totalSupply after:`, after);
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
    await initAllAddresses();

    let D = contracts[ChainType.DESTINATION];
    let S = contracts[ChainType.SOURCE];

    if (type === "remote") {
        if (contractName === "RemoteHub") {
            await upgradeRemoteHub(S, D, chain[ChainType.DESTINATION].chainSelector, D.test.remoteHubTestImpl);
            return await D.remoteHub.checkUpgrading();
        } else if (contractName === "RemoteHubUpgrader") {
            let multichainCallItems = await makeUpgradeToData(D.test.remoteHubUpgraderTestImpl, D.remoteHub.target, D.remoteHubUpgrader.target, ChainType.DESTINATION);
            await applyMessage(S, D, multichainCallItems);
            return await D.remoteHubUpgrader.checkUpgrading();
        } else {
            let multichainCallItems = await makeUpgradeToData(D.test.marketTestImpl, D.remoteHub.target, D.market.target, ChainType.DESTINATION);
            await applyMessage(S, D, multichainCallItems);
            return await D.market.checkUpgrading();
        }
    } else {
        if (contractName === "RemoteHub") {
            await upgradeRemoteHubLocal(S, D, S.test.remoteHubTestImpl);
            return await S.remoteHub.checkUpgrading();
        } else if (contractName === "RemoteHubUpgrader") {
            await upgradeRemoteHubUpgraderLocal(S, D, S.test.remoteHubUpgraderTestImpl);
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
    // console.log(contracts[_from].usdxToken.target);
    await contracts[_from].usdxToken.mint2(signer.address, onexUsd);
    // await contracts[_from].usdxToken.mint2(timelock, onexUsd);
    // console.log("lol");

    console.log("balanceBefore", (await A.usdxToken.balanceOf(sender)).toString());

    await A.usdxToken.connect(signer).approve(A.remoteHub.target, onexUsd);
    
    const tx = await A.remoteHub.connect(signer).crossTransfer(receiver, onexUsd, chain[direct ? ChainType.DESTINATION : ChainType.SOURCE].chainSelector, { value: "1000000000000000000" });
    
    const receipt = await tx.wait();
    // if (!receipt) return;
    const evm2EvmMessage = getEvm2EvmMessage(receipt);
    // if (!evm2EvmMessage) return; 

    initDeploySet(_to);
    
    await routeMessage(chain[direct ? ChainType.DESTINATION : ChainType.SOURCE].ccipRouterAddress, evm2EvmMessage);

    console.log("balanceAfter", (await B.usdxToken.balanceOf(receiver)).toString());

    return true;
}

async function main() {

    await initAllAddresses();

    // await setParamTest();
    // await payoutTest();
    
    // expect(await upgradeTest("Market", "remote")).to.equal(true);
    // expect(await upgradeTest("RemoteHub", "remote")).to.equal(true);
    // expect(await upgradeTest("RemoteHubUpgrader", "remote")).to.equal(true);

    // expect(await upgradeTest("Market", "local")).to.equal(true);
    // expect(await upgradeTest("RemoteHub", "local")).to.equal(true);
    // expect(await upgradeTest("RemoteHubUpgrader", "local")).to.equal(true);

    expect(await transferTest(ChainType.SOURCE, ChainType.DESTINATION)).to.equal(true);
}

main().catch((error) => {
    console.error("000", error);
    process.exitCode = 1;
});