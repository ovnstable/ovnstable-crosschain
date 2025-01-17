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
    // contractAddress = "0xb0801b857bFCC893Ec1CCE725917ac9C40ECA717";
    // await hre.run("verify:verify", {
    //   address: contractAddress,
    //   constructorArguments: [],
    // });

    //remotehub optimism
    // contractAddress = "0x72cD6A93c6913c99ACcA4bB3122C8ac9C06ab13A";

    // await hre.run("verify:verify", {
    //     address: contractAddress,
    //     constructorArguments: [
    //       "0x3206695CaE29952f4b0c22a169725a865bc8Ce0f"
    //     ],
    //   });


    //ExchangeChild optimism
    // contractAddress = "0x500b4fed3a3D07A9EC4B97e1D223fE6109fd5D67";
    // await hre.run("verify:verify", {
    //   address: contractAddress,
    //   constructorArguments: []
    // });

    //xusd token optimism
    // contractAddress = "0x4d584650c4B1Ca5fCcE5184E02a717B5B94e9656";
    // await hre.run("verify:verify", {
    //   address: contractAddress,
    //   constructorArguments: []
    // });

    // let exchangeImpl = "0x436cF8bE54d1a062cB513cD13Fc69D8DFafF54f2";
    // let marketImpl = "0x460ad2b4e7329923458DaC0aACA6a71C49C848a1";
    // let roleManagerImpl = "0x208F11B866A13804f605F0C50Dd6386Af00c6f3b";
    // let portfolioManagerImpl = "0x0B82b3D5eAa6cCAF521f8fB00bE5F572a75d5e3c";
    // let xusdTokenImpl = "0x53c905E4fbE64bd03c15CD16b330D2Cc20EcA4E5";
    // let wrappedXusdTokenImpl = "0x9D0Fbc852dEcCb7dcdd6CB224Fa7561EfDa74411";
    // let payoutManagerImpl = "0x9D43BABA222261e5cD9966F1A9E9cc709c491240";

    // await hre.run("verify:verify", {
    //   address: exchangeImpl,
    //   constructorArguments: []
    // });

    // await hre.run("verify:verify", {
    //   address: marketImpl,
    //   constructorArguments: []
    // });

    // await hre.run("verify:verify", {
    //   address: roleManagerImpl,
    //   constructorArguments: []
    // });

    // await hre.run("verify:verify", {
    //   address: portfolioManagerImpl,
    //   constructorArguments: []
    // });

    // await hre.run("verify:verify", {
    //   address: xusdTokenImpl,
    //   constructorArguments: []
    // }); 

    // await hre.run("verify:verify", {
    //   address: wrappedXusdTokenImpl,
    //   constructorArguments: []
    // });

    // await hre.run("verify:verify", {
    //   address: payoutManagerImpl,
    //   constructorArguments: [],
    //   contract: "contracts/payoutManagers/ArbitrumPayoutManager.sol:ArbitrumPayoutManager"
    // });

    // wxusd token optimism
    // contractAddress = "0x1705E9E103dBaa234CD6D27B0E9CA8F4E4D47ec7";
    // await hre.run("verify:verify", {
    //   address: contractAddress,
    //   constructorArguments: [],
    // });
    

    let bscImpls = {
      remoteHub: "0xaD4939705B9d1207415A4B2E7818714455fD9137",
      remoteHubUpgrader: "0x09d39311b962aA803D32BD79DAA3Fe3ae9E5E579",
      exchange: "0x60c8A332Fd6d67F80cC4906f31ce9c5043fab992",
      market: "0xd9239aB483CdcE215dB4F4c344Ce6ea27E2EF9Cd",
      roleManager: "0xe7Fe20C74E209C51671e7c54509846EF96eBA939",
      portfolioManager: "0x65B6747470441c28D91B77dDFef6d4969805089b",
      xusdToken: "0xB04ae3248216cE8A5B52620820f7eDe27281AE10",
      payoutManager: "0xA9c6b33CDD4D5EA1929826A846a1c04Fb3a5732e",
      wrappedXusdToken: "0xD63a1F77f159ED0D3Ac83dA100FdE4AdC14210Bf",
    }

    for (const [key, value] of Object.entries(bscImpls)) {
      
      let name = "";
      if (key === "payoutManager") {
          name = "contracts/payoutManagers/BscPayoutManager.sol:BscPayoutManager";
      }

      let constructorArguments = [];

      if (key === "remoteHub") {
        constructorArguments = ["0x34B03Cb9086d7D758AC55af71584F81A598759FE"];
      } else if (key === "remoteHubUpgrader") {
        constructorArguments = ["0x34B03Cb9086d7D758AC55af71584F81A598759FE", "0x5560Eb50028b9f6547a83b8fAa52Ab9CB315aC68"];
      }


      if (name === "") {
        await hre.run("verify:verify", {
            address: value,
            constructorArguments: constructorArguments
        });
      } else {
        await hre.run("verify:verify", {
          address: value,
          constructorArguments: constructorArguments,
          contract: name
        });
      }

      console.log("Verified ", key, " ", value);
    }

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

