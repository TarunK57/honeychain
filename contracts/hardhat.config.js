require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.19",
  networks: {
    localhost: {
      url: process.env.LOCAL_RPC_URL || "http://127.0.0.1:8545",
      // Hardhat node's first account. This public test key is for local
      // development only and matches backend/.env's ADMIN_PRIVATE_KEY.
      accounts: ["0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"],
    },
    amoy: {
      url: process.env.POLYGON_AMOY_RPC || "https://rpc-amoy.polygon.technology",
      accounts: process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== "PLACEHOLDER" ? [process.env.PRIVATE_KEY] : [],
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC || "",
      accounts: process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== "PLACEHOLDER" ? [process.env.PRIVATE_KEY] : [],
    },
  },
};
