import { createProposal, testProposal } from "../helpers/governance";
import { switchNetwork, getContract, Roles, initWallet } from "../helpers/script-utils";
import { network } from "hardhat";
const hre = require("hardhat");
const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/../.env' });

const filename = "04_upgrade_all_rh";

async function main(): Promise<void> {

    // let networkName = await switchNetwork();
    let signer = await initWallet();

    // const { getProposalItems } = await import(`./scripts/${networkName}/${filename}`);
    const { getProposalItems } = await import(`./scripts/arbitrum/${filename}`);
    let proposalItems = await getProposalItems();

    // let usdPlus = await getContract('XusdToken');
    // let TO_ADDRESS = '0x9030D5C596d636eEFC8f0ad7b2788AE7E9ef3D46';
    // console.log('Balance before:', await usdPlus.balanceOf(TO_ADDRESS));

    // await testProposal(proposalItems);

    // console.log('Balance after:', await usdPlus.balanceOf(TO_ADDRESS));
    // let roleManager = await getContract('RoleManager');
    // let exchange = await getContract('ExchangeMother');
    // let lol = await roleManager.hasRole(Roles.PORTFOLIO_AGENT_ROLE, "0x086dFe298907DFf27BD593BD85208D57e0155c94");
    // console.log(lol);
    // let rh = await exchange.remoteHub();
    // console.log("rh", rh);
    // let remoteHub = await getContract('RemoteHub');
    // console.log("tt", remoteHub.target);
    // let rm = await remoteHub.roleManager();
    // console.log("rm", rm);
    // await exchange.unpause();
    
    await createProposal(filename, proposalItems);
}

main()
    .then(() => process.exit(0))
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

