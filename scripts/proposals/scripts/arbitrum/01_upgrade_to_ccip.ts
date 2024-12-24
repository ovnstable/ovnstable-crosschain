import { getContract, showM2M } from "@overnight-contracts/common/utils/script-utils";
import { createProposal, testProposal, testUsdPlus, testStrategy } from "@overnight-contracts/common/utils/governance";
import { Roles } from "@overnight-contracts/common/utils/roles";
import path from 'path';
import { Contract } from "ethers";

let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".ts"));

async function main(): Promise<void> {
    let addresses: string[] = [];
    let values: number[] = [];
    let abis: string[] = [];

    let roleManager: Contract = await getContract('RoleManager', 'arbitrum');
    let timelock: Contract = await getContract('AgentTimelock', 'arbitrum');
    let dev3: string = "0x05129E3CE8C566dE564203B0fd85111bBD84C424";
    let dev4: string = "0xcd8562CD85fD93C7e2E80B4Cf69097E5562a76f9";

    addProposalItem(roleManager, 'grantRole', [Roles.PORTFOLIO_AGENT_ROLE, timelock.address]);
    addProposalItem(roleManager, 'grantRole', [Roles.UNIT_ROLE, timelock.address]);
    addProposalItem(roleManager, 'grantRole', [Roles.PORTFOLIO_AGENT_ROLE, dev4]);
    addProposalItem(roleManager, 'grantRole', [Roles.UNIT_ROLE, dev4]);
    addProposalItem(roleManager, 'revokeRole', [Roles.PORTFOLIO_AGENT_ROLE, dev3]);
    addProposalItem(roleManager, 'revokeRole', [Roles.UNIT_ROLE, dev3]);
    
    // await testProposal(addresses, values, abis);
    await createProposal(filename, addresses, values, abis);

    function addProposalItem(contract: Contract, methodName: string, params: any[]): void {
        addresses.push(contract.target as string);
        values.push(0);
        abis.push(contract.interface.encodeFunctionData(methodName, params));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

