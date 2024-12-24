import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-verify";
import "hardhat-contract-sizer";
import * as dotenv from "dotenv";

import "./tasks/balance"
import "./tasks/crosstest"

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
        optimizer: {
            enabled: true,
            runs: 200
        }
    }
  },
  networks: {
    arbitrum: {
      url: process.env.ARBITRUM_RPC,
      accounts: [process.env.PRIVATE_KEY]
    },
    optimism: {
      url: process.env.OPTIMISM_RPC,
      accounts: [process.env.PRIVATE_KEY]
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  },
};

export default config;
