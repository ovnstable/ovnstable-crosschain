import { ethers } from "hardhat";
import * as hre from "hardhat";
import { getContract,
    showM2M,
    execTimelock,
    initWallet,
    convertWeights,
    getPrice,
    transferETH,
} from "@overnight-contracts/common/utils/script-utils";
import { createProposal, testProposal, testUsdPlus, testStrategy } from "@overnight-contracts/common/utils/governance";
import { BSC } from "@overnight-contracts/common/utils/assets";
import { Roles } from "@overnight-contracts/common/utils/roles";
import { fromE6 } from "@overnight-contracts/common/utils/decimals";
import * as fs from "fs";
import AGENT_TIMELOCK_ABI from "@overnight-contracts/governance-new/scripts/abi/AGENT_TIMELOCK_ABI.json";

const PREDECESSOR =
    "0x0000000000000000000000000000000000000000000000000000000000000000";

interface Transaction {
    contractInputsValues: {
        target: string;
        value: string;
        data: string;
        salt: string;
    };
}

interface Batch {
    transactions: Transaction[];
}

async function main(): Promise<void> {
    let timelock = await getContract("AgentTimelock");

    let network: string = hre.network.name;
    if (network === "localhost") {
        network = process.env.STAND || "";
    }

    const name = "01_upgrade_to_ccip";
    const batch: Batch = JSON.parse(
        await fs.readFileSync(`./batches/${network}/${name}.json`, 'utf8')
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
        console.log(transaction);
    }

    timelock = await ethers.getContractAt(
        AGENT_TIMELOCK_ABI,
        timelock.address,
        await initWallet()
    );

    for (let i = 0; i < addresses.length; i++) {
        const hash = await timelock.hashOperation(
            addresses[i],
            values[i],
            datas[i],
            PREDECESSOR,
            salt[i]
        );
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
            await (
                await timelock.execute(
                    addresses[i],
                    values[i],
                    datas[i],
                    PREDECESSOR,
                    salt[i],
                    {
                        gasPrice: 200_000_000,
                        gasLimit: 15_000_000
                    }
                )
            ).wait();
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
