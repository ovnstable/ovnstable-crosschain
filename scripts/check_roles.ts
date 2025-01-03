import { getContract, Roles, switchNetwork } from "./helpers/script-utils";
import { Contract } from "ethers";

async function main(): Promise<void> {

    let networkName = await switchNetwork();

    let isArbitrum = process.env.NET === "arbitrum";

    let exchange = await getContract(isArbitrum ? 'ExchangeMother' : 'ExchangeChild');
    let xusdToken = await getContract('XusdToken');
    let remoteHub = await getContract('RemoteHub');
    let remoteHubUpgrader = await getContract('RemoteHubUpgrader');
    let wrappedXusdToken = await getContract('WrappedXusdToken');
    let payoutManager = await getContract(isArbitrum ? 'ArbitrumPayoutManager' : 'OptimismPayoutManager');
    let portfolioManager = await getContract('PortfolioManager');
    let marketMaker = await getContract('Market');
    let roleManager = await getContract('RoleManager');

    let dev5 = "0x086dFe298907DFf27BD593BD85208D57e0155c94";
    let timelock = "0xa44dF8A8581C2cb536234E6640112fFf932ED2c4";

    if (isArbitrum) {
        let a1 = await exchange.hasRole(Roles.DEFAULT_ADMIN_ROLE, timelock);
        let a2 = await xusdToken.hasRole(Roles.DEFAULT_ADMIN_ROLE, timelock);
        let a3 = await remoteHub.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev5);
        let a4 = await remoteHubUpgrader.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev5);
        let a5 = await wrappedXusdToken.hasRole(Roles.DEFAULT_ADMIN_ROLE, timelock);
        let a6 = await payoutManager.hasRole(Roles.DEFAULT_ADMIN_ROLE, timelock);
        let a7 = await portfolioManager.hasRole(Roles.DEFAULT_ADMIN_ROLE, timelock);
        let a8 = await marketMaker.hasRole(Roles.DEFAULT_ADMIN_ROLE, timelock);
        let a9 = await roleManager.hasRole(Roles.DEFAULT_ADMIN_ROLE, timelock);

        let b1 = await exchange.hasRole(Roles.UPGRADER_ROLE, timelock);
        let b2 = await xusdToken.hasRole(Roles.UPGRADER_ROLE, timelock);
        let b3 = await remoteHub.hasRole(Roles.UPGRADER_ROLE, dev5);
        let b4 = await remoteHubUpgrader.hasRole(Roles.UPGRADER_ROLE, dev5);
        let b5 = await wrappedXusdToken.hasRole(Roles.UPGRADER_ROLE, timelock);
        let b6 = await payoutManager.hasRole(Roles.UPGRADER_ROLE, timelock);
        let b7 = await portfolioManager.hasRole(Roles.UPGRADER_ROLE, timelock);
        let b8 = await marketMaker.hasRole(Roles.UPGRADER_ROLE, timelock);
        let b9 = await roleManager.hasRole(Roles.UPGRADER_ROLE, timelock);
        
        console.log("all", a1, a2, a3, a4, a5, a6, a7, a8, a9);
        console.log("all", b1, b2, b3, b4, b5, b6, b7, b8, b9);
    } else {
        let a1 = await exchange.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev5);
        let a2 = await xusdToken.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev5);
        let a3 = await remoteHub.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev5);
        let a4 = await remoteHubUpgrader.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev5);
        let a5 = await wrappedXusdToken.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev5);
        let a6 = await payoutManager.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev5);
        let a7 = await portfolioManager.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev5);
        let a8 = await marketMaker.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev5);
        let a9 = await roleManager.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev5);

        let b1 = await exchange.hasRole(Roles.UPGRADER_ROLE, dev5);
        let b2 = await xusdToken.hasRole(Roles.UPGRADER_ROLE, dev5);
        let b3 = await remoteHub.hasRole(Roles.UPGRADER_ROLE, dev5);
        let b4 = await remoteHubUpgrader.hasRole(Roles.UPGRADER_ROLE, dev5);
        let b5 = await wrappedXusdToken.hasRole(Roles.UPGRADER_ROLE, dev5);
        let b6 = await payoutManager.hasRole(Roles.UPGRADER_ROLE, dev5);
        let b7 = await portfolioManager.hasRole(Roles.UPGRADER_ROLE, dev5);
        let b8 = await marketMaker.hasRole(Roles.UPGRADER_ROLE, dev5);
        let b9 = await roleManager.hasRole(Roles.UPGRADER_ROLE, dev5);
        
        console.log("all", a1, a2, a3, a4, a5, a6, a7, a8, a9);
        console.log("all", b1, b2, b3, b4, b5, b6, b7, b8, b9);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

