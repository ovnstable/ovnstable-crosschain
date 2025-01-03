import { task } from "hardhat/config"
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/../.env' });

const {
    TASK_NODE,
    TASK_COMPILE,
    TASK_RUN,
    TASK_TEST,
} = require('hardhat/builtin-tasks/task-names');

async function createFolder(folderPath: string) {
    try {
        await fs.promises.mkdir(folderPath, { recursive: true });
        console.log(`Folder created successfully at ${folderPath}`);
    } catch (err) {
        console.error(`Error creating folder: ${err}`);
    }
}

async function copyFolder(source: string, destination: string) {
    try {
        await fse.copy(source, destination);
        console.log(`Folder copied from ${source} to ${destination}`);
    } catch (err) {
        console.error(`Error copying folder: ${err}`);
    }
}

function deleteFolderRecursive(folderPath: string) {
    if (fs.existsSync(folderPath)) {
        fs.readdirSync(folderPath).forEach((file) => {
            const curPath = path.join(folderPath, file);
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(folderPath);
    }
}

task("node2", 'Starts a JSON-RPC server on top of Hardhat EVM')
	.addParam("src", "The account's address")
	.addParam("dest1", "The account's address")
    .addParam("dest2", "The account's address")
    .setAction(async (taskArgs, { ethers }) => {
		const { run } = require('hardhat');

		await deleteFolderRecursive('./deployments/_S');
		await deleteFolderRecursive('./deployments/_D1');
        await deleteFolderRecursive('./deployments/_D2');

		await copyFolder('./deployments/' + taskArgs.src, './deployments/_S');
		await copyFolder('./deployments/' + taskArgs.dest1, './deployments/_D1');
        await copyFolder('./deployments/' + taskArgs.dest2, './deployments/_D2');

		await run('node', {
			...taskArgs,
			network: "hardhat",
		});
    });

task("node3", 'Starts a JSON-RPC server on top of Hardhat EVM')
	// .addParam("src", "The account's address")
	// .addParam("dest", "The account's address")
    .setAction(async (taskArgs, { ethers }) => {
		const { run } = require('hardhat');

		await deleteFolderRecursive(`./deployments/_arbitrum`);
		await deleteFolderRecursive(`./deployments/_optimism`);

		await copyFolder('./deployments/arbitrum', `./deployments/_arbitrum`);
		await copyFolder('./deployments/optimism', `./deployments/_optimism`);

		await run('node', {
			...taskArgs,
			network: "hardhat",
		});
    });

task("node4", 'Starts a JSON-RPC server on top of Hardhat EVM')
	.addParam("net", "The account's address")
    .setAction(async (taskArgs, hre, { ethers }) => {
		const { run } = require('hardhat');

        console.log("args", taskArgs);
        console.log("hre.network", hre.network);

        process.env.HARDHAT_NETWORK_FORK = taskArgs.net;
        console.log("process.env.HARDHAT_NETWORK_FORK", process.env.HARDHAT_NETWORK_FORK);
        

        hre.ovn = {
            network_of_fork: taskArgs.net,
        }

		await deleteFolderRecursive('./deployments/localhost');
		
		await copyFolder('./deployments/' + taskArgs.net, './deployments/localhost');

		await run('node', {
			...taskArgs,
			network: "hardhat"
		});
    });

    const chain = {
        "arbitrum": {
            RPC_URL: process.env.ARBITRUM_RPC,
            BLOCK_NUMBER: process.env.ARBITRUM_BLOCK_NUMBER,
        },
        "optimism": {
            RPC_URL: process.env.OPTIMISM_RPC,
            BLOCK_NUMBER: process.env.OPTIMISM_BLOCK_NUMBER,
        }
    };


task(TASK_RUN, 'Run task')
    .addOptionalParam('net', 'Override env STAND')
    .addFlag('reset', 'Override env RESET')
    .setAction(async (args, hre, runSuper) => {

        if (hre.network.name === 'localhost' && !args.net) {
            throw new Error("\"--net\" is required when running on localhost");
        }
        process.env.NET = !args.net ? hre.network.name : args.net;
        process.env.NETWORK = hre.network.name;
        process.env.RESET = args.reset;
        await runSuper(args);
    });