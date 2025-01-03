import { Contract } from 'ethers';
const hre = require('hardhat');
const fs = require("fs");
import { ethers } from 'hardhat';
import appRoot from 'app-root-path';
import { getContract } from './script-utils';
const path = require('path');
const proposalStates = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];
const { platform } = process;
const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/../.env' });

let chainId = 42161;
let stand = "arbitrum";

const PREDECESSOR = "0x0000000000000000000000000000000000000000000000000000000000000000";

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

interface BatchTransaction {
    to: string;
    value: string;
    data: string | null;
    contractMethod: {
        inputs: Array<{
            internalType: string;
            name: string;
            type: string;
        }>;
        name: string;
        payable: boolean;
    };
    contractInputsValues: {
        target: string;
        value: string;
        data: string;
        predecessor: string;
        salt: string;
        delay: string;
    };
}

interface Batch {
    version: string;
    chainId: number;
    createdAt: number;
    meta: {
        name: string;
        description: string;
        txBuilderVersion: string;
        createdFromSafeAddress: string;
        createdFromOwnerAddress: string;
        checksum: string;
    };
    transactions: BatchTransaction[];
}

interface TestResult {
    name: string;
    result: string | number | Date;
}

async function createProposal(
    name: string, 
    proposalItems: ProposalItems
): Promise<void> {

    let timelock: Contract = await getContract('AgentTimelock', stand);

    let ovnAgent = await timelock.ovnAgent();
    let minDelay = await timelock.getMinDelay();


    let batch: Batch = {
        version: "1.0",
        chainId: chainId,
        createdAt: new Date().getTime(),
        meta: {
            name: "Transactions Batch",
            description: "",
            txBuilderVersion: "1.16.2",
            createdFromSafeAddress: ovnAgent,
            createdFromOwnerAddress: "",
            checksum: ""
        },
        transactions: [

        ]
    }

    for (let i = 0; i < proposalItems.address.length; i++) {
        batch.transactions.push(createTransaction(timelock, minDelay, proposalItems.address[i], proposalItems.value[i], proposalItems.abi[i]))
    }

    let batchName;

    if (platform === 'win32'){
        batchName = `${appRoot.path}\\scripts\\proposals\\batches\\${stand}\\${name}.json`;
    }else {
        batchName = `${appRoot.path}/scripts/proposals/batches/${stand}/${name}.json`;
    }

    let data = JSON.stringify(batch);
    console.log(data)
    await fs.writeFileSync(batchName, data);
}

function createTransaction(
    timelock: Contract, 
    delay: number, 
    address: string, 
    value: number, 
    data: string
): BatchTransaction {
    const abiCoder = new ethers.AbiCoder();
    const encodedTimestamp = abiCoder.encode(['uint256'], [(new Date().getTime())]);
    let salt = ethers.keccak256(encodedTimestamp);

    return {
        "to": timelock.target as string,
        "value": "0",
        "data": null,
        "contractMethod": {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "target",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "value",
                    "type": "uint256"
                },
                {
                    "internalType": "bytes",
                    "name": "data",
                    "type": "bytes"
                },
                {
                    "internalType": "bytes32",
                    "name": "predecessor",
                    "type": "bytes32"
                },
                {
                    "internalType": "bytes32",
                    "name": "salt",
                    "type": "bytes32"
                },
                {
                    "internalType": "uint256",
                    "name": "delay",
                    "type": "uint256"
                }
            ],
            "name": "schedule",
            "payable": false
        },
        "contractInputsValues": {
            "target": address,
            "value": `${value}`,
            "data": `${data}`,
            "predecessor": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "salt": salt,
            "delay": `${delay}`
        }
    }
}

async function testProposal(
    proposalItems: ProposalItems
): Promise<void> {

    // console.log('Count transactions: ' + addresses.length);

    await execTimelock(async (timelock: Contract)=>{

        for (let i = 0; i < proposalItems.address.length; i++) {

            let address = proposalItems.address[i];
            let abi = proposalItems.abi[i];

            let tx = {
                from: timelock.target,
                to: address,
                value: 0,
                data: abi
            }

            // console.log(`Transaction: index: [${i}] address: [${address}]`)
            await (await timelock.sendTransaction(tx)).wait();
        }
    })
}

async function getProposalState(proposalId: string): Promise<string> {
    let governor = await getContract('OvnGovernor', stand);
    let state = proposalStates[await governor.state(proposalId)];
    console.log('Proposal state: ' + state);

    let data = await governor.proposals(proposalId);

    console.log('StartBlock:     ' + data.startBlock);
    console.log('EndBlock:       ' + data.endBlock);
    console.log('CurrentBlock:   ' + await ethers.provider.getBlockNumber());
    console.log('ForVotes:       ' + data.forVotes);

    return state;
}

async function execTimelock(exec: any) {

    let timelock = await getContract('AgentTimelock', stand);

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [timelock.target],
    });

    await transferETH(10, timelock.target);
    
    const timelockAccount = await hre.ethers.getSigner(timelock.target);
    
    await exec(timelockAccount);

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [timelock.target],
    });
}

async function transferETH(amount: number, to: string) {
    let privateKey = "0xea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0"; // Ganache key
    const signer = new ethers.Wallet(privateKey, ethers.provider);

    await signer.sendTransaction({
        to: to,
        value: ethers.parseEther(amount.toString())
    });
}

type ProposalItem = {
    contract: Contract,
    methodName: string,
    params: any[]
}

type ProposalItems = {
    address: string[],
    value: number[],
    abi: string[]
}

async function addProposalItems(items: ProposalItem[]) : Promise<ProposalItems> {
    let address: string[] = [];
    let value: number[] = [];
    let abi: string[] = [];

    for (const item of items) {
        address.push(item.contract.target as string);
        value.push(0);
        abi.push(item.contract.interface.encodeFunctionData(item.methodName, item.params));
    }

    return {
        address,
        value,
        abi
    } as unknown as ProposalItems;
}

export {
    createProposal,
    testProposal,
    getProposalState,
    addProposalItems,
    ProposalItem,
    ProposalItems,
    Batch,
    Transaction,
    BatchTransaction,
    PREDECESSOR
};