import { HardhatRuntimeEnvironment } from "hardhat/types";
import { useEnvironment as useHardhatEnvironment } from "@nomicfoundation/hardhat-toolbox/network-helpers";

export function useEnvironment() {
  const env = useHardhatEnvironment() as HardhatRuntimeEnvironment;
  require("@nomicfoundation/hardhat-toolbox/network-helpers/register");
  return env;
} 