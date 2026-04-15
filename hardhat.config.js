require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: ".env.contracts" });

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0x" + "0".repeat(64);
const ALCHEMY_BASE_SEPOLIA  = process.env.ALCHEMY_BASE_SEPOLIA  || "";
const ALCHEMY_BASE_MAINNET  = process.env.ALCHEMY_BASE_MAINNET  || "";
const BASESCAN_API_KEY      = process.env.BASESCAN_API_KEY      || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {},
    baseSepolia: {
      url: ALCHEMY_BASE_SEPOLIA,
      accounts: [DEPLOYER_PRIVATE_KEY],
      chainId: 84532,
    },
    base: {
      url: ALCHEMY_BASE_MAINNET,
      accounts: [DEPLOYER_PRIVATE_KEY],
      chainId: 8453,
    },
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
  },
  etherscan: {
    apiKey: BASESCAN_API_KEY,
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL:     "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL:     "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
    ],
  },
};
