import { ProposalItem, ProposalItems, addProposalItems } from "../../../helpers/governance";
import { Contract } from "ethers";
import { getContract, Roles } from '../../../helpers/script-utils';

async function getProposalItems() : Promise<ProposalItems> {

    let wrappedXusdToken: Contract = await getContract('WrappedXusdToken');

    let newImpl = "0xb9D54768Ace55ADC61006b78c06aF41DBEDaE4a5";
    let oldImpl = "0x9d0fbc852deccb7dcdd6cb224fa7561efda74411";

    let items: ProposalItem[] = [
        { contract: wrappedXusdToken, methodName: 'upgradeTo', params: [newImpl] },
        { contract: wrappedXusdToken, methodName: 'fixName', params: [] },
        { contract: wrappedXusdToken, methodName: 'upgradeTo', params: [oldImpl] },
    ];

    return await addProposalItems(items);
}

export {
    getProposalItems
}