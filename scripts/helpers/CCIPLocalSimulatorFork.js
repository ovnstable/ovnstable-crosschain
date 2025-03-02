const { ethers } = require("hardhat");
const { setBalance } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const RouterAbi = require("./abi/Router.json");
const EVM2EVMOnRampAbi = require("./abi/EVM2EVMOnRamp.json");
const EVM2EVMOffRampAbi = require("./abi/EVM2EVMOffRamp.json");


function getEvm2EvmMessage(receipt, iter = 0) {
    const evm2EvmOnRampInterface = new ethers.Interface(EVM2EVMOnRampAbi);
    let currentIter = 0;

    

    for (const log of receipt.logs) {
        try {
            const parsedLog = evm2EvmOnRampInterface.parseLog(log);
            // console.log("parsedLog", parsedLog);
            if (parsedLog?.name == `CCIPSendRequested`) {
                if (currentIter !== iter) {
                    currentIter++;
                    continue;
                }
                const [sourceChainSelector, sender, receiver, sequenceNumber, gasLimit, strict, nonce, feeToken, feeTokenAmount, data, tokenAmountsRaw, sourceTokenDataRaw, messageId] = parsedLog?.args[0];
                // console.log("sourceTokenDataRaw", sourceTokenDataRaw);
                const tokenAmounts = tokenAmountsRaw.map(([token, amount]) => ({ token, amount }));
                const sourceTokenData = sourceTokenDataRaw.map(data => data);
                const evm2EvmMessage = { sourceChainSelector, sender, receiver, sequenceNumber, gasLimit, strict, nonce, feeToken, feeTokenAmount, data, tokenAmounts, sourceTokenData, messageId };
                // console.log("evm2EvmMessage", evm2EvmMessage);
                return evm2EvmMessage;
            }
        } catch (error) {
            return null;
        }
    }

    return null;
}

async function routeMessage(routerAddress, evm2EvmMessage) {
    const router = new ethers.Contract(routerAddress, RouterAbi, ethers.provider);
    let offRamps;

    try {
        const offRampsRaw = await router.getOffRamps();
        offRamps = offRampsRaw.map(([sourceChainSelector, offRamp]) => ({ sourceChainSelector, offRamp }));
    } catch (error) {
        throw new Error(`Calling router.getOffRamps threw the following error: ${error}`);
    }

    for (const offRamp of [...offRamps].reverse()) {
        if (offRamp.sourceChainSelector == evm2EvmMessage.sourceChainSelector) {
            const evm2EvmOffRamp = new ethers.Contract(offRamp.offRamp, EVM2EVMOffRampAbi);
            const self = await ethers.getImpersonatedSigner(offRamp.offRamp);
            await setBalance(self.address, BigInt(100) ** BigInt(18));
            const offchainTokenData = new Array(evm2EvmMessage.tokenAmounts.length).fill("0x");
            const tokenGasOverrides = new Array(evm2EvmMessage.tokenAmounts.length).fill(0);
            // console.log("offchainTokenData", offchainTokenData);
            // console.log("tokenGasOverrides", tokenGasOverrides);
            await evm2EvmOffRamp.connect(self).executeSingleMessage(evm2EvmMessage, offchainTokenData, tokenGasOverrides);
            return;
        }
    }

    throw new Error(`No offRamp contract found, message has not been routed. Check your input parameters please`);
}

module.exports = {
    getEvm2EvmMessage,
    routeMessage
};
