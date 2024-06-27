import { ethers, network } from "hardhat";
import { 
    getEvm2EvmMessage, 
    requestLinkFromTheFaucet, 
    routeMessage 
  } from "@chainlink/local/scripts/CCIPLocalSimulatorFork";

// 1st Terminal: npx hardhat node
// 2nd Terminal: npx hardhat run ./scripts/examples/UnsafeTokenAndDataTransferFork.ts --network localhost

const arbitrumChain = {
    RPC_URL: "https://lb.drpc.org/ogrpc?network=arbitrum&dkey=AsCWb9aYukugqNphr9pEGw4qx3BBnloR7qCh0oup5x2S",
    BLOCK_NUMBER: 224068343,
    ccipRouterAddress: "0x141fa059441E0ca23ce184B6A78bafD2A517DdE8"
}

const optimismChain = {
    RPC_URL: "https://lb.drpc.org/ogrpc?network=optimism&dkey=AsCWb9aYukugqNphr9pEGw4qx3BBnloR7qCh0oup5x2S",
    BLOCK_NUMBER: 121672609,
    ccipRouterAddress: "0x3206695CaE29952f4b0c22a169725a865bc8Ce0f",
    chainSelector: 3734403246176062136n
}

const textToSend = `Hello World`;

async function initDeploySetSourse() {
    await network.provider.request({
        method: "hardhat_reset",
        params: [{
            forking: {
                jsonRpcUrl: arbitrumChain.RPC_URL,
                blockNumber: arbitrumChain.BLOCK_NUMBER
            },
        }],
    });

    const CCIPSender_UnsafeFactory = await ethers.getContractFactory("CCIPSender_UnsafeNoToken");
    const CCIPSender_Unsafe = await CCIPSender_UnsafeFactory.deploy(arbitrumChain.ccipRouterAddress);

    console.log("Deployed CCIPSender_Unsafe to: ", CCIPSender_Unsafe.target);
    return [CCIPSender_Unsafe];
}

async function initDeploySetDestination() {
    await network.provider.request({
        method: "hardhat_reset",
        params: [{
            forking: {
                jsonRpcUrl: optimismChain.RPC_URL,
                blockNumber: optimismChain.BLOCK_NUMBER
            },
        }],
    });

    const CCIPReceiver_UnsafeFactory = await ethers.getContractFactory("CCIPReceiver_Unsafe");
    let CCIPReceiver_Unsafe = await CCIPReceiver_UnsafeFactory.deploy(optimismChain.ccipRouterAddress);

    console.log("Deployed CCIPReceiver_Unsafe to: ", CCIPReceiver_Unsafe.target);
    return [CCIPReceiver_Unsafe];
}

async function main() {

    let [CCIPReceiver_Unsafe] = await initDeploySetDestination();

    console.log("-------------------------------------------");

    let [CCIPSender_Unsafe] = await initDeploySetSourse();
    const tx = await CCIPSender_Unsafe.send(CCIPReceiver_Unsafe.target, textToSend, optimismChain.chainSelector, { value: "1000000000000000000" });
    console.log("Transaction hash: ", tx.hash);
    const receipt = await tx.wait();
    if (!receipt) return;
    const evm2EvmMessage = getEvm2EvmMessage(receipt);
    if (!evm2EvmMessage) return;

    console.log("-------------------------------------------");

    [CCIPReceiver_Unsafe] = await initDeploySetDestination();

    await routeMessage(optimismChain.ccipRouterAddress, evm2EvmMessage);
    const received = await CCIPReceiver_Unsafe.text();
    console.log(`Received:`, received);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});