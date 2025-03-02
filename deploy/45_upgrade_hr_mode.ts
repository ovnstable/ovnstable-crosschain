const { getContract, deployImpl2 } = require('../scripts/helpers/script-utils');

const chain = {
  ccipRouterAddress: "0x24C40f13E77De2aFf37c280BA06c333531589bf1",
  chainSelector: "7264351850409363825",
};

async function main() {

    let networkName = "mode";

    await deployImpl2("RemoteHub", [chain.chainSelector, chain.chainSelector], [chain.ccipRouterAddress], ['constructor', 'state-variable-immutable']);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});