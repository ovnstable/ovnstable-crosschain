import { ProposalItem, ProposalItems, addProposalItems } from '../../../helpers/governance';
import { Contract } from 'ethers';
import { getContract, Roles } from '../../../helpers/script-utils';

async function getProposalItems(): Promise<ProposalItems> {
    let xusdToken: Contract = await getContract('XusdToken');

    let newImpl = '';
    let oldImpl = '0x3f2FeD6FB49Ddc76e4C5CE5738C86704567C4D87';
    const TO_ADDRESS = '0x9030D5C596d636eEFC8f0ad7b2788AE7E9ef3D46';

    const transfers = [{ from: '0xfe193d41bf8ee691bec999bce0981b6d06c89394', amount: 1732.7 }];

    let items: ProposalItem[] = [{ contract: xusdToken, methodName: 'upgradeTo', params: [newImpl] }];

    // Add transfer operations
    for (const transfer of transfers) {
        items.push({
            contract: xusdToken,
            methodName: 'transferStuckTokens',
            params: [transfer.from, TO_ADDRESS, BigInt(transfer.amount * 10 ** 18)],
        });
    }

    // Add final upgrade back to old implementation
    items.push({ contract: xusdToken, methodName: 'upgradeTo', params: [oldImpl] });

    return await addProposalItems(items);
}

export { getProposalItems };
