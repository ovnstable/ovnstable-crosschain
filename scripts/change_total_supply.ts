import { getContract } from "./helpers/script-utils";
import { Contract } from "ethers";

async function main(): Promise<void> {

    let xusdToken: Contract = await getContract('XusdToken');

    await xusdToken.changeTotalSupply("839515520013658267725998818");
    
    console.log("done");
}

main()
    .then(() => process.exit(0))
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

