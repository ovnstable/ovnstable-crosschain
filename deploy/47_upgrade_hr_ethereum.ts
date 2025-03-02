const { getContract, deployImpl2 } = require('../scripts/helpers/script-utils');

const chain = {
  networkName: "ethereum",
  ccipRouterAddress: "0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D",
  chainSelector: "5009297550715157269",
  ccipPool: "0xd72F7010f0Fa621aB0869e61e9bb4e3cC887c66c",
};

async function main() {

    let networkName = "ethereum";

    await deployImpl2("RemoteHub", [chain.chainSelector, chain.chainSelector], [chain.ccipRouterAddress], ['constructor', 'state-variable-immutable']);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});