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
    

    // let bscImpls = {
    //   remoteHub: "0xaD4939705B9d1207415A4B2E7818714455fD9137",
    //   remoteHubUpgrader: "0x09d39311b962aA803D32BD79DAA3Fe3ae9E5E579",
    //   exchange: "0x60c8A332Fd6d67F80cC4906f31ce9c5043fab992",
    //   market: "0xd9239aB483CdcE215dB4F4c344Ce6ea27E2EF9Cd",
    //   roleManager: "0xe7Fe20C74E209C51671e7c54509846EF96eBA939",
    //   portfolioManager: "0x65B6747470441c28D91B77dDFef6d4969805089b",
    //   xusdToken: "0xB04ae3248216cE8A5B52620820f7eDe27281AE10",
    //   payoutManager: "0xA9c6b33CDD4D5EA1929826A846a1c04Fb3a5732e",
    //   wrappedXusdToken: "0xD63a1F77f159ED0D3Ac83dA100FdE4AdC14210Bf",
    // }

    // for (const [key, value] of Object.entries(bscImpls)) {
      
    //   let name = "";
    //   if (key === "payoutManager") {
    //       name = "contracts/payoutManagers/BscPayoutManager.sol:BscPayoutManager";
    //   }

    //   let constructorArguments = [];

    //   if (key === "remoteHub") {
    //     constructorArguments = ["0x34B03Cb9086d7D758AC55af71584F81A598759FE"];
    //   } else if (key === "remoteHubUpgrader") {
    //     constructorArguments = ["0x34B03Cb9086d7D758AC55af71584F81A598759FE", "0x5560Eb50028b9f6547a83b8fAa52Ab9CB315aC68"];
    //   }


    //   if (name === "") {
    //     await hre.run("verify:verify", {
    //         address: value,
    //         constructorArguments: constructorArguments
    //     });
    //   } else {
    //     await hre.run("verify:verify", {
    //       address: value,
    //       constructorArguments: constructorArguments,
    //       contract: name
    //     });
    //   }

    //   console.log("Verified ", key, " ", value);
    // }


    // let ethImpls = {
    //   // remoteHub: "0xe2b3E27f96902D88C95610b72f4C76EBfB76f1F0",
    //   // remoteHubUpgrader: "0xE597c0a82c74E97Dc3B18bEA0D2585Bc1E7e5463",
    //   exchange: "0x1c592E055Ec06A68f89499fe0aCDd262b30Da361",
    //   market: "0xCd892521038cb29d7Cc86D9149a3e1433aa3BfD1",
    //   roleManager: "0xA7D93e5a129f1DAA5d615141bB5E02be432d9679",
    //   xusdToken: "0xd9c4B3d7D014A5C37e751D5DF9b209213d04d91c",
    //   payoutManager: "0xaD4939705B9d1207415A4B2E7818714455fD9137",
    //   wrappedXusdToken: "0x95aC4b073c854e74212782ceFd579613d210B521",

    // }

    // for (const [key, value] of Object.entries(ethImpls)) {
      
    //   let name = "";
    //   if (key === "payoutManager") {
    //       name = "contracts/payoutManagers/EthereumPayoutManager.sol:EthereumPayoutManager";
    //   }

    //   let constructorArguments = [];

    //   if (key === "remoteHub") {
    //     constructorArguments = ["0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D"];
    //   } else if (key === "remoteHubUpgrader") {
    //     constructorArguments = ["0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D", "0x85de18bc9719cf673a9f4df709cbab701bcc9704"];
    //   }


    //   if (name === "") {
    //     await hre.run("verify:verify", {
    //         address: value,
    //         constructorArguments: constructorArguments
    //     });
    //   } else {
    //     await hre.run("verify:verify", {
    //       address: value,
    //       constructorArguments: constructorArguments,
    //       contract: name
    //     });
    //   }

    //   console.log("Verified ", key, " ", value);
    // }

    // let modeImpls = {
    //   remoteHub: "0x336523Ca318Ea0d631F72cF4875e6796BB2e617e",
    //   remoteHubUpgrader: "0x1705E9E103dBaa234CD6D27B0E9CA8F4E4D47ec7",
    //   exchange: "0x29A0dc4f509873673B7682B60598d393A1e591b7",
    //   market: "0xfEeb025dA416cc5B8f8bf0988d0cF2eA4362c0b9",
    //   roleManager: "0xCCd1fBCE567E74d650F680d923D1BCc7C5130d4D",
    //   xusdToken: "0x798295434111F5E088Ebeb892773E6A925d8E011",
    //   payoutManager: "0x5560Eb50028b9f6547a83b8fAa52Ab9CB315aC68",
    //   wrappedXusdToken: "0x500b4fed3a3D07A9EC4B97e1D223fE6109fd5D67",
    // }

    // for (const [key, value] of Object.entries(modeImpls)) {
      
    //   let name = "";
    //   if (key === "payoutManager") {
    //       name = "contracts/payoutManagers/ModePayoutManager.sol:ModePayoutManager";
    //   }

    //   let constructorArguments = [];

    //   if (key === "remoteHub") {
    //     constructorArguments = ["0x24C40f13E77De2aFf37c280BA06c333531589bf1"];
    //   } else if (key === "remoteHubUpgrader") {
    //     constructorArguments = ["0x24C40f13E77De2aFf37c280BA06c333531589bf1", "0x85de18bc9719cf673a9f4df709cbab701bcc9704"];
    //   }


    //   if (name === "") {
    //     await hre.run("verify:verify", {
    //         address: value,
    //         constructorArguments: constructorArguments
    //     });
    //   } else {
    //     await hre.run("verify:verify", {
    //       address: value,
    //       constructorArguments: constructorArguments,
    //       contract: name
    //     });
    //   }

    //   console.log("Verified ", key, " ", value);
    // }


    // await hre.run("verify:verify", {
    //   address: "0x00bBD0B38E9374c6C8D049424d3D25586A3cffa2",
    //   constructorArguments: ["0x141fa059441E0ca23ce184B6A78bafD2A517DdE8"]
    // });


    // await hre.run("verify:verify", {
    //   address: "0x361BEb3e0b9f5F6B317D43F20eDC0fd4139b7BEe",
    //   constructorArguments: ["0x24C40f13E77De2aFf37c280BA06c333531589bf1"]
    // });

    // return;

    // await hre.run("verify:verify", {
    //   address: "0xF8f2578037f3F94f70c6921F38873f7E7C0B2D56",
    //   constructorArguments: ["0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D"]
    // });

    // return;

    // await hre.run("verify:verify", {
    //   address: "0x9A597965AeD9aaD4ab8385F9715c63934D30B824",
    //   constructorArguments: ["0x34B03Cb9086d7D758AC55af71584F81A598759FE"]
    // });

    // return;

    // await hre.run("verify:verify", {
    //   address: "0x0674F501c08EA1669D2a768750e25f665Ec3a366",
    //   constructorArguments: ["0x3206695CaE29952f4b0c22a169725a865bc8Ce0f"]
    // });


    // let sonicImpls = {
    //   // remoteHub: "0xd9c4B3d7D014A5C37e751D5DF9b209213d04d91c",
    //   // remoteHubUpgrader: "0xaD4939705B9d1207415A4B2E7818714455fD9137",
    //   // exchange: "0x536e74CfD9FAABf7B06181fA5CfD863De65D79eA",
    //   // market: "0xd2F9936CE6c0686F93A6FC2F30D23Ff10CfDCcB8",
    //   // roleManager: "0x8691117eD0244F340951f3f474FCeec2973EfAc7",
    //   // xusdToken: "0x60c8A332Fd6d67F80cC4906f31ce9c5043fab992",
    //   // payoutManager: "0xd9239aB483CdcE215dB4F4c344Ce6ea27E2EF9Cd",
    //   wrappedXusdToken: "0xdB783CD906BB4eF9DF2Aa43CcCc23c4770D100e0",
    // }

    // for (const [key, value] of Object.entries(sonicImpls)) {
      
    //   let name = "";
    //   if (key === "payoutManager") {
    //       name = "contracts/payoutManagers/SonicPayoutManager.sol:SonicPayoutManager";
    //   }

    //   let constructorArguments = [];

    //   if (key === "remoteHub") {
    //     constructorArguments = ["0xB4e1Ff7882474BB93042be9AD5E1fA387949B860"];
    //   } else if (key === "remoteHubUpgrader") {
    //     constructorArguments = ["0xB4e1Ff7882474BB93042be9AD5E1fA387949B860", "0xd9c4B3d7D014A5C37e751D5DF9b209213d04d91c"];
    //   }


    //   if (name === "") {
    //     await hre.run("verify:verify", {
    //         address: value,
    //         constructorArguments: constructorArguments
    //     });
    //   } else {
    //     await hre.run("verify:verify", {
    //       address: value,
    //       constructorArguments: constructorArguments,
    //       contract: name
    //     });
    //   }

    //   console.log("Verified ", key, " ", value);
    // }


    let addr = "0xde43088434d4a23b42c9228c0fc09d24c9af1119";

        await hre.run("verify:verify", {
            address: addr,
            constructorArguments: []
        });



}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

