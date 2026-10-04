const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying Honey Chain contracts...");

  const BatchNFT = await hre.ethers.getContractFactory("BatchNFT");
  const batchNFT = await BatchNFT.deploy();
  await batchNFT.waitForDeployment();
  const batchNFTAddress = await batchNFT.getAddress();
  console.log("BatchNFT deployed to:", batchNFTAddress);

  const HandoffLogger = await hre.ethers.getContractFactory("HandoffLogger");
  const handoffLogger = await HandoffLogger.deploy();
  await handoffLogger.waitForDeployment();
  const handoffLoggerAddress = await handoffLogger.getAddress();
  console.log("HandoffLogger deployed to:", handoffLoggerAddress);

  const HiveMonitorLogger = await hre.ethers.getContractFactory("HiveMonitorLogger");
  const hiveMonitorLogger = await HiveMonitorLogger.deploy();
  await hiveMonitorLogger.waitForDeployment();
  const hiveMonitorLoggerAddress = await hiveMonitorLogger.getAddress();
  console.log("HiveMonitorLogger deployed to:", hiveMonitorLoggerAddress);

  const addresses = {
    BatchNFT: batchNFTAddress,
    HandoffLogger: handoffLoggerAddress,
    HiveMonitorLogger: hiveMonitorLoggerAddress,
    ColdChainLogger: hiveMonitorLoggerAddress,
    network: hre.network.name || "amoy",
    deployedAt: new Date().toISOString()
  };

  fs.writeFileSync(
    path.join(__dirname, "../deployedAddresses.json"),
    JSON.stringify(addresses, null, 2)
  );
  console.log("Saved to deployedAddresses.json");

  const envPath = path.join(__dirname, "../../backend/.env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");
    envContent = envContent.replace(/BATCH_NFT_CONTRACT_ADDRESS=.*/, "BATCH_NFT_CONTRACT_ADDRESS=" + batchNFTAddress);
    envContent = envContent.replace(/HANDOFF_CONTRACT_ADDRESS=.*/, "HANDOFF_CONTRACT_ADDRESS=" + handoffLoggerAddress);
    envContent = envContent.replace(/COLDCHAIN_CONTRACT_ADDRESS=.*/, "COLDCHAIN_CONTRACT_ADDRESS=" + hiveMonitorLoggerAddress);
    if (!envContent.includes("HIVEMONITOR_CONTRACT_ADDRESS=")) {
      envContent += "\nHIVEMONITOR_CONTRACT_ADDRESS=" + hiveMonitorLoggerAddress;
    } else {
      envContent = envContent.replace(/HIVEMONITOR_CONTRACT_ADDRESS=.*/, "HIVEMONITOR_CONTRACT_ADDRESS=" + hiveMonitorLoggerAddress);
    }
    fs.writeFileSync(envPath, envContent);
    console.log("backend/.env updated with contract addresses");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});