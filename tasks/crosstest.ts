import { task } from "hardhat/config"
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';



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
	.addParam("dest", "The account's address")
    .setAction(async (taskArgs, { ethers }) => {
		const { run } = require('hardhat');

		await deleteFolderRecursive('./deployments/_source');
		await deleteFolderRecursive('./deployments/_dest');

		await copyFolder('./deployments/' + taskArgs.src, './deployments/_source');
		await copyFolder('./deployments/' + taskArgs.dest, './deployments/_dest');

		await run('node', {
			...taskArgs,
			network: "hardhat",
		});


    });