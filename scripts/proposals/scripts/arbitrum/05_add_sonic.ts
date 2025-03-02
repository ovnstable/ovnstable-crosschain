import { ProposalItem, ProposalItems, addProposalItems } from '../../../helpers/governance';
import { Contract } from 'ethers';
import { getContract, MultichainCallItem, Roles } from '../../../helpers/script-utils';

let config = {
    "arbitrum": {
        networkName: "arbitrum",
        chainSelector: "4949039107694359620",
        remoteHub: "0x5ed71817935B2f94e9F3661E9b4C64C546736F42",
        remoteHubUpgrader: "0x51ea40845f1654ab9ce309166DcE60B514c8d7ED"
    },
    "mode": {
        networkName: "mode",
        chainSelector: "7264351850409363825",
        remoteHub: "0x85DE18Bc9719CF673A9F4dF709cbAB701BcC9704",
        remoteHubUpgrader: "0x1705E9E103dBaa234CD6D27B0E9CA8F4E4D47ec7"
    },
    "ethereum": {
        networkName: "ethereum",
        chainSelector: "5009297550715157269",
        remoteHub: "0x85de18bc9719cf673a9f4df709cbab701bcc9704",
        remoteHubUpgrader: "0x1705E9E103dBaa234CD6D27B0E9CA8F4E4D47ec7",
    },
    "bsc": {
        networkName: "bsc",
        chainSelector: "11344663589394136015",
        remoteHub: "0x5560Eb50028b9f6547a83b8fAa52Ab9CB315aC68",
        remoteHubUpgrader: "0x8691117eD0244F340951f3f474FCeec2973EfAc7",
    },
    "optimism": {
        networkName: "optimism",
        chainSelector: "3734403246176062136",
        remoteHub: "0x09d39311b962aA803D32BD79DAA3Fe3ae9E5E579",
        remoteHubUpgrader: "0x60c8A332Fd6d67F80cC4906f31ce9c5043fab992"
    },
    "sonic": {
        networkName: "sonic",
        ccipRouterAddress: "0xB4e1Ff7882474BB93042be9AD5E1fA387949B860",
        chainSelector: "1673871237479749969",
        ccipPool: "0x04c5046A1f4E3fFf094c26dFCAA75eF293932f18",
        xusdToken: "0x60c8A332Fd6d67F80cC4906f31ce9c5043fab992",
        exchange: "0x536e74CfD9FAABf7B06181fA5CfD863De65D79eA",
        payoutManager: "0xd9239aB483CdcE215dB4F4c344Ce6ea27E2EF9Cd",
        roleManager: "0x8691117eD0244F340951f3f474FCeec2973EfAc7",
        remoteHub: "0xd9c4B3d7D014A5C37e751D5DF9b209213d04d91c",
        remoteHubUpgrader: "0xaD4939705B9d1207415A4B2E7818714455fD9137",
        market: "0xd2F9936CE6c0686F93A6FC2F30D23Ff10CfDCcB8",
        wrappedXusdToken: "0x29A0dc4f509873673B7682B60598d393A1e591b7",
    }
}

function encodeWithSignature(signature: string, params: any[]): string {
    const funcName = signature.split('(')[0];
    const ifaceERC20 = new ethers.Interface(["function " + signature])
    let tokenApproveCall = ifaceERC20.encodeFunctionData(funcName, params)
    return tokenApproveCall;
}

function addUpgradeItem(newImpl: string, receiver: string, executor: string, chainSelector: string) {
    const signature = 'upgradeTo(address)';
    const params = [newImpl];
    const encoded = encodeWithSignature(signature, params);
    // console.log("encoded", encoded);

    let multichainCallItems = {
        chainSelector: chainSelector,
        receiver: receiver,
        token: "0x0000000000000000000000000000000000000000",
        amount: 0,
        batchData: [{
            executor: executor,
            data: encoded
        }]
    };

    return multichainCallItems;
}

async function getProposalItems(): Promise<ProposalItems> {

    let rh: Contract = await getContract('RemoteHub');
    let rhu: Contract = await getContract('RemoteHubUpgrader');

    // let multichainData = [
    //     addUpgradeItem(rhImplMode, config["mode"].remoteHubUpgrader, config["mode"].remoteHub, config["mode"].chainSelector),
    //     addUpgradeItem(rhImplEthereum, config["ethereum"].remoteHubUpgrader, config["ethereum"].remoteHub, config["ethereum"].chainSelector),
    //     addUpgradeItem(rhImplBsc, config["bsc"].remoteHubUpgrader, config["bsc"].remoteHub, config["bsc"].chainSelector),
    //     addUpgradeItem(rhImplOptimism, config["optimism"].remoteHubUpgrader, config["optimism"].remoteHub, config["optimism"].chainSelector),
    // ];

    let sonicConfig = config["sonic"];

    let chainItemParam = {
        chainSelector: sonicConfig.chainSelector,
        xusd: sonicConfig.xusdToken,
        exchange: sonicConfig.exchange,
        payoutManager: sonicConfig.payoutManager,
        roleManager: sonicConfig.roleManager,
        remoteHub: sonicConfig.remoteHub,
        remoteHubUpgrader: sonicConfig.remoteHubUpgrader,
        market: sonicConfig.market,
        wxusd: sonicConfig.wrappedXusdToken,
        ccipPool: sonicConfig.ccipPool
    }
    
    let items: ProposalItem[] = [
        { contract: rh, methodName: 'allowlistDestinationChain', params: [sonicConfig.chainSelector, true] },
        { contract: rhu, methodName: 'allowlistDestinationChain', params: [sonicConfig.chainSelector, true] },
        { contract: rh, methodName: 'allowlistSourceChain', params: [sonicConfig.chainSelector, true] },
        { contract: rhu, methodName: 'allowlistSourceChain', params: [sonicConfig.chainSelector, true] },
        { contract: rh, methodName: 'allowlistSender', params: [sonicConfig.remoteHub, true] },
        { contract: rh, methodName: 'allowlistSender', params: [sonicConfig.remoteHubUpgrader, true] },
        { contract: rhu, methodName: 'allowlistSender', params: [sonicConfig.remoteHub, true] },
        { contract: rhu, methodName: 'allowlistSender', params: [sonicConfig.remoteHubUpgrader, true] },
        { contract: rh, methodName: 'addChainItem', params: [chainItemParam] },

        // { contract: rh, methodName: 'multichainCall', params: [multichainData] }
    ];

    return await addProposalItems(items);
}

export { getProposalItems };
