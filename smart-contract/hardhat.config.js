require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Throw clear error if env vars are missing
if (!process.env.SEPOLIA_URL) {
  throw new Error("Please set SEPOLIA_URL in .env file");
}
if (!process.env.PRIVATE_KEY) {
  throw new Error("Please set PRIVATE_KEY in .env file");
}

module.exports = {
  solidity: "0.8.19",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_URL,
      accounts: [process.env.PRIVATE_KEY]
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache"
  }
};