import { HardhatRuntimeEnvironment } from 'hardhat/types';
const hre = require("hardhat") as HardhatRuntimeEnvironment;

async function main() {

  let contractAddress;

    //remotehub arbitrum
    // contractAddress = "0xd3957E44267081a3873897AE6e4f67809f8F38B5";

    // await hre.run("verify:verify", {
    //     address: contractAddress,
    //     constructorArguments: [
    //       "0x141fa059441E0ca23ce184B6A78bafD2A517DdE8"
    //     ],
    //   });


    //remotehubupgrader arbitrum
    // contractAddress = "0x66C5544D09B224fb6B7B21CD494D9049C0f0EC40";

    // await hre.run("verify:verify", {
    //     address: contractAddress,
    //     constructorArguments: [
    //       "0x141fa059441E0ca23ce184B6A78bafD2A517DdE8",
    //       "0x5ed71817935B2f94e9F3661E9b4C64C546736F42"
    //     ],
    //   });



    //remotehub optimism
    // contractAddress = "0xd2F9936CE6c0686F93A6FC2F30D23Ff10CfDCcB8";

    // await hre.run("verify:verify", {
    //     address: contractAddress,
    //     constructorArguments: [
    //       "0x3206695CaE29952f4b0c22a169725a865bc8Ce0f"
    //     ],
    //   });


    // //remotehubupgrader optimism
    // contractAddress = "0x34026FC23747EA06D90B602f0eB10Fc039739d04";
    // await hre.run("verify:verify", {
    //   address: contractAddress,
    //   constructorArguments: [
    //     "0x3206695CaE29952f4b0c22a169725a865bc8Ce0f",
    //     "0x09d39311b962aA803D32BD79DAA3Fe3ae9E5E579"
    //   ]
    // });




    // //ExchangeChild optimism
    // contractAddress = "0x6dBA7c6Cf36D577fB24639290f0338456214adF8";
    // await hre.run("verify:verify", {
    //   address: contractAddress,
    //   constructorArguments: []
    // });

    // //market optimism
    // contractAddress = "0x8f2626E1200d9F3Df7Cb04F7BDff77315DD2aa27";
    // await hre.run("verify:verify", {
    //   address: contractAddress,
    //   constructorArguments: []
    // });

    // //role manager optimism
    // contractAddress = "0xe194FEE77630D6B1485A369cc3656Ae13de9751a";
    // await hre.run("verify:verify", {
    //   address: contractAddress,
    //   constructorArguments: []
    // });

    // //portfolio manager optimism
    // contractAddress = "0x62B74F001924afD2b85F58DB1B223925586a6e91";
    // await hre.run("verify:verify", {
    //   address: contractAddress,
    //   constructorArguments: []
    // });

    // // xusd token optimism
    // contractAddress = "0x0a27EA2C6Afb8af017FFB56AFa8a578C9E3A078F";
    // await hre.run("verify:verify", {
    //   address: contractAddress,
    //   constructorArguments: []
    // });

    // //payout manager optimism
    // contractAddress = "0x706265945f30A957C2300282818A0F58D14caC09";
    // await hre.run("verify:verify", {
    //   address: contractAddress,
    //   constructorArguments: [],
    //   contract: "contracts/payoutManagers/OptimismPayoutManager.sol:OptimismPayoutManager"
    // });


    //wxusd token optimism
    contractAddress = "0xb0801b857bFCC893Ec1CCE725917ac9C40ECA717";
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [],
    });




}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

