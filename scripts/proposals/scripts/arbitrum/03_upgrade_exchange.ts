import { ProposalItem, ProposalItems, addProposalItems } from "../../../helpers/governance";
import { Contract } from "ethers";
import { getContract, Roles } from '../../../helpers/script-utils';

async function getProposalItems() : Promise<ProposalItems> {

    let exchange: Contract = await getContract('ExchangeMother');

    let newImpl = "0x129f3e4D309D1Ec2DE02632FB38d79A001b19799";

    let items: ProposalItem[] = [
        { contract: exchange, methodName: 'upgradeTo', params: [newImpl] },
    ];

    return await addProposalItems(items);
}

export {
    getProposalItems
}