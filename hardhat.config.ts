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
    hardhat: {
      forking: {
        url: process.env.ARBITRUM_RPC,
        blockNumber: Number(process.env.ARBITRUM_BLOCK_NUMBER),
        accounts: [process.env.PRIVATE_KEY]
      }
    },
    // _arbitrum: {
    //   url: process.env.ARBITRUM_RPC,
    //   forking: {
    //     url: process.env.ARBITRUM_RPC,
    //     blockNumber: 291400100,
    //     accounts: [process.env.PRIVATE_KEY]
    //   }
    // },
    // _optimism: {
    //   url: process.env.OPTIMISM_RPC,
    //   forking: {
    //     url: process.env.OPTIMISM_RPC,
    //     blockNumber: 130135264,
    //     accounts: [process.env.PRIVATE_KEY]
    //   }
    // },
    arbitrum: {
      url: process.env.ARBITRUM_RPC,
      accounts: [process.env.PRIVATE_KEY]
    },
    optimism: {
      url: process.env.OPTIMISM_RPC,
      accounts: [process.env.PRIVATE_KEY]
    },
    sonic: {
      url: process.env.SONIC_RPC,
      accounts: [process.env.PRIVATE_KEY]
    },
    bsc: {
      url: process.env.BSC_RPC,
      accounts: [process.env.PRIVATE_KEY]
    },
    ethereum: {
      url: process.env.ETHEREUM_RPC,
      accounts: [process.env.PRIVATE_KEY]
    },
    mode: {
      url: process.env.MODE_RPC,
      accounts: [process.env.PRIVATE_KEY]
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
    customChains: [
      {
        network: "sonic",
        chainId: 146,
        urls: {
          apiURL: "https://api.sonicscan.org/api",
          browserURL: "https://sonicscan.org"
        }
      },
      {
        network: "bsc",
        chainId: 56,
        urls: {
          apiURL: "https://api.bscscan.com/api",
          browserURL: "https://bscscan.com"
        }
      },
      {
        network: "ethereum",
        chainId: 1,
        urls: {
          apiURL: "https://api.etherscan.io/api",
          browserURL: "https://etherscan.io"
        }
      },
      {
        network: "mode",
        chainId: 34443,
        urls: {
          apiURL: "https://explorer-mode-mainnet-0.t.conduit.xyz/api",
          browserURL: "https://explorer-mode-mainnet-0.t.conduit.xyz:443"
        }
      }
    ]
  },
};

export default config;
