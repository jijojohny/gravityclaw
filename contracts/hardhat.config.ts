import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const PRIVATE_KEY = process.env.OG_PRIVATE_KEY || "0000000000000000000000000000000000000000000000000000000000000001";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    "og-testnet": {
      url: process.env.OG_CHAIN_RPC || "https://evmrpc-testnet.0g.ai",
      chainId: 16602,
      accounts: [`0x${PRIVATE_KEY}`],
    },
    "og-mainnet": {
      url: "https://evmrpc.0g.ai",
      chainId: 16661,
      accounts: [`0x${PRIVATE_KEY}`],
    },
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
