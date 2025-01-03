import { getContract } from "./helpers/script-utils";
import { Contract } from "ethers";

async function main(): Promise<void> {

    let xusdToken: Contract = await getContract('XusdToken');

    await xusdToken.changeTotalSupply("843376254870476897886799241");
    
    console.log("done");
}

main()
    .then(() => process.exit(0))
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

