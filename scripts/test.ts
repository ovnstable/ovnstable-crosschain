import { ethers, network, upgrades } from "hardhat";
const hre = require("hardhat");
const { getImplementationAddress } = require('@openzeppelin/upgrades-core');
const sampleModule = require('@openzeppelin/hardhat-upgrades/dist/utils/deploy-impl');
import { getEvm2EvmMessage, requestLinkFromTheFaucet, routeMessage } from "@chainlink/local/scripts/CCIPLocalSimulatorFork";
const path = require('path');
const fs = require('fs');
const GRANT_ROLE = require("./abi/GRANT_ROLE.json");

// 1st Terminal: npx hardhat node
// 2nd Terminal: npx hardhat run ./scripts/test.ts --network localhost

class Roles {

    static get PORTFOLIO_AGENT_ROLE() { return '0xd67ad422505496469a1adf6cdf9e5ee92ac5d33992843c9ecc4b2f6d6cde9137'; }
    static get FREE_RIDER_ROLE() { return '0x262f8dca0440d5010bae937fe18daeae459dacb80622baddc3b4f10759ac952a'; }
    static get WHITELIST_ROLE() { return '0xdc72ed553f2544c34465af23b847953efeb813428162d767f9ba5f4013be6760'; }
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
    usdPlusToken: any;
    wrappedUsdPlusToken: any;
    payoutManager: any;
}

const chain = [
    {
        NAME: "ARBITRUM",
        RPC_URL: "https://lb.drpc.org/ogrpc?network=arbitrum&dkey=AsCWb9aYukugqNphr9pEGw4qx3BBnloR7qCh0oup5x2S",
        BLOCK_NUMBER: 226076577,
        ccipRouterAddress: "0x141fa059441E0ca23ce184B6A78bafD2A517DdE8",
        chainSelector: 4949039107694359620n
    },
    {
        NAME: "OPTIMISM",
        RPC_URL: "https://lb.drpc.org/ogrpc?network=optimism&dkey=AsCWb9aYukugqNphr9pEGw4qx3BBnloR7qCh0oup5x2S",
        BLOCK_NUMBER: 121937222,
        ccipRouterAddress: "0x3206695CaE29952f4b0c22a169725a865bc8Ce0f",
        chainSelector: 3734403246176062136n
    }
]

enum ChainType {
    SOURCE = 0,
    DESTINATION = 1
}

const textToSend = `Hello World`;

let timelock = "0xa44dF8A8581C2cb536234E6640112fFf932ED2c4";
let dev1 = "0x66B439c0a695cc3Ed3d9f50aA4E6D2D917659FfD";
let ganache = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
let unit = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";
let rewardWallet = "0x9030D5C596d636eEFC8f0ad7b2788AE7E9ef3D46";
let ccipPool = "0x0000000000000000000000000000000000000000"; // change later

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

    networkName = networkName.toLowerCase();

    try {
        let searchPath = fromDir(require('app-root-path').path, path.join(networkName, name + ".json"));
        if (searchPath === undefined) {
            throw new Error("");
        }
        console.log(searchPath);
        let contractJson = JSON.parse(fs.readFileSync(searchPath));
        return await ethers.getContractAt(contractJson.abi, contractJson.address);
    } catch (e:any) {
        console.error(`Error: Could not find a contract named [${name}] in network: [${networkName}]`);
        throw new Error(e);
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

    let proxy;
    try {
        proxy = await getContract(contractName, networkName);
    } catch (e) {
    }

    if (!proxy) {
        console.log(`Deploy new Proxy and Impl for ${contractName}`)
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
        console.log("New Proxy: " + proxy.target + ", New Impl " + impl);
        console.log(contractName + " on " + networkName.toLocaleLowerCase() + " is deployed");
        console.log("------------------");
        return proxy;
    }
    
    let oldImpl = await getImplementationAddress(ethers.provider, proxy.target);
    console.log("Old Proxy: " + proxy.target + ", Old Impl " + oldImpl);

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
    console.log("New Proxy: " + proxy.target + ", New Impl " + new2Impl);

    console.log(contractName + " on " + networkName.toLocaleLowerCase() + " is deployed");
    console.log("------------------");

    return proxy;
}

async function moveRules(contract:any, oldAddress:any, newAddress:any) {

    let signer = await ethers.getSigner(oldAddress);

    console.log(`Move ${contract.target}: oldAddress: ${oldAddress} => newAddress: ${newAddress}`);

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

async function initDeploySet(chainType: ChainType, opposite?: Contracts): Promise<Contracts> {
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
    let ganacheSigner = await ethers.getSigner(ganache);
    let signer = chainType == ChainType.SOURCE ? timelockSigner : ganacheSigner;
    let signer1 = chainType == ChainType.SOURCE ? dev1Signer : ganacheSigner;
    let signer2 = ganacheSigner;

    let remoteHub = await deployOrUpgrade("RemoteHub", [chain[chainType].chainSelector], [chain[chainType].ccipRouterAddress], ['constructor', 'state-variable-immutable'], chain[chainType].NAME, ganache);
    console.log("ch1", await remoteHub.chainSelector());
    let remoteHubUpgrader = await deployOrUpgrade("RemoteHubUpgrader", [], [chain[chainType].ccipRouterAddress, remoteHub.target], ['constructor', 'state-variable-immutable'], chain[chainType].NAME, ganache);
    let exchange = await deployOrUpgrade(chainType == ChainType.SOURCE ? "ExchangeMother" : "ExchangeChild", [remoteHub.target], [], [], chain[chainType].NAME, timelock);
    await exchange.connect(signer).setRemoteHub(remoteHub.target);
    let market = await deployOrUpgrade("Market", [ganache], [], [], chain[chainType].NAME, timelock);
    await market.connect(signer).setRemoteHub(remoteHub.target);
    let roleManager = await deployOrUpgrade("RoleManager", [], [], [], chain[chainType].NAME, timelock);
    let portfolioManager = await deployOrUpgrade("PortfolioManager", [], [], [], chain[chainType].NAME, timelock);
    let usdPlusToken = await deployOrUpgrade("UsdPlusToken", ["USD+", "USD+", 6, remoteHub.target], [], [], chain[chainType].NAME, timelock);
    await usdPlusToken.connect(signer).setRemoteHub(remoteHub.target);
    let wrappedUsdPlusToken = await deployOrUpgrade("WrappedUsdPlusToken", ["Wrapped USD+", "wUSD+", 6, remoteHub.target], [], [], chain[chainType].NAME, timelock);
    await wrappedUsdPlusToken.connect(signer).setRemoteHub(remoteHub.target);
    let payoutManager = await deployOrUpgrade(chainType == ChainType.SOURCE ? "ArbitrumPayoutManager" : "OptimismPayoutManager", [remoteHub.target, rewardWallet], [], [], chain[chainType].NAME, dev1);
    await payoutManager.connect(signer1).setRemoteHub(remoteHub.target);

    console.log("ch2", await remoteHub.chainSelector());

    await remoteHub.addChainItem({
        chainSelector: chain[chainType].chainSelector,
        usdp: usdPlusToken.target,
        exchange: exchange.target,
        payoutManager: payoutManager.target,
        roleManager: roleManager.target,
        remoteHub: remoteHub.target,
        remoteHubUpgrader: remoteHubUpgrader.target,
        market: market.target,
        wusdp: wrappedUsdPlusToken.target,
        ccipPool: ccipPool
    });

    console.log("ch3", await remoteHub.chainSelector());

    if (chainType == ChainType.SOURCE) {
        await remoteHub.allowlistDestinationChain(chain[ChainType.DESTINATION].chainSelector, true);
    } else {
        await remoteHub.allowlistSourceChain(chain[ChainType.SOURCE].chainSelector, true);
        await wrappedUsdPlusToken.mint2(signer.address, 1000000);
    }

    if (opposite !== undefined) {
        await remoteHub.allowlistSender(opposite.remoteHub.target, true);

        await remoteHub.addChainItem({
            chainSelector: chain[chainType == ChainType.SOURCE ? ChainType.DESTINATION : ChainType.SOURCE].chainSelector,
            usdp: opposite.usdPlusToken.target,
            exchange: opposite.exchange.target,
            payoutManager: opposite.payoutManager.target,
            roleManager: opposite.roleManager.target,
            remoteHub: opposite.remoteHub.target,
            remoteHubUpgrader: opposite.remoteHubUpgrader.target,
            market: opposite.market.target,
            wusdp: opposite.wrappedUsdPlusToken.target,
            ccipPool: ccipPool
        });
    }

    await roleManager.connect(signer).grantRole(Roles.PORTFOLIO_AGENT_ROLE, signer);
    await roleManager.connect(signer).grantRole(Roles.UNIT_ROLE, unit);

    await moveRules(remoteHub, signer2.address, chainType == ChainType.SOURCE ? timelock : remoteHubUpgrader.target);
    await moveRules(remoteHubUpgrader, signer2.address, remoteHub.target);
    await moveRules(exchange, signer.address, remoteHub.target);
    await moveRules(market, signer.address, remoteHub.target);
    await moveRules(roleManager, signer.address, remoteHub.target);
    await moveRules(usdPlusToken, signer.address, remoteHub.target);
    await moveRules(wrappedUsdPlusToken, signer.address, remoteHub.target);
    await moveRules(payoutManager, signer1.address, remoteHub.target);
    
    
    const returnContracts: Contracts = {
        remoteHub: remoteHub,
        remoteHubUpgrader: remoteHubUpgrader,
        exchange: exchange,
        market: market,
        roleManager: roleManager,
        portfolioManager: portfolioManager,
        usdPlusToken: usdPlusToken,
        wrappedUsdPlusToken: wrappedUsdPlusToken,
        payoutManager: payoutManager
    }

    return returnContracts;
}

async function applyMessage(S: Contracts, D: Contracts, multichainCallItems: any) {

    S = await initDeploySet(ChainType.SOURCE, D);

    const tx = await S.remoteHub.connect(await ethers.getSigner(timelock)).multichainCall(multichainCallItems, { value: "1000000000000000000" });
    // console.log("Transaction hash: ", tx.hash);
    const receipt = await tx.wait();
    if (!receipt) return;
    const evm2EvmMessage = getEvm2EvmMessage(receipt);
    if (!evm2EvmMessage) return;
    // console.log(evm2EvmMessage);

    await initDeploySet(ChainType.DESTINATION, S);

    await routeMessage(chain[ChainType.DESTINATION].ccipRouterAddress, evm2EvmMessage);    
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

    S = await initDeploySet(ChainType.SOURCE, D);
    console.log("lol")
    const tx = await S.exchange.connect(await ethers.getSigner(unit)).payout(false, getEmptyOdosData(), { value: "1000000000000000000" });
    // console.log("Transaction hash: ", tx.hash);
    const receipt = await tx.wait();
    if (!receipt) return;
    const evm2EvmMessage = getEvm2EvmMessage(receipt);
    if (!evm2EvmMessage) return;
    // console.log(evm2EvmMessage);

    await initDeploySet(ChainType.DESTINATION, S);

    await routeMessage(chain[ChainType.DESTINATION].ccipRouterAddress, evm2EvmMessage);    
}

async function test1() {
    let S, D: Contracts;
    S = await initDeploySet(ChainType.SOURCE);
    D = await initDeploySet(ChainType.DESTINATION);
    const before = await D.market.usdcToken();
    console.log(`usdcToken before:`, before);

    let multichainCallItems = [{
        chainSelector: chain[ChainType.DESTINATION].chainSelector,
        receiver: D.remoteHub.target,
        token: "0x0000000000000000000000000000000000000000",
        amount: 0,
        batchData: [{
            executor: D.market.target,
            data: "0xa639eb4d000000000000000000000000da10009cbd5d07dd0cecc66161fc93d7c9000da1"
        }]
    }]

    await applyMessage(S, D, multichainCallItems);

    const after = await D.market.usdcToken();
    console.log(`usdcToken after:`, after);
}

async function test2() {
    let S, D: Contracts;
    S = await initDeploySet(ChainType.SOURCE);
    D = await initDeploySet(ChainType.DESTINATION);

    const before = await D.usdPlusToken.totalSupply();
    console.log(`totalSupply before:`, before);

    await applyPayout(S, D);
    console.log(D.usdPlusToken.target);
    const after = await D.usdPlusToken.totalSupply();
    console.log(`totalSupply after:`, after);
}


async function main() {

    // await test1();
    await test2();
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});