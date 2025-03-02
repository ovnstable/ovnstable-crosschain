import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { network } from "hardhat";
const hre = require("hardhat");
import { testProposal } from "../scripts/helpers/governance";
const { ethers, upgrades } = hre;
const { getImplementationAddress } = require('@openzeppelin/upgrades-core');
const sampleModule = require('@openzeppelin/hardhat-upgrades/dist/utils/deploy-impl');
import { getEvm2EvmMessage, routeMessage } from "../scripts/helpers/CCIPLocalSimulatorFork";
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
import { fromDir, Roles, ThreeContracts, Contracts, ContractTypes, ContractFactoryTypes, MultichainCallItem, RemoteHub, RemoteHubUpgrader, ExchangeChild, ExchangeMother, Market, PortfolioManager, RoleManager, WrappedXusdToken, XusdToken, PayoutManager } from '../scripts/helpers/script-utils';
import { getProposalItems } from '../scripts/proposals/scripts/arbitrum/01_upgrade_to_ccip';

// instalation: npm install (not yarn install)
// 1st Terminal: npx hardhat node3
// 2nd Terminal: npx hardhat run ./test/test4.ts --network localhost --net arbitrum

let contracts: ThreeContracts = [undefined, undefined, undefined];

const chain = [
    {
        NAME: "ARBITRUM",
        RPC_URL: process.env.ARBITRUM_RPC,
        BLOCK_NUMBER: Number(process.env.ARBITRUM_BLOCK_NUMBER),
        ccipRouterAddress: "0x141fa059441E0ca23ce184B6A78bafD2A517DdE8",
        chainSelector: "4949039107694359620",
        ccipPool: "0x86d99f9b22052645eA076cd16da091b9E87fB6d6"
    },
    // {
    //     NAME: "ETHEREUM",
    //     RPC_URL: process.env.ETHEREUM_RPC,
    //     BLOCK_NUMBER: Number(process.env.ETHEREUM_BLOCK_NUMBER),
    //     ccipRouterAddress: "0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D",
    //     chainSelector: "5009297550715157269",
    //     ccipPool: "0xd72F7010f0Fa621aB0869e61e9bb4e3cC887c66c"
    // },
    {
        NAME: "MODE",
        RPC_URL: process.env.MODE_RPC,
        BLOCK_NUMBER: Number(process.env.MODE_BLOCK_NUMBER),
        ccipRouterAddress: "0x24C40f13E77De2aFf37c280BA06c333531589bf1",
        chainSelector: "7264351850409363825",
        ccipPool: "0x66713d7E29D2F77AF7B0045a41D1770641D8AE93"
    }
]

enum ChainType {
    SOURCE = 0,
    DESTINATION = 1
}

let timelock = "0xa44dF8A8581C2cb536234E6640112fFf932ED2c4";
let dev1 = "0x66B439c0a695cc3Ed3d9f50aA4E6D2D917659FfD";
let dev4 = "0xcd8562CD85fD93C7e2E80B4Cf69097E5562a76f9";
let dev5 = "0x086dFe298907DFf27BD593BD85208D57e0155c94";
let rewardWallet = "0x9030D5C596d636eEFC8f0ad7b2788AE7E9ef3D46";
let wxusdRich = "0xf4a0a75851001dFf6f652B3B0523D846cbC4394D";

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
            constructorArgs: contrParams,
            // redeployImplementation: 'always'
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
    networkName = networkName === "ARBITRUM" ? "arbitrum_" : "mode_";

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
    await transferETH(1, imper);
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

    console.log("Resetting network to", chain[chainType].NAME);
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
    let dev5Signer = await ethers.getSigner(dev5);
    let richSigner = await ethers.getSigner(wxusdRich);

    let networkName = chainType == ChainType.SOURCE ? "arbitrum_" : "mode_";

    let remoteHub = (await getContract("RemoteHub", networkName)) as RemoteHub;
    let remoteHubUpgrader = (await getContract("RemoteHubUpgrader", networkName)) as RemoteHubUpgrader;
    let exchange = (await getContract(chainType == ChainType.SOURCE ? "ExchangeMother" : "ExchangeChild", networkName)) as ExchangeChild | ExchangeMother;
    let market = (await getContract("Market", networkName)) as Market;
    let roleManager = (await getContract("RoleManager", networkName)) as RoleManager;
    let portfolioManager = chainType == ChainType.SOURCE ? (await getContract("PortfolioManager", networkName)) as PortfolioManager : undefined;
    let xusdToken = (await getContract("XusdToken", networkName)) as XusdToken;
    let wrappedXusdToken = (await getContract("WrappedXusdToken", networkName)) as WrappedXusdToken;
    let payoutManager = (await getContract(chainType == ChainType.SOURCE ? "ArbitrumPayoutManager" : "ModePayoutManager", networkName)) as PayoutManager;    

    if (chainType == ChainType.SOURCE) {
        // remoteHub = (await deployOrUpgrade("RemoteHub", [chain[chainType].chainSelector, chain[ChainType.SOURCE].chainSelector], [chain[chainType].ccipRouterAddress], ['constructor', 'state-variable-immutable'], chain[chainType].NAME, dev5)) as RemoteHub;
        // let proposalItems = await getProposalItems();
        // await testProposal(proposalItems);
    } else {
        // remoteHub = (await deployOrUpgrade("RemoteHub", [chain[chainType].chainSelector, chain[chainType].chainSelector], [chain[chainType].ccipRouterAddress], ['constructor', 'state-variable-immutable'], chain[chainType].NAME, dev5)) as RemoteHub;
        wrappedXusdToken = (await deployOrUpgrade("WrappedXusdToken", ["Wrapped xUSD", "wxUSD", 6, remoteHub.target], [], [], chain[chainType].NAME, dev5)) as WrappedXusdToken;
        xusdToken = (await deployOrUpgrade("XusdToken", ["xUSD", "xUSD", 6, remoteHub.target], [], [], chain[chainType].NAME, dev5)) as XusdToken;
        const wrapper = await hre.ethers.getSigner(wrappedXusdToken.target);
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [wrappedXusdToken.target]
        });
        await transferETH(2, wrappedXusdToken.target);
        // await xusdToken.connect(wrapper).mint(dev5, "1000000");
    }

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [dev5]
    });
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [dev1]
    });
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [wxusdRich]
    });
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [wrappedXusdToken.target]
    });
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [timelock]
    });

    await transferETH(2, dev5Signer.address);
    await transferETH(2, dev1Signer.address);
    await transferETH(2, timelock);
    await transferETH(2, richSigner.address);
    await transferETH(2, dev4);

    if (chainType == ChainType.SOURCE) {
        await wrappedXusdToken.connect(richSigner).transfer(chain[ChainType.SOURCE].ccipPool, 100000000);
    } else {
        await xusdToken.connect(dev5Signer).changeTotalSupply("841199807039117855832110550");
    }

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

async function applyMessage(_to: ChainType, multichainCallItems: any, iter: number = 0) {

    await initDeploySet(ChainType.SOURCE);

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

    // let neededSigner =  ? timelock : dev5;

    let tx;
    if (S.remoteHub.target === multichainCallItems[0].receiver) {
        tx = await S.remoteHub.connect(await ethers.getSigner(dev5)).multichainCall(multichainCallItems, { value: "1000000000000000000" });
    } else {
        tx = await S.remoteHubUpgrader.connect(await ethers.getSigner(dev5)).multichainCall(multichainCallItems, { value: "1000000000000000000" });
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
    const tx = await exchange.connect(await ethers.getSigner(dev5)).payout(false, getEmptyOdosData(), { value: "1000000000000000000" });
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
    await initDeploySet(ChainType.SOURCE);
}

function encodeWithSignature(signature: string, params: any[]): string {
    const funcName = signature.split('(')[0];
    const ifaceERC20 = new ethers.Interface(["function " + signature])
    let tokenApproveCall = ifaceERC20.encodeFunctionData(funcName, params)
    return tokenApproveCall;
}

// set admin param to child from mother (market)
async function setParamTest(_to: ChainType) {

    let TO = contracts[_to] as Contracts;

    await initDeploySet(_to);
    const before = await TO.market.assetToken();
    console.log(`usdcToken before:`, before);

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
    }]

    await applyMessage(_to, multichainCallItems);

    const after = await TO.market.assetToken();
    console.log(`usdcToken after:`, after);
}

async function payoutTest(_to: ChainType) {

    let TO = contracts[_to] as Contracts;

    await initDeploySet(_to);
    const before = await TO.xusdToken.totalSupply();
    console.log(`totalSupply before:`, before);

    await applyPayout(_to, 0);

    const after = await TO.xusdToken.totalSupply();
    console.log(`totalSupply after:`, after);
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
    }] as MultichainCallItem[];

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
        await applyMessage(ChainType.DESTINATION, multichainCallItems);
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
            executor = S.market.target as string;
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
    let wrapperAddress = (contracts[chainType] as Contracts).wrappedXusdToken.target as string;
    const wrapper = await hre.ethers.getSigner(wrapperAddress);
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [wrapperAddress]
    });
    await transferETH(2, wrapperAddress);
    await xusd.connect(wrapper).mint(account, amount);
}

async function transferTest(_from: ChainType, _to: ChainType): Promise<boolean> {

    await initDeploySet(_from);
    let A = contracts[_from] as Contracts;
    let B = contracts[_to] as Contracts;

    let direct: boolean = _from === ChainType.SOURCE;

    let sender = dev5;
    let receiver = dev5;
    let onexUsd = "1000000";

    let signer = await ethers.getSigner(sender);
    await getXUSD(signer.address, onexUsd, _from);

    console.log("balanceBefore", (await A.xusdToken.balanceOf(sender)).toString());

    await A.xusdToken.connect(signer).approve(A.remoteHub.target, onexUsd);

    const tx = await A.remoteHub.connect(signer).crossTransfer(receiver, onexUsd, chain[_to].chainSelector, { value: "1000000000000000000" });

    console.log("balanceBefore", (await A.xusdToken.balanceOf(sender)).toString());

    const receipt = await tx.wait();
    // if (!receipt) return;
    const evm2EvmMessage = getEvm2EvmMessage(receipt);
    // if (!evm2EvmMessage) return; 

    await initDeploySet(_to);

    console.log("balanceAfter", (await B.xusdToken.balanceOf(receiver)).toString());

    await routeMessage(chain[_to].ccipRouterAddress, evm2EvmMessage);

    console.log("balanceAfter", (await B.xusdToken.balanceOf(receiver)).toString());

    return true;
}

async function main() {

    await initAllAddresses();

    // await payoutTest(ChainType.DESTINATION);

    expect(await transferTest(ChainType.SOURCE, ChainType.DESTINATION)).to.equal(true);
    // expect(await transferTest(ChainType.DESTINATION, ChainType.SOURCE)).to.equal(true);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});