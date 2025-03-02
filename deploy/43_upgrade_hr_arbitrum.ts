const { getContract, deployImpl2 } = require('../scripts/helpers/script-utils');

const chain = {
    NAME: "ARBITRUM",
    RPC_URL: process.env.ARBITRUM_RPC,
    BLOCK_NUMBER: 284113241,
    ccipRouterAddress: "0x141fa059441E0ca23ce184B6A78bafD2A517DdE8",
    chainSelector: "4949039107694359620",
    ccipPool: "0x86d99f9b22052645eA076cd16da091b9E87fB6d6"
};

async function main() {

    let networkName = "arbitrum";

    await deployImpl2("RemoteHub", [chain.chainSelector, chain.chainSelector], [chain.ccipRouterAddress], ['constructor', 'state-variable-immutable']);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});