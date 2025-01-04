import { ethers, network, upgrades } from "hardhat";
import { RemoteHub, ExchangeMother, Market, ExchangeChild, PayoutManager, PortfolioManager, RoleManager, WrappedXusdToken, XusdToken, RemoteHubUpgrader, ExchangeChild__factory, ExchangeMother__factory, Market__factory, PayoutManager__factory, PortfolioManager__factory, RemoteHub__factory, RemoteHubUpgrader__factory, RoleManager__factory, WrappedXusdToken__factory, XusdToken__factory } from '../../typechain-types';
import appRoot from 'app-root-path';
const fs = require('fs');
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".ts"));

class Roles {
    static get PORTFOLIO_AGENT_ROLE() { return '0xd67ad422505496469a1adf6cdf9e5ee92ac5d33992843c9ecc4b2f6d6cde9137'; }
    static get UNIT_ROLE() { return '0xede8101501d89b9894e78e4f219420b6ddb840e8e75dde35741a0745408476d7'; }
    static get DEFAULT_ADMIN_ROLE() { return '0x0000000000000000000000000000000000000000000000000000000000000000'; }
    static get UPGRADER_ROLE() { return '0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3'; }
    static get EXCHANGER() { return '0x3eb675f159e6ca6cf5de6bfbbc8c4521cfd428f5e9166e51094d5898504caf2d'; }
    static get PAYOUT_EXECUTOR_ROLE() { return '0xd77df84835b214746cc9546302d3e1df1d6b06740a1f528273c85999497318eb'; }
}

async function getContract(name: string): Promise<any> {

    // console.log("process.env.NET", process.env.NET);
    // console.log("process.env.NETWORK", process.env.NETWORK);
    // console.log("RESET", process.env.RESET);
    let networkName = (process.env.NETWORK === 'localhost' ? '_' : '') + (process.env.NETWORK === 'localhost' ? process.env.NET : process.env.NETWORK);
    
    let signer = await initWallet();
    // console.log("networkName in getContract:", networkName);
    
    const searchPath = fromDir(appRoot.path, path.join(networkName, `${name}.json`));
    if (searchPath === undefined) {
        throw new Error(`Contract file not found for ${name} on ${networkName}`);
    }
    const contractJson = JSON.parse(fs.readFileSync(searchPath, 'utf-8'));
    return (await ethers.getContractAt(contractJson.abi, contractJson.address)).connect(signer);
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

async function initWallet() {
    let wallet = await new ethers.Wallet(process.env['PRIVATE_KEY'] as string, ethers.provider);
    
    // console.log('[User] Wallet: ' + wallet.address);
    const balance = await ethers.provider.getBalance(wallet.address);
    // console.log('[User] Balance wallet: ' + balance.toString());
    return wallet;
}

async function deployImpl(contractName: string, initParams: any) {
    const contractFactory = await ethers.getContractFactory(contractName, initParams);

    let newImpl = await upgrades.deployImplementation(contractFactory, {
            kind: 'uups',
            unsafeAllow: [],
            constructorArgs: [],
            redeployImplementation: 'always'
        });

    console.log("Implementation address for", contractName, ":", newImpl);
}

enum Chains {
    Arbitrum = "arbitrum",
    Optimism = "optimism",
    Sonic = "sonic",
}

const chainByChainId = {
    [42161]: Chains.Arbitrum,
    [10]: Chains.Optimism,
    [146]: Chains.Sonic,
};

const chain = {
    [Chains.Arbitrum]: {
        RPC_URL: process.env.ARBITRUM_RPC,
        BLOCK_NUMBER: Number(process.env.ARBITRUM_BLOCK_NUMBER),
    },
    [Chains.Optimism]: {
        RPC_URL: process.env.OPTIMISM_RPC,
        BLOCK_NUMBER: Number(process.env.OPTIMISM_BLOCK_NUMBER),
    },
    [Chains.Sonic]: {
        RPC_URL: process.env.SONIC_RPC,
        BLOCK_NUMBER: Number(process.env.SONIC_BLOCK_NUMBER),
    }
};


async function getCurrentForkNetwork() {
    let metadata = await network.provider.request({
        method: "hardhat_metadata",
        params: [],
    }) as any;
    return chainByChainId[metadata.forkedNetwork.chainId];
}

async function switchNetwork(): Promise<string> {
    let desiredNetwork = process.env.NET as Chains;
    let reset = process.env.RESET === 'true';
    let currentNetwork = await getCurrentForkNetwork();

    if (currentNetwork !== desiredNetwork || reset) {
        console.log("Switching network to", desiredNetwork);
        await network.provider.request({
            method: "hardhat_reset",
                params: [{
                forking: {
                    jsonRpcUrl: chain[desiredNetwork].RPC_URL,
                    blockNumber: chain[desiredNetwork].BLOCK_NUMBER,
                    accounts: [process.env.PRIVATE_KEY]
                }
            }],
        });
    } else {
        console.log("Network is already", desiredNetwork);
    }

    return desiredNetwork as string;
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

export {
    getContract,
    fromDir,
    initWallet,
    deployImpl,
    Roles,
    switchNetwork,
    Contracts,
    ContractTypes,
    ContractFactoryTypes,
    MultichainCallItem,
    ThreeContracts,
    RemoteHub,
    RemoteHubUpgrader,
    ExchangeChild,
    ExchangeMother,
    Market,
    PortfolioManager,
    RoleManager,
    WrappedXusdToken,
    XusdToken,
    PayoutManager
};