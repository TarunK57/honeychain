const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL || process.env.POLYGON_AMOY_RPC || "https://rpc-amoy.polygon.technology");

// Load ABIs
const batchNFTAbi = require('../abi/BatchNFT.json');
const handoffAbi = require('../abi/HandoffLogger.json');
const hiveMonitorAbi = require('../abi/HiveMonitorLogger.json');

// Create contract instances
const batchNFTContract = new ethers.Contract(
  process.env.BATCH_NFT_CONTRACT_ADDRESS,
  batchNFTAbi,
  provider
);

const handoffContract = new ethers.Contract(
  process.env.HANDOFF_CONTRACT_ADDRESS,
  handoffAbi,
  provider
);

const hiveMonitorContractAddress = process.env.HIVEMONITOR_CONTRACT_ADDRESS || process.env.COLDCHAIN_CONTRACT_ADDRESS;

const hiveMonitorContract = new ethers.Contract(
  hiveMonitorContractAddress,
  hiveMonitorAbi,
  provider
);

// Create a signer using ADMIN_PRIVATE_KEY
const signer = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);

console.log("Honey Chain blockchain config initialized");

module.exports = {
  provider,
  batchNFTContract,
  handoffContract,
  hiveMonitorContract,
  coldChainContract: hiveMonitorContract,
  signer
};
