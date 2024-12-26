import { createProposal, testProposal } from "../../../governance/governance";
import { ethers, network, upgrades } from "hardhat";
import { Contract } from "ethers";
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
}

async function main(): Promise<void> {
    let addresses: string[] = [];
    let values: number[] = [];
    let abis: string[] = [];

    let remoteHub: Contract = await getContract('RemoteHub', 'arbitrum');
    let timelock: Contract = await getContract('AgentTimelock', 'arbitrum');
    let exchange: Contract = await getContract('ExchangeMother', 'arbitrum');
    let market: Contract = await getContract('Market', 'arbitrum');
    let roleManager: Contract = await getContract('RoleManager', 'arbitrum');
    let portfolioManager: Contract = await getContract('PortfolioManager', 'arbitrum');
    let xusdToken: Contract = await getContract('XusdToken', 'arbitrum');
    let wrappedXusdToken: Contract = await getContract('WrappedXusdToken', 'arbitrum');
    let payoutManager: Contract = await getContract('ArbitrumPayoutManager', 'arbitrum');

    let exchangeImpl = "0x436cF8bE54d1a062cB513cD13Fc69D8DFafF54f2";
    let marketImpl = "0x460ad2b4e7329923458DaC0aACA6a71C49C848a1";
    let roleManagerImpl = "0x208F11B866A13804f605F0C50Dd6386Af00c6f3b";
    let portfolioManagerImpl = "0x0B82b3D5eAa6cCAF521f8fB00bE5F572a75d5e3c";
    let xusdTokenImpl = "0x53c905E4fbE64bd03c15CD16b330D2Cc20EcA4E5";
    let wrappedXusdTokenImpl = "0x9D0Fbc852dEcCb7dcdd6CB224Fa7561EfDa74411";
    let payoutManagerImpl = "0x9D43BABA222261e5cD9966F1A9E9cc709c491240";

    addProposalItem(exchange, 'upgradeTo', [exchangeImpl]);
    addProposalItem(market, 'upgradeTo', [marketImpl]);
    addProposalItem(roleManager, 'upgradeTo', [roleManagerImpl]);
    addProposalItem(portfolioManager, 'upgradeTo', [portfolioManagerImpl]);
    addProposalItem(xusdToken, 'upgradeTo', [xusdTokenImpl]);
    addProposalItem(wrappedXusdToken, 'upgradeTo', [wrappedXusdTokenImpl]);

    addProposalItem(exchange, 'grantRole', [Roles.UPGRADER_ROLE, timelock.target]);
    addProposalItem(market, 'grantRole', [Roles.UPGRADER_ROLE, timelock.target]);
    addProposalItem(roleManager, 'grantRole', [Roles.UPGRADER_ROLE, timelock.target]);
    addProposalItem(portfolioManager, 'grantRole', [Roles.UPGRADER_ROLE, timelock.target]);
    addProposalItem(xusdToken, 'grantRole', [Roles.UPGRADER_ROLE, timelock.target]);
    addProposalItem(wrappedXusdToken, 'grantRole', [Roles.UPGRADER_ROLE, timelock.target]);

    addProposalItem(exchange, 'setRemoteHub', [remoteHub.target]);
    addProposalItem(market, 'setRemoteHub', [remoteHub.target]);
    addProposalItem(portfolioManager, 'setRemoteHub', [remoteHub.target]);
    addProposalItem(xusdToken, 'setRemoteHub', [remoteHub.target]);
    addProposalItem(wrappedXusdToken, 'setRemoteHub', [remoteHub.target]);

    addProposalItem(exchange, 'initialize_v2', []);
    addProposalItem(portfolioManager, 'initialize_v2', []);
    addProposalItem(xusdToken, 'initialize_v2', [0]);
    addProposalItem(wrappedXusdToken, 'initialize_v2', [remoteHub.target]);

    addProposalItem(payoutManager, 'upgradeTo', [payoutManagerImpl]);
    addProposalItem(payoutManager, 'grantRole', [Roles.UPGRADER_ROLE, timelock.target]);
    addProposalItem(payoutManager, 'setRemoteHub', [remoteHub.target]);
    
    // await testProposal(addresses, values, abis);
    await createProposal(filename, addresses, values, abis);

    function addProposalItem(contract: Contract, methodName: string, params: any[]): void {
        addresses.push(contract.target as string);
        values.push(0);
        abis.push(contract.interface.encodeFunctionData(methodName, params));
    }
}

async function getContract(name: string, networkName: string): Promise<any> {
    const searchPath = fromDir(appRoot.path, path.join(networkName, `${name}.json`));
    if (searchPath === undefined) {
        throw new Error(`Contract file not found for ${name} on ${networkName}`);
    }
    const contractJson = JSON.parse(fs.readFileSync(searchPath, 'utf-8'));
    return await ethers.getContractAt(contractJson.abi, contractJson.address);
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

main()
    .then(() => process.exit(0))
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

