import { getContract, Roles, switchNetwork } from "./helpers/script-utils";
import { Contract } from "ethers";

async function main(): Promise<void> {

    // let networkName = await switchNetwork();

    let isArbitrum = process.env.NET === "arbitrum";

    let exchange = await getContract(isArbitrum ? 'ExchangeMother' : 'ExchangeChild');
    let xusdToken = await getContract('XusdToken');
    let remoteHub = await getContract('RemoteHub');
    let remoteHubUpgrader = await getContract('RemoteHubUpgrader');
    let wrappedXusdToken = await getContract('WrappedXusdToken');
    let payoutManager = await getContract(isArbitrum ? 'ArbitrumPayoutManager' : 'SonicPayoutManager');
    let portfolioManager = isArbitrum ? await getContract('PortfolioManager') : null;
    let marketMaker = await getContract('Market');
    let roleManager = await getContract('RoleManager');

    let dev5 = "0x086dFe298907DFf27BD593BD85208D57e0155c94";
    let timelock = "0xa44dF8A8581C2cb536234E6640112fFf932ED2c4";
    let rh = remoteHub.target as string;
    let rhu = remoteHubUpgrader.target as string;

    if (isArbitrum) {
        let a1 = await exchange.hasRole(Roles.DEFAULT_ADMIN_ROLE, timelock);
        let a2 = await xusdToken.hasRole(Roles.DEFAULT_ADMIN_ROLE, timelock);
        let a3 = await remoteHub.hasRole(Roles.DEFAULT_ADMIN_ROLE, timelock);
        let a4 = await remoteHubUpgrader.hasRole(Roles.DEFAULT_ADMIN_ROLE, timelock);
        let a5 = await wrappedXusdToken.hasRole(Roles.DEFAULT_ADMIN_ROLE, timelock);
        let a6 = await payoutManager.hasRole(Roles.DEFAULT_ADMIN_ROLE, timelock);
        let a7 = await portfolioManager.hasRole(Roles.DEFAULT_ADMIN_ROLE, timelock);
        let a8 = await marketMaker.hasRole(Roles.DEFAULT_ADMIN_ROLE, timelock);
        let a9 = await roleManager.hasRole(Roles.DEFAULT_ADMIN_ROLE, timelock);

        console.log("all", a1, a2, a3, a4, a5, a6, a7, a8, a9);

        a1 = await exchange.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev5);
        a2 = await xusdToken.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev5);
        a3 = await remoteHub.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev5);
        a4 = await remoteHubUpgrader.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev5);
        a5 = await wrappedXusdToken.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev5);
        a6 = await payoutManager.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev5);
        a7 = await portfolioManager.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev5);
        a8 = await marketMaker.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev5);
        a9 = await roleManager.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev5);

        console.log("all", a1 == false, a2 == false, a3 == false, a4 == false, a5 == false, a6 == false, a7 == false, a8 == false, a9 == false);

        a1 = await exchange.hasRole(Roles.UPGRADER_ROLE, timelock);
        a2 = await xusdToken.hasRole(Roles.UPGRADER_ROLE, timelock);
        a3 = await remoteHub.hasRole(Roles.UPGRADER_ROLE, timelock);
        a4 = await remoteHubUpgrader.hasRole(Roles.UPGRADER_ROLE, timelock);
        a5 = await wrappedXusdToken.hasRole(Roles.UPGRADER_ROLE, timelock);
        a6 = await payoutManager.hasRole(Roles.UPGRADER_ROLE, timelock);
        a7 = await portfolioManager.hasRole(Roles.UPGRADER_ROLE, timelock);
        a8 = await marketMaker.hasRole(Roles.UPGRADER_ROLE, timelock);
        a9 = await roleManager.hasRole(Roles.UPGRADER_ROLE, timelock);
        
        console.log("all", a1, a2, a3, a4, a5, a6, a7, a8, a9);


        a1 = await exchange.hasRole(Roles.UPGRADER_ROLE, dev5);
        a2 = await xusdToken.hasRole(Roles.UPGRADER_ROLE, dev5);
        a3 = await remoteHub.hasRole(Roles.UPGRADER_ROLE, dev5);
        a4 = await remoteHubUpgrader.hasRole(Roles.UPGRADER_ROLE, dev5);
        a5 = await wrappedXusdToken.hasRole(Roles.UPGRADER_ROLE, dev5);
        a6 = await payoutManager.hasRole(Roles.UPGRADER_ROLE, dev5);
        a7 = await portfolioManager.hasRole(Roles.UPGRADER_ROLE, dev5);
        a8 = await marketMaker.hasRole(Roles.UPGRADER_ROLE, dev5);
        a9 = await roleManager.hasRole(Roles.UPGRADER_ROLE, dev5);
        
        console.log("all", a1 == false, a2 == false, a3 == false, a4 == false, a5 == false, a6 == false, a7 == false, a8 == false, a9 == false);
        
    } else {
        let a1 = await exchange.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev5);
        let a2 = await xusdToken.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev5);
        let a3 = await remoteHub.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev5);
        let a4 = await remoteHubUpgrader.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev5);
        let a5 = await wrappedXusdToken.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev5);
        let a6 = await payoutManager.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev5);
        let a8 = await marketMaker.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev5);
        let a9 = await roleManager.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev5);

        console.log("all1", a1 == false, a2 == false, a3 == false, a4 == false, a5 == false, a6 == false, a8 == false, a9 == false);

        a1 = await exchange.hasRole(Roles.DEFAULT_ADMIN_ROLE, remoteHub.target);
        a2 = await xusdToken.hasRole(Roles.DEFAULT_ADMIN_ROLE, remoteHub.target);
        a3 = await remoteHub.hasRole(Roles.DEFAULT_ADMIN_ROLE, remoteHub.target);
        a4 = await remoteHubUpgrader.hasRole(Roles.DEFAULT_ADMIN_ROLE, remoteHub.target);
        a5 = await wrappedXusdToken.hasRole(Roles.DEFAULT_ADMIN_ROLE, remoteHub.target);
        a6 = await payoutManager.hasRole(Roles.DEFAULT_ADMIN_ROLE, remoteHub.target);
        a8 = await marketMaker.hasRole(Roles.DEFAULT_ADMIN_ROLE, remoteHub.target);
        a9 = await roleManager.hasRole(Roles.DEFAULT_ADMIN_ROLE, remoteHub.target);

        console.log("all2", a1, a2, a3 == false, a4, a5, a6, a8, a9);

        a1 = await exchange.hasRole(Roles.DEFAULT_ADMIN_ROLE, remoteHubUpgrader.target);
        a2 = await xusdToken.hasRole(Roles.DEFAULT_ADMIN_ROLE, remoteHubUpgrader.target);
        a3 = await remoteHub.hasRole(Roles.DEFAULT_ADMIN_ROLE, remoteHubUpgrader.target);
        a4 = await remoteHubUpgrader.hasRole(Roles.DEFAULT_ADMIN_ROLE, remoteHubUpgrader.target);
        a5 = await wrappedXusdToken.hasRole(Roles.DEFAULT_ADMIN_ROLE, remoteHubUpgrader.target);
        a6 = await payoutManager.hasRole(Roles.DEFAULT_ADMIN_ROLE, remoteHubUpgrader.target);
        a8 = await marketMaker.hasRole(Roles.DEFAULT_ADMIN_ROLE, remoteHubUpgrader.target);
        a9 = await roleManager.hasRole(Roles.DEFAULT_ADMIN_ROLE, remoteHubUpgrader.target);

        console.log("all3", a1 == false, a2 == false, a3, a4 == false, a5 == false, a6 == false, a8 == false, a9 == false);







        a1 = await exchange.hasRole(Roles.UPGRADER_ROLE, dev5);
        a2 = await xusdToken.hasRole(Roles.UPGRADER_ROLE, dev5);
        a3 = await remoteHub.hasRole(Roles.UPGRADER_ROLE, dev5);
        a4 = await remoteHubUpgrader.hasRole(Roles.UPGRADER_ROLE, dev5);
        a5 = await wrappedXusdToken.hasRole(Roles.UPGRADER_ROLE, dev5);
        a6 = await payoutManager.hasRole(Roles.UPGRADER_ROLE, dev5);
        a8 = await marketMaker.hasRole(Roles.UPGRADER_ROLE, dev5);
        a9 = await roleManager.hasRole(Roles.UPGRADER_ROLE, dev5);

        console.log("all4", a1 == false, a2 == false, a3 == false, a4 == false, a5 == false, a6 == false, a8 == false, a9 == false);

        a1 = await exchange.hasRole(Roles.UPGRADER_ROLE, remoteHub.target);
        a2 = await xusdToken.hasRole(Roles.UPGRADER_ROLE, remoteHub.target);
        a3 = await remoteHub.hasRole(Roles.UPGRADER_ROLE, remoteHub.target);
        a4 = await remoteHubUpgrader.hasRole(Roles.UPGRADER_ROLE, remoteHub.target);
        a5 = await wrappedXusdToken.hasRole(Roles.UPGRADER_ROLE, remoteHub.target);
        a6 = await payoutManager.hasRole(Roles.UPGRADER_ROLE, remoteHub.target);
        a8 = await marketMaker.hasRole(Roles.UPGRADER_ROLE, remoteHub.target);
        a9 = await roleManager.hasRole(Roles.UPGRADER_ROLE, remoteHub.target);

        console.log("all5", a1, a2, a3 == false, a4, a5, a6, a8, a9);

        a1 = await exchange.hasRole(Roles.UPGRADER_ROLE, remoteHubUpgrader.target);
        a2 = await xusdToken.hasRole(Roles.UPGRADER_ROLE, remoteHubUpgrader.target);
        a3 = await remoteHub.hasRole(Roles.UPGRADER_ROLE, remoteHubUpgrader.target);
        a4 = await remoteHubUpgrader.hasRole(Roles.UPGRADER_ROLE, remoteHubUpgrader.target);
        a5 = await wrappedXusdToken.hasRole(Roles.UPGRADER_ROLE, remoteHubUpgrader.target);
        a6 = await payoutManager.hasRole(Roles.UPGRADER_ROLE, remoteHubUpgrader.target);
        a8 = await marketMaker.hasRole(Roles.UPGRADER_ROLE, remoteHubUpgrader.target);
        a9 = await roleManager.hasRole(Roles.UPGRADER_ROLE, remoteHubUpgrader.target);

        console.log("all6", a1 == false, a2 == false, a3, a4 == false, a5 == false, a6 == false, a8 == false, a9 == false);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

