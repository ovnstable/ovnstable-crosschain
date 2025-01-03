import { getContract } from "./helpers/script-utils";
import { Contract } from "ethers";

async function main(): Promise<void> {

    let xusdToken: Contract = await getContract('XusdToken');

    console.log(await xusdToken.name());
    console.log(await xusdToken.symbol());
}

main()
    .then(() => process.exit(0))
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

