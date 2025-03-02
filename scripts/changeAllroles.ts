import { getContract, Roles, switchNetwork } from "./helpers/script-utils";
import { Contract } from "ethers";
const hre = require("hardhat");
const { ethers, upgrades } = hre;

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

async function main(): Promise<void> {

    let desiredNetwork = process.env.NET as string;
    desiredNetwork = desiredNetwork.charAt(0).toUpperCase() + desiredNetwork.slice(1);
    console.log("desiredNetwork", desiredNetwork);

    // let networkName = await switchNetwork();

    let exchange = await getContract('ExchangeChild');
    let xusdToken = await getContract('XusdToken');
    let remoteHub = await getContract('RemoteHub');
    let remoteHubUpgrader = await getContract('RemoteHubUpgrader');
    let wrappedXusdToken = await getContract('WrappedXusdToken');
    let payoutManager = await getContract(desiredNetwork + 'PayoutManager');
    let marketMaker = await getContract('Market');
    let roleManager = await getContract('RoleManager');

    let rh = remoteHub.target as string;
    let rhu = remoteHubUpgrader.target as string;
    let dev5 = "0x086dFe298907DFf27BD593BD85208D57e0155c94";
    let timelock = "0xa44dF8A8581C2cb536234E6640112fFf932ED2c4";
    
    // await hre.network.provider.request({
    //     method: "hardhat_impersonateAccount",
    //     params: [dev5]
    // });

    await moveRules(remoteHub, dev5, rhu, rhu);
    console.log(1);
    await moveRules(remoteHubUpgrader, dev5, rh, rh);
    console.log(2);
    await moveRules(exchange, dev5, rh, rh);
    console.log(3);
    await moveRules(xusdToken, dev5, rh, rh);
    console.log(4);
    await moveRules(wrappedXusdToken, dev5, rh, rh);
    console.log(5);
    await moveRules(payoutManager, dev5, rh, rh);
    console.log(6);
    await moveRules(marketMaker, dev5, rh, rh);
    console.log(7);
    await moveRules(roleManager, dev5, rh, rh);
    console.log(8);

    // await moveRules(remoteHub, dev5, timelock, timelock);
    // await moveRules(remoteHubUpgrader, dev5, timelock, timelock);

    let a1 = await exchange.hasRole(Roles.DEFAULT_ADMIN_ROLE, rh);
    let a2 = await xusdToken.hasRole(Roles.DEFAULT_ADMIN_ROLE, rh);
    let a3 = await remoteHub.hasRole(Roles.DEFAULT_ADMIN_ROLE, rhu);
    let a4 = await remoteHubUpgrader.hasRole(Roles.DEFAULT_ADMIN_ROLE, rh);
    let a5 = await wrappedXusdToken.hasRole(Roles.DEFAULT_ADMIN_ROLE, rh);
    let a6 = await payoutManager.hasRole(Roles.DEFAULT_ADMIN_ROLE, rh);
    let a7 = await marketMaker.hasRole(Roles.DEFAULT_ADMIN_ROLE, rh);
    let a8 = await roleManager.hasRole(Roles.DEFAULT_ADMIN_ROLE, rh);

    let b1 = await exchange.hasRole(Roles.UPGRADER_ROLE, rh);
    let b2 = await xusdToken.hasRole(Roles.UPGRADER_ROLE, rh);
    let b3 = await remoteHub.hasRole(Roles.UPGRADER_ROLE, rhu);
    let b4 = await remoteHubUpgrader.hasRole(Roles.UPGRADER_ROLE, rh);
    let b5 = await wrappedXusdToken.hasRole(Roles.UPGRADER_ROLE, rh);
    let b6 = await payoutManager.hasRole(Roles.UPGRADER_ROLE, rh);
    let b7 = await marketMaker.hasRole(Roles.UPGRADER_ROLE, rh);
    let b8 = await roleManager.hasRole(Roles.UPGRADER_ROLE, rh);
    
    console.log("all", a1, a2, a3, a4, a5, a6, a7, a8);
    console.log("all", b1, b2, b3, b4, b5, b6, b7, b8);
}

main()
    .then(() => process.exit(0))
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

