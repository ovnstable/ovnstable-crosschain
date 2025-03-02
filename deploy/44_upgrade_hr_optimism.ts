const { getContract, deployImpl2 } = require('../scripts/helpers/script-utils');

const chain = {
  NAME: "OPTIMISM",
  RPC_URL: process.env.OPTIMISM_RPC,
  BLOCK_NUMBER: 129437283,
  ccipRouterAddress: "0x3206695CaE29952f4b0c22a169725a865bc8Ce0f",
  chainSelector: "3734403246176062136",
  ccipPool: "0xe660606961DF8855E589d59795FAe4b0ecD41FD3",
  liqIndex: ""
};

async function main() {

    let networkName = "optimism";

    await deployImpl2("RemoteHub", [chain.chainSelector, chain.chainSelector], [chain.ccipRouterAddress], ['constructor', 'state-variable-immutable']);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});