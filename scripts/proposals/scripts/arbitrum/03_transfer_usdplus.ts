import { ProposalItem, ProposalItems, addProposalItems } from '../../../helpers/governance';
import { Contract } from 'ethers';
import { getContract, Roles } from '../../../helpers/script-utils';

async function getProposalItems(): Promise<ProposalItems> {
    let xusdToken: Contract = await getContract('XusdToken');

    let newImpl = '0x26085bDc0230AA48AFE8ce3F5f007694f2E44D97';
    let oldImpl = '0x53c905E4fbE64bd03c15CD16b330D2Cc20EcA4E5';
    const TO_ADDRESS = '0x9030D5C596d636eEFC8f0ad7b2788AE7E9ef3D46';

    const transfers = [{ from: '0xfe193d41bf8ee691bec999bce0981b6d06c89394', amount: 1732 }];

    let items: ProposalItem[] = [{ contract: xusdToken, methodName: 'upgradeTo', params: [newImpl] }];

    // Add transfer operations
    for (const transfer of transfers) {
        items.push({
            contract: xusdToken,
            methodName: 'transferStuckTokens',
            params: [transfer.from, TO_ADDRESS, BigInt(transfer.amount * 10 ** 6)],
        });
    }

    // Add final upgrade back to old implementation
    items.push({ contract: xusdToken, methodName: 'upgradeTo', params: [oldImpl] });

    console.log(items);
    return await addProposalItems(items);
}

export { getProposalItems };
