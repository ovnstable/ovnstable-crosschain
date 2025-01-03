import { ProposalItem, ProposalItems, addProposalItems } from "../../../helpers/governance";
import { Contract } from "ethers";
import { getContract, Roles } from '../../../helpers/script-utils';

async function getProposalItems() : Promise<ProposalItems> {
    let remoteHub: Contract = await getContract('RemoteHub');
    let timelock: Contract = await getContract('AgentTimelock');
    let exchange: Contract = await getContract('ExchangeMother');
    let market: Contract = await getContract('Market');
    let roleManager: Contract = await getContract('RoleManager');
    let portfolioManager: Contract = await getContract('PortfolioManager');
    let xusdToken: Contract = await getContract('XusdToken');
    let wrappedXusdToken: Contract = await getContract('WrappedXusdToken');
    let payoutManager: Contract = await getContract('ArbitrumPayoutManager');

    let exchangeImpl = "0x436cF8bE54d1a062cB513cD13Fc69D8DFafF54f2";
    let marketImpl = "0x460ad2b4e7329923458DaC0aACA6a71C49C848a1";
    let roleManagerImpl = "0x208F11B866A13804f605F0C50Dd6386Af00c6f3b";
    let portfolioManagerImpl = "0x0B82b3D5eAa6cCAF521f8fB00bE5F572a75d5e3c";
    let xusdTokenImpl = "0x53c905E4fbE64bd03c15CD16b330D2Cc20EcA4E5";
    let wrappedXusdTokenImpl = "0x9D0Fbc852dEcCb7dcdd6CB224Fa7561EfDa74411";
    let payoutManagerImpl = "0x9D43BABA222261e5cD9966F1A9E9cc709c491240";

    let items: ProposalItem[] = [
        { contract: exchange, methodName: 'upgradeTo', params: [exchangeImpl] },
        { contract: market, methodName: 'upgradeTo', params: [marketImpl] },
        { contract: roleManager, methodName: 'upgradeTo', params: [roleManagerImpl] },
        { contract: portfolioManager, methodName: 'upgradeTo', params: [portfolioManagerImpl] },
        { contract: xusdToken, methodName: 'upgradeTo', params: [xusdTokenImpl] },
        { contract: wrappedXusdToken, methodName: 'upgradeTo', params: [wrappedXusdTokenImpl] },

        { contract: exchange, methodName: 'grantRole', params: [Roles.UPGRADER_ROLE, timelock.target] },
        { contract: market, methodName: 'grantRole', params: [Roles.UPGRADER_ROLE, timelock.target] },
        { contract: roleManager, methodName: 'grantRole', params: [Roles.UPGRADER_ROLE, timelock.target] },
        { contract: portfolioManager, methodName: 'grantRole', params: [Roles.UPGRADER_ROLE, timelock.target] },
        { contract: xusdToken, methodName: 'grantRole', params: [Roles.UPGRADER_ROLE, timelock.target] },
        { contract: wrappedXusdToken, methodName: 'grantRole', params: [Roles.UPGRADER_ROLE, timelock.target] },
    
        { contract: exchange, methodName: 'setRemoteHub', params: [remoteHub.target] },
        { contract: market, methodName: 'setRemoteHub', params: [remoteHub.target] },
        { contract: portfolioManager, methodName: 'setRemoteHub', params: [remoteHub.target] },
        { contract: xusdToken, methodName: 'setRemoteHub', params: [remoteHub.target] },
        { contract: wrappedXusdToken, methodName: 'setRemoteHub', params: [remoteHub.target] },
    
        { contract: exchange, methodName: 'initialize_v2', params: [] },
        { contract: portfolioManager, methodName: 'initialize_v2', params: [] },
        { contract: xusdToken, methodName: 'initialize_v2', params: [0] },
        { contract: wrappedXusdToken, methodName: 'initialize_v2', params: [remoteHub.target] },
    
        { contract: payoutManager, methodName: 'upgradeTo', params: [payoutManagerImpl] },
        { contract: payoutManager, methodName: 'grantRole', params: [Roles.UPGRADER_ROLE, timelock.target] },
        { contract: payoutManager, methodName: 'setRemoteHub', params: [remoteHub.target] },
    ];

    return await addProposalItems(items);
}

export {
    getProposalItems
}