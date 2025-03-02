const { getContract, deployImpl2 } = require('../scripts/helpers/script-utils');

const chain = {
  ccipRouterAddress: "0x34B03Cb9086d7D758AC55af71584F81A598759FE",
    chainSelector: "11344663589394136015",
    ccipPool: "0xD9c00B874fB86d2A09b5BA1DfF7fb05554DB4B6d",
};

async function main() {

    let networkName = "bsc";

    await deployImpl2("RemoteHub", [chain.chainSelector, chain.chainSelector], [chain.ccipRouterAddress], ['constructor', 'state-variable-immutable']);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});