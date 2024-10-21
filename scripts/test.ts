import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ethers, network, upgrades } from "hardhat";
const hre = require("hardhat");
const { getImplementationAddress } = require('@openzeppelin/upgrades-core');
const sampleModule = require('@openzeppelin/hardhat-upgrades/dist/utils/deploy-impl');
import { getEvm2EvmMessage, requestLinkFromTheFaucet, routeMessage } from "@chainlink/local/scripts/CCIPLocalSimulatorFork";
import { RemoteHub, ExchangeMother, Market, ExchangeChild, PayoutManager, PortfolioManager, RoleManager, WrappedXusdToken, XusdToken, RemoteHubUpgrader, ExchangeChild__factory, ExchangeMother__factory, Market__factory, PayoutManager__factory, PortfolioManager__factory, RemoteHub__factory, RemoteHubUpgrader__factory, RoleManager__factory, WrappedXusdToken__factory, XusdToken__factory } from '../typechain-types';
import { DeployImplementationResponse } from '@openzeppelin/hardhat-upgrades/dist/deploy-implementation';
const path = require('path');
const fs = require('fs');
import { keccak256 } from 'ethereumjs-util';
import { bufferToHex } from 'ethereumjs-util';
import { boolean } from 'hardhat/internal/core/params/argumentTypes';
import appRoot from 'app-root-path';
const { expect } = require("chai");
const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/../.env' });
import type { ContractFactory, Contract } from 'ethers';

// 1st Terminal: npx hardhat node2 --src arbitrum --dest1 optimism --dest2 ethereum
// 2nd Terminal: npx hardhat run ./scripts/test.ts --network localhost

class Roles {
    static get PORTFOLIO_AGENT_ROLE() { return '0xd67ad422505496469a1adf6cdf9e5ee92ac5d33992843c9ecc4b2f6d6cde9137'; }
    static get UNIT_ROLE() { return '0xede8101501d89b9894e78e4f219420b6ddb840e8e75dde35741a0745408476d7'; }
    static get DEFAULT_ADMIN_ROLE() { return '0x0000000000000000000000000000000000000000000000000000000000000000'; }
    static get UPGRADER_ROLE() { return '0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3'; }
    static get EXCHANGER() { return '0x3eb675f159e6ca6cf5de6bfbbc8c4521cfd428f5e9166e51094d5898504caf2d'; }
}

type Contracts = {
    remoteHub: RemoteHub;
    remoteHubUpgrader: RemoteHubUpgrader;
    exchange: ExchangeMother | ExchangeChild;
    market: Market;
    roleManager: RoleManager;
    portfolioManager: PortfolioManager;
    xusdToken: XusdToken;
    wrappedXusdToken: WrappedXusdToken;
    payoutManager: PayoutManager;
    test: {
        marketTestImpl: string;
        remoteHubTestImpl: string;
        remoteHubUpgraderTestImpl: string;
    }
}

type ContractTypes = {
    RemoteHub: RemoteHub;
    ExchangeMother: ExchangeMother;
    Market: Market;
    ExchangeChild: ExchangeChild;
    PayoutManager: PayoutManager;
    RoleManager: RoleManager;
    PortfolioManager: PortfolioManager;
    WrappedXusdToken: WrappedXusdToken;
    XusdToken: XusdToken;
    RemoteHubUpgrader: RemoteHubUpgrader;
}

type ContractFactoryTypes = {
    RemoteHub: RemoteHub__factory;
    ExchangeMother: ExchangeMother__factory;
    Market: Market__factory;
    ExchangeChild: ExchangeChild__factory;
    PayoutManager: PayoutManager__factory;
    RoleManager: RoleManager__factory;
    PortfolioManager: PortfolioManager__factory;
    WrappedXusdToken: WrappedXusdToken__factory;
    XusdToken: XusdToken__factory;
    RemoteHubUpgrader: RemoteHubUpgrader__factory;
}

type MultichainCallItem = {
    chainSelector: string;
    receiver: string;
    token: string;
    amount: number;
    batchData: {
        executor: string;
        data: string;
    }[];
}

type ThreeContracts = [Contracts | undefined, Contracts | undefined, Contracts | undefined];

let contracts: ThreeContracts = [undefined, undefined, undefined];

const chain = [
    {
        NAME: "ARBITRUM",
        RPC_URL: process.env.ARBITRUM_RPC,
        BLOCK_NUMBER: 265742422,
        ccipRouterAddress: "0x141fa059441E0ca23ce184B6A78bafD2A517DdE8",
        chainSelector: "4949039107694359620",
        ccipPool: "0x86d99f9b22052645eA076cd16da091b9E87fB6d6",
        liqIndex: ""
    },
    {
        NAME: "OPTIMISM",
        RPC_URL: process.env.OPTIMISM_RPC,
        BLOCK_NUMBER: 126908803,
        ccipRouterAddress: "0x3206695CaE29952f4b0c22a169725a865bc8Ce0f",
        chainSelector: "3734403246176062136",
        ccipPool: "0xe660606961DF8855E589d59795FAe4b0ecD41FD3",
        liqIndex: ""
    },
    {
        NAME: "ETHEREUM",
        RPC_URL: process.env.ETHEREUM_RPC,
        BLOCK_NUMBER: 21005884,
        ccipRouterAddress: "0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D",
        chainSelector: "5009297550715157269",
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

let timelock = "0xa44dF8A8581C2cb536234E6640112fFf932ED2c4";
let dev1 = "0x66B439c0a695cc3Ed3d9f50aA4E6D2D917659FfD";
let dev4 = "0xcd8562CD85fD93C7e2E80B4Cf69097E5562a76f9";
let dev5 = "0x086dFe298907DFf27BD593BD85208D57e0155c94";
let ganache = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
let unit = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";
let rewardWallet = "0x9030D5C596d636eEFC8f0ad7b2788AE7E9ef3D46";
let wxusdRich = "0x045D9DbbC63b637F6717d92Bed155222e3f18651";

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

async function getContract<T extends keyof ContractTypes>(name: string, networkName: string): Promise<ContractTypes[T]> {
    try {
        const searchPath = fromDir(appRoot.path, path.join(networkName, `${name}.json`));
        if (searchPath === undefined) {
            throw new Error(`Contract file not found for ${name} on ${networkName}`);
        }
        const contractJson = JSON.parse(fs.readFileSync(searchPath, 'utf-8'));
        return await ethers.getContractAt(contractJson.abi, contractJson.address) as unknown as ContractTypes[T];
    } catch (error: unknown) {
        throw error;
    }
}

async function getContractFactory<T extends keyof ContractFactoryTypes>(contractName: string, initParams: any): Promise<ContractFactoryTypes[T]> {

    let factory;
    try {
        factory = await ethers.getContractFactory(contractName, initParams) as unknown as ContractFactoryTypes[T];
    } catch (error) {
        throw error;
    }
    return factory;
}

async function deployProxy<T extends keyof ContractTypes>(contractFactory: ContractFactoryTypes[T], initParams: any, unsafeAllow: any, contrParams: any): Promise<ContractTypes[T]> {

    let proxy;
    try {
        proxy = await upgrades.deployProxy(contractFactory as ContractFactory, initParams, {
            kind: 'uups',
            unsafeAllow: unsafeAllow,
            constructorArgs: contrParams
        });
    } catch (error) {
        throw error;
    }
    return proxy as unknown as ContractTypes[T];
}

async function upgradeProxy<T extends keyof ContractTypes>(proxy: ContractTypes[T], contractFactory: ContractFactoryTypes[T], unsafeAllow: any, contrParams: any) {

    try {
        await upgrades.upgradeProxy(proxy, contractFactory as ContractFactory, {
            kind: 'uups',
            unsafeAllow: unsafeAllow,
            constructorArgs: contrParams
        });
    } catch (error) {
        throw error;
    }
}

async function deployImplementation<T extends keyof ContractTypes>(contractFactory: ContractFactoryTypes[T], unsafeAllow: any, contrParams: any): Promise<string> {
    let newImpl;
    try {
        newImpl = await upgrades.deployImplementation(contractFactory as ContractFactory, {
            kind: 'uups',
            unsafeAllow: unsafeAllow,
            constructorArgs: contrParams
        });
    } catch (error) {
        throw error;
    }
    return newImpl.toString();
}

async function transferETH(amount: number, to: string) {
    let privateKey = "0xea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0"; // Ganache key
    const signer = new ethers.Wallet(privateKey, ethers.provider);

    await signer.sendTransaction({
        to: to,
        value: ethers.parseEther(amount.toString())
    });
}

async function deployOrUpgrade(contractName: string, initParams: any, contrParams: any, unsafeAllow: any, networkName: string, imper: string) {

    const contractFactory = await getContractFactory(contractName, initParams);
    networkName = networkName === "ARBITRUM" ? "_S" : (networkName === "OPTIMISM" ? "_D1" : "_D2");

    let proxy;
    try {
        proxy = await getContract(contractName, networkName);
    } catch (e) {
    }

    if (!proxy) {
        proxy = await deployProxy(contractFactory, initParams, unsafeAllow, contrParams);
        await upgradeProxy(proxy, contractFactory, unsafeAllow, contrParams);
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

    let newImpl = await deployImplementation(contractFactory, unsafeAllow, contrParams);

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

async function moveRules<T extends keyof ContractTypes>(contract: ContractTypes[T], oldAddress: string, newAddress: string, newUpgrader: string) {

    let signer = await ethers.getSigner(oldAddress);

    await (await contract.connect(signer).grantRole(Roles.DEFAULT_ADMIN_ROLE, newAddress)).wait();
    await (await contract.connect(signer).grantRole(Roles.UPGRADER_ROLE, newUpgrader)).wait();

    if (await contract.hasRole(Roles.DEFAULT_ADMIN_ROLE, newAddress)) {
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
    let dev5Signer = await ethers.getSigner(dev5);
    let ganacheSigner = await ethers.getSigner(ganache);
    let signer = chainType == ChainType.SOURCE ? timelockSigner : ganacheSigner;
    let signer1 = chainType == ChainType.SOURCE ? dev1Signer : ganacheSigner;
    let signer2 = ganacheSigner;
    let signer3 = chainType == ChainType.SOURCE ? timelockSigner : dev4Signer;
    let richSigner = await ethers.getSigner(wxusdRich);

    // deploy all contracts (or redeploy)
    let remoteHub = (await deployOrUpgrade("RemoteHub", [chain[chainType].chainSelector], [chain[chainType].ccipRouterAddress], ['constructor', 'state-variable-immutable'], chain[chainType].NAME, ganache)) as RemoteHub;
    let remoteHubUpgrader = (await deployOrUpgrade("RemoteHubUpgrader", [chain[chainType].chainSelector], [chain[chainType].ccipRouterAddress, remoteHub.target], ['constructor', 'state-variable-immutable'], chain[chainType].NAME, ganache)) as RemoteHubUpgrader;
    let exchange = (await deployOrUpgrade(chainType == ChainType.SOURCE ? "ExchangeMother" : "ExchangeChild", [remoteHub.target], [], [], chain[chainType].NAME, timelock)) as ExchangeMother | ExchangeChild;
    let market = (await deployOrUpgrade("Market", [ganache], [], [], chain[chainType].NAME, timelock)) as Market;
    let roleManager = (await deployOrUpgrade("RoleManager", [], [], [], chain[chainType].NAME, timelock)) as RoleManager;
    let portfolioManager = (await deployOrUpgrade("PortfolioManager", [], [], [], chain[chainType].NAME, timelock)) as PortfolioManager;
    let xusdToken = (await deployOrUpgrade("XusdToken", ["xUSD", "xUSD", 6, remoteHub.target], [], [], chain[chainType].NAME, timelock)) as XusdToken;
    let wrappedXusdToken = (await deployOrUpgrade("WrappedXusdToken", ["Wrapped xUSD", "wxUSD", 6, remoteHub.target], [], [], chain[chainType].NAME, chainType == ChainType.SOURCE ? timelock : dev4)) as WrappedXusdToken;
    let payoutManager = (await deployOrUpgrade(chainType == ChainType.SOURCE ? "ArbitrumPayoutManager" : chainType == ChainType.DESTINATION ? "OptimismPayoutManager" : "EthereumPayoutManager", [remoteHub.target, rewardWallet], [], [], chain[chainType].NAME, dev1)) as PayoutManager;

    await exchange.connect(signer).grantRole(Roles.UPGRADER_ROLE, signer.address);
    await market.connect(signer).grantRole(Roles.UPGRADER_ROLE, signer.address);
    await portfolioManager.connect(signer).grantRole(Roles.UPGRADER_ROLE, signer.address);
    await xusdToken.connect(signer).grantRole(Roles.UPGRADER_ROLE, signer.address);
    await wrappedXusdToken.connect(signer3).grantRole(Roles.UPGRADER_ROLE, signer3.address);
    await payoutManager.connect(signer1).grantRole(Roles.UPGRADER_ROLE, signer1.address);

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

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [dev5]
    });

    await transferETH(1, dev5Signer.address);

    if (chainType == ChainType.SOURCE) {
        await (exchange as ExchangeMother).connect(dev5Signer).afterRedeploy();
        await portfolioManager.connect(dev5Signer).afterRedeploy();
        await xusdToken.connect(dev5Signer).afterRedeploy(0);
        await wrappedXusdToken.connect(dev5Signer).afterRedeploy(remoteHub.target);

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [wxusdRich],
        });

        await wrappedXusdToken.connect(richSigner).transfer(chain[ChainType.SOURCE].ccipPool, 100000000);
        chain[chainType].liqIndex = (await xusdToken.rebasingCreditsPerTokenHighres()).toString();
    } else {
        await roleManager.connect(signer).grantRole(Roles.PORTFOLIO_AGENT_ROLE, dev5Signer);
        await xusdToken.connect(dev5Signer).afterRedeploy(chain[0].liqIndex);
    }

    for (let i = 0; i < contracts.length; i++) {
        if (contracts[i] === undefined || i === chainType) {
            continue;
        }

        let contract = contracts[i] as Contracts;
        await remoteHub.allowlistDestinationChain(chain[i].chainSelector, true);
        await remoteHubUpgrader.allowlistDestinationChain(chain[i].chainSelector, true);
        await remoteHub.allowlistSourceChain(chain[i].chainSelector, true);
        await remoteHubUpgrader.allowlistSourceChain(chain[i].chainSelector, true);
        await remoteHub.allowlistSender(contract.remoteHub.target, true);
        await remoteHub.allowlistSender(contract.remoteHubUpgrader.target, true);
        await remoteHubUpgrader.allowlistSender(contract.remoteHub.target, true);
        await remoteHubUpgrader.allowlistSender(contract.remoteHubUpgrader.target, true);

        await remoteHub.addChainItem({
            chainSelector: chain[i].chainSelector,
            xusd: contract.xusdToken.target,
            exchange: contract.exchange.target,
            payoutManager: contract.payoutManager.target,
            roleManager: contract.roleManager.target,
            remoteHub: contract.remoteHub.target,
            remoteHubUpgrader: contract.remoteHubUpgrader.target,
            market: contract.market.target,
            wxusd: contract.wrappedXusdToken.target,
            ccipPool: chain[i].ccipPool
        });
    }

    await roleManager.connect(signer).grantRole(Roles.PORTFOLIO_AGENT_ROLE, signer);
    await roleManager.connect(signer).grantRole(Roles.UNIT_ROLE, unit);
    await moveRules(remoteHub, signer2.address, chainType == ChainType.SOURCE ? timelock : remoteHubUpgrader.target as string, remoteHubUpgrader.target as string);
    await moveRules(remoteHubUpgrader, signer2.address, chainType == ChainType.SOURCE ? timelock : remoteHub.target as string, remoteHub.target as string);
    await moveRules(exchange, signer.address, remoteHub.target as string, remoteHub.target as string);
    await moveRules(market, signer.address, remoteHub.target as string, remoteHub.target as string);
    await moveRules(roleManager, signer.address, remoteHub.target as string, remoteHub.target as string);
    await moveRules(xusdToken, signer.address, remoteHub.target as string, remoteHub.target as string);
    await moveRules(wrappedXusdToken, signer3.address, remoteHub.target as string, remoteHub.target as string);
    await moveRules(payoutManager, signer1.address, remoteHub.target as string, remoteHub.target as string);

    let marketTestImpl = await deployImplementation(await getContractFactory("MarketTest", []), [], []);

    let remoteHubTestImpl = await deployImplementation(await getContractFactory("RemoteHubTest", [chain[chainType].chainSelector]), ['constructor', 'state-variable-immutable'], [chain[chainType].ccipRouterAddress]);

    let remoteHubUpgraderTestImpl = await deployImplementation(await getContractFactory("RemoteHubUpgraderTest", []), ['constructor', 'state-variable-immutable'], [chain[chainType].ccipRouterAddress, remoteHub.target]);

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

async function applyMessage(_to: ChainType, multichainCallItems: any, iter: number) {

    await initDeploySet(ChainType.SOURCE);

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [timelock],
    });

    let tx = await (contracts[ChainType.SOURCE] as Contracts).remoteHub.connect(await ethers.getSigner(timelock)).multichainCall(multichainCallItems, { value: "1000000000000000000" });

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

async function multichainCallLocal(S: Contracts, D: Contracts, multichainCallItems: MultichainCallItem[]): Promise<any> {

    await initDeploySet(ChainType.SOURCE);

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [timelock],
    });

    let tx;
    if (S.remoteHub.target === multichainCallItems[0].receiver) {
        tx = await S.remoteHub.connect(await ethers.getSigner(timelock)).multichainCall(multichainCallItems, { value: "1000000000000000000" });
    } else {
        tx = await S.remoteHubUpgrader.connect(await ethers.getSigner(timelock)).multichainCall(multichainCallItems, { value: "1000000000000000000" });
    }
    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction failed");

    const events = receipt.logs.map(log => {
        return S.remoteHub.target === multichainCallItems[0].receiver ? S.remoteHub.interface.parseLog(log) : S.remoteHubUpgrader.interface.parseLog(log);
    }).filter(event => event !== null);

    return events;
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

async function applyPayout(_to: ChainType, iter: number) {

    await initDeploySet(ChainType.SOURCE);

    let exchange = (contracts[ChainType.SOURCE] as Contracts).exchange as ExchangeMother;
    const tx = await exchange.connect(await ethers.getSigner(unit)).payout(false, getEmptyOdosData(), { value: "1000000000000000000" });
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
    const ifaceERC20 = new ethers.Interface(["function " + signature])
    let tokenApproveCall = ifaceERC20.encodeFunctionData(funcName, params)
    return tokenApproveCall;
}

// set admin param to child from mother (market)
async function setParamTest(_to: ChainType, _to2: ChainType) {

    let TO = contracts[_to] as Contracts;
    let TO2 = contracts[_to2] as Contracts;

    await initDeploySet(_to);
    const before = await TO.market.assetToken();
    console.log(`usdcToken before:`, before);

    await initDeploySet(_to2);
    const before2 = await TO2.market.assetToken();
    console.log(`usdcToken before:`, before2);

    await initDeploySet(ChainType.SOURCE);

    const signature = 'setToken(address)';
    const params1 = ['0xda10009cbd5d07dd0cecc66161fc93d7c9000da1'];
    const params2 = ['0xda10009cbd5d07dd0cecc66161fc93d7c9000da2'];
    const encoded1 = encodeWithSignature(signature, params1);
    const encoded2 = encodeWithSignature(signature, params2);

    let multichainCallItems = [{
        chainSelector: chain[_to].chainSelector,
        receiver: TO.remoteHub.target,
        token: "0x0000000000000000000000000000000000000000",
        amount: 0,
        batchData: [{
            executor: TO.market.target,
            data: encoded1
        }]
    },
    {
        chainSelector: chain[_to2].chainSelector,
        receiver: TO2.remoteHub.target,
        token: "0x0000000000000000000000000000000000000000",
        amount: 0,
        batchData: [{
            executor: TO2.market.target,
            data: encoded2
        }]
    }
    ]

    await applyMessage(_to, multichainCallItems, 0);

    const after = await TO.market.assetToken();
    console.log(`usdcToken after:`, after);

    await applyMessage(_to2, multichainCallItems, 1);

    const after2 = await TO2.market.assetToken();
    console.log(`usdcToken after:`, after2);
}

async function payoutTest(_to: ChainType, _to2: ChainType) {

    let TO = contracts[_to] as Contracts;
    let TO2 = contracts[_to2] as Contracts;

    await initDeploySet(_to);
    const before = await TO.xusdToken.totalSupply();
    console.log(`totalSupply before:`, before);

    await initDeploySet(_to2);
    const before2 = await TO2.xusdToken.totalSupply();
    console.log(`totalSupply before:`, before2);

    await applyPayout(_to, 0);

    const after = await TO.xusdToken.totalSupply();
    console.log(`totalSupply after:`, after);

    await applyPayout(_to2, 1);

    const after2 = await TO2.xusdToken.totalSupply();
    console.log(`totalSupply after:`, after2);
}

async function makeUpgradeToData(newImpl: string, receiver: string, executor: string, chainType: ChainType): Promise<MultichainCallItem[]> {
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

    let S = contracts[ChainType.SOURCE] as Contracts;
    let D = contracts[ChainType.DESTINATION] as Contracts;

    let newImpl, receiver, executor;

    if (type === "remote") {

        if (contractName === "RemoteHub") {
            newImpl = D.test.remoteHubTestImpl;
            receiver = D.remoteHubUpgrader.target as string;
            executor = D.remoteHub.target as string;
        } else if (contractName === "RemoteHubUpgrader") {
            newImpl = D.test.remoteHubUpgraderTestImpl;
            receiver = D.remoteHub.target as string;
            executor = D.remoteHubUpgrader.target as string;
        } else {
            newImpl = D.test.marketTestImpl;
            receiver = D.remoteHub.target as string;
            executor = D.market.target as string;
        }
        let multichainCallItems = await makeUpgradeToData(newImpl, receiver, executor, ChainType.DESTINATION);
        await applyMessage(ChainType.DESTINATION, multichainCallItems, 0);
        let impl = await getImplementationAddress(ethers.provider, executor);
        if (impl !== newImpl) {
            throw new Error("Implementation mismatch");
        }
    } else {
        if (contractName === "RemoteHub") {
            newImpl = S.test.remoteHubTestImpl;
            receiver = S.remoteHubUpgrader.target as string;
            executor = S.remoteHub.target as string;
        } else if (contractName === "RemoteHubUpgrader") {
            newImpl = S.test.remoteHubUpgraderTestImpl;
            receiver = S.remoteHub.target as string;
            executor = S.remoteHubUpgrader.target as string;
        } else {
            newImpl = S.test.marketTestImpl;
            receiver = S.remoteHub.target as string;
            executor = S.remoteHubUpgrader.target as string;
        }

        let multichainCallItems = await makeUpgradeToData(newImpl, receiver, executor, ChainType.SOURCE);
        let events = await multichainCallLocal(S, D, multichainCallItems);
        const upgradedEvent = events.find(event => event.name === 'Upgraded');
        if (upgradedEvent) {
            if (newImpl !== upgradedEvent.args.implementation) {
                throw new Error("Implementation mismatch");
            }
        } else {
            return false;
        }
    }
    return true;
}

async function getXUSD(account: string, amount: string, chainType: ChainType) {

    let xusd = contracts[chainType]?.xusdToken as XusdToken;
    let hubAddress = (contracts[chainType] as Contracts).remoteHub.target as string;

    await transferETH(1, hubAddress);

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [hubAddress],
    });

    const hub = await hre.ethers.getSigner(hubAddress);
    await xusd.connect(hub).mint(account, amount);

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [hubAddress],
    });
}

async function transferTest(_from: ChainType, _to: ChainType): Promise<boolean> {

    await initDeploySet(_from);
    let A = contracts[_from] as Contracts;
    let B = contracts[_to] as Contracts;

    let direct: boolean = _from === ChainType.SOURCE;

    let sender = direct ? timelock : "0xcd8562CD85fD93C7e2E80B4Cf69097E5562a76f9";
    let receiver = "0x086dFe298907DFf27BD593BD85208D57e0155c94";
    let onexUsd = "1000000";

    let signer = await ethers.getSigner(sender);
    await getXUSD(signer.address, onexUsd, _from);

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

    // await setParamTest(ChainType.DESTINATION, ChainType.DESTINATION2);
    // await payoutTest(ChainType.DESTINATION, ChainType.DESTINATION2); //neok

    expect(await upgradeTest("Market", "remote")).to.equal(true);
    expect(await upgradeTest("RemoteHub", "remote")).to.equal(true);
    expect(await upgradeTest("RemoteHubUpgrader", "remote")).to.equal(true);

    expect(await upgradeTest("Market", "local")).to.equal(true);
    expect(await upgradeTest("RemoteHub", "local")).to.equal(true);
    expect(await upgradeTest("RemoteHubUpgrader", "local")).to.equal(true);

    // expect(await transferTest(ChainType.SOURCE, ChainType.DESTINATION)).to.equal(true);
    // expect(await transferTest(ChainType.DESTINATION, ChainType.SOURCE)).to.equal(true);
    // expect(await transferTest(ChainType.DESTINATION, ChainType.DESTINATION2)).to.equal(true);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});