import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-contract-sizer";

import "./tasks/balance"
import "./tasks/crosstest"

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
        optimizer: {
            enabled: true,
            runs: 200
        }
    }
  }
};

export default config;
