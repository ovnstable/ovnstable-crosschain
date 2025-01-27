import { ethers } from "hardhat";
const fs = require('fs');
import AGENT_TIMELOCK_ABI from "../helpers/abi/AGENT_TIMELOCK_ABI.json";
import { getContract, initWallet } from "../helpers/script-utils";
import { Batch, PREDECESSOR } from "../helpers/governance";

const network = "arbitrum";
const filename = "02_fix_name";

let gas = {
    gasPrice: 200_000_000,
    gasLimit: 15_000_000
};

async function main(): Promise<void> {
    let timelock = await getContract("AgentTimelock", "arbitrum");
    
    const batch: Batch = JSON.parse(
        await fs.readFileSync(`./scripts/proposals/batches/${network}/${filename}.json`, 'utf8')
    );

    const addresses: string[] = [];
    const values: number[] = [];
    const datas: string[] = [];
    const salt: string[] = [];

    for (const transaction of batch.transactions) {
        addresses.push(transaction.contractInputsValues.target);
        values.push(Number.parseInt(transaction.contractInputsValues.value));
        datas.push(transaction.contractInputsValues.data);
        salt.push(transaction.contractInputsValues.salt);
    }

    console.log("timelock.address", timelock.target);
    timelock = await ethers.getContractAt(AGENT_TIMELOCK_ABI, timelock.target, await initWallet());

    for (let i = 0; i < addresses.length; i++) {
        
        const hash = await timelock.hashOperation(addresses[i], values[i], datas[i], PREDECESSOR, salt[i]);
        console.log("HashOperation: " + hash);

        const timestamp = await timelock.getTimestamp(hash);
        console.log(`Timestamp: ${timestamp}`);
        if (timestamp == 0) {
            console.error("Proposal not exists");
        }
        if (timestamp == 1) {
            console.error("Proposal already executed");
        }

        if (timestamp > 1) {
            await timelock.execute(addresses[i], values[i], datas[i], PREDECESSOR, salt[i], gas);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
