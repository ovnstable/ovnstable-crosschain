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

    let rhImplArbitrum = '0x00bBD0B38E9374c6C8D049424d3D25586A3cffa2';
    let rhImplMode = '0x361BEb3e0b9f5F6B317D43F20eDC0fd4139b7BEe';
    let rhImplEthereum = '0xF8f2578037f3F94f70c6921F38873f7E7C0B2D56';
    let rhImplBsc = '0x9A597965AeD9aaD4ab8385F9715c63934D30B824';
    let rhImplOptimism = '0x0674F501c08EA1669D2a768750e25f665Ec3a366';

    let multichainData = [
        addUpgradeItem(rhImplMode, config["mode"].remoteHubUpgrader, config["mode"].remoteHub, config["mode"].chainSelector),
        addUpgradeItem(rhImplEthereum, config["ethereum"].remoteHubUpgrader, config["ethereum"].remoteHub, config["ethereum"].chainSelector),
        addUpgradeItem(rhImplBsc, config["bsc"].remoteHubUpgrader, config["bsc"].remoteHub, config["bsc"].chainSelector),
        addUpgradeItem(rhImplOptimism, config["optimism"].remoteHubUpgrader, config["optimism"].remoteHub, config["optimism"].chainSelector),
    ];
    
    let items: ProposalItem[] = [
        { contract: rh, methodName: 'upgradeTo', params: [rhImplArbitrum] },
        { contract: rh, methodName: 'multichainCall', params: [multichainData] }
    ];

    return await addProposalItems(items);
}

export { getProposalItems };
