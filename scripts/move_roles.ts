import { ethers } from "hardhat";
const ERC20 = require("./helpers/abi/IERC20.json");
import { initWallet, getContract } from "./helpers/script-utils";

class Roles {
    static get PORTFOLIO_AGENT_ROLE() { return '0xd67ad422505496469a1adf6cdf9e5ee92ac5d33992843c9ecc4b2f6d6cde9137'; }
    static get UNIT_ROLE() { return '0xede8101501d89b9894e78e4f219420b6ddb840e8e75dde35741a0745408476d7'; }
    static get DEFAULT_ADMIN_ROLE() { return '0x0000000000000000000000000000000000000000000000000000000000000000'; }
    static get UPGRADER_ROLE() { return '0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3'; }
    static get EXCHANGER() { return '0x3eb675f159e6ca6cf5de6bfbbc8c4521cfd428f5e9166e51094d5898504caf2d'; }
    static get PAYOUT_EXECUTOR_ROLE() { return '0xd77df84835b214746cc9546302d3e1df1d6b06740a1f528273c85999497318eb'; }
}

async function moveRules(contract: any, oldAddress: string, newAddress: string, newUpgrader: string) {

    let signer = await ethers.getSigner(oldAddress);

    await (await contract.connect(signer).grantRole(Roles.DEFAULT_ADMIN_ROLE, newAddress)).wait();
    await (await contract.connect(signer).grantRole(Roles.UPGRADER_ROLE, newUpgrader)).wait();

    if (await contract.hasRole(Roles.DEFAULT_ADMIN_ROLE, newAddress)) {
        await (await contract.connect(signer).revokeRole(Roles.DEFAULT_ADMIN_ROLE, oldAddress)).wait();
    } else {
        throw new Error(`${newAddress} not has DEFAULT_ADMIN_ROLE`);
    }
}

async function main() {

    let dev5 = "0x086dFe298907DFf27BD593BD85208D57e0155c94";

    let exchange = await getContract('ExchangeChild');
    let xusdToken = await getContract('XusdToken');
    let remoteHub = await getContract('RemoteHub');
    let remoteHubUpgrader = await getContract('RemoteHubUpgrader');
    let wrappedXusdToken = await getContract('WrappedXusdToken');
    let payoutManager = await getContract('SonicPayoutManager');
    let market = await getContract('Market');
    let roleManager = await getContract('RoleManager');


    await moveRules(remoteHub, dev5, remoteHubUpgrader.target as string, remoteHubUpgrader.target as string);
    await moveRules(remoteHubUpgrader, dev5, remoteHub.target as string, remoteHub.target as string);
    await moveRules(exchange, dev5, remoteHub.target as string, remoteHub.target as string);
    await moveRules(market, dev5, remoteHub.target as string, remoteHub.target as string);
    await moveRules(roleManager, dev5, remoteHub.target as string, remoteHub.target as string);
    await moveRules(xusdToken, dev5, remoteHub.target as string, remoteHub.target as string);
    await moveRules(wrappedXusdToken, dev5, remoteHub.target as string, remoteHub.target as string);
    await moveRules(payoutManager, dev5, remoteHub.target as string, remoteHub.target as string);
    


}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

