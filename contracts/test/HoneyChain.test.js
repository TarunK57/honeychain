const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Honey Chain contracts", function () {
  let batchNFT;
  let handoffLogger;
  let hiveMonitorLogger;
  let owner;
  let otherAccount;

  beforeEach(async function () {
    [owner, otherAccount] = await ethers.getSigners();

    const BatchNFT = await ethers.getContractFactory("BatchNFT");
    batchNFT = await BatchNFT.deploy();
    await batchNFT.waitForDeployment();

    const HandoffLogger = await ethers.getContractFactory("HandoffLogger");
    handoffLogger = await HandoffLogger.deploy();
    await handoffLogger.waitForDeployment();

    const HiveMonitorLogger = await ethers.getContractFactory("HiveMonitorLogger");
    hiveMonitorLogger = await HiveMonitorLogger.deploy();
    await hiveMonitorLogger.waitForDeployment();
  });

  describe("BatchNFT", function () {
    const mintBatch = (batchId = "HONEY-001") =>
      batchNFT.mintBatch(batchId, "KEEPER-001", "HIVE-01", 1_759_680_000, "12.97,77.59", "Wildflower", 24);

    it("mints and returns batch provenance", async function () {
      await mintBatch();
      const batch = await batchNFT.getBatch("HONEY-001");

      expect(batch.batchId).to.equal("HONEY-001");
      expect(batch.floralSource).to.equal("Wildflower");
      expect(batch.quantityKg).to.equal(24n);
      expect(batch.status).to.equal("active");
      expect(await batchNFT.isBatchValid("HONEY-001")).to.equal(true);
    });

    it("does not allow duplicate batch IDs", async function () {
      await mintBatch();
      await expect(mintBatch()).to.be.revertedWith("Batch already minted");
    });

    it("restricts minting to the contract owner", async function () {
      await expect(
        batchNFT.connect(otherAccount).mintBatch("HONEY-002", "KEEPER-001", "HIVE-01", 1_759_680_000, "12.97,77.59", "Acacia", 18)
      ).to.be.reverted;
    });

    it("marks a revoked batch as invalid", async function () {
      await mintBatch();
      await batchNFT.revokeBatch("HONEY-001");

      expect(await batchNFT.isBatchValid("HONEY-001")).to.equal(false);
      expect((await batchNFT.getBatch("HONEY-001")).status).to.equal("revoked");
    });
  });

  describe("HandoffLogger", function () {
    it("records custody transfers and their locations", async function () {
      await handoffLogger.logHandoff("HONEY-001", "beekeeper", "collection_center", "Apiary One", "North Center", "QR-001", 1297000, 7759000);
      await handoffLogger.logHandoff("HONEY-001", "collection_center", "retailer", "North Center", "Market One", "QR-002", 1297100, 7759100);

      const handoffs = await handoffLogger.getHandoffs("HONEY-001");
      expect(await handoffLogger.getHandoffCount("HONEY-001")).to.equal(2n);
      expect(handoffs[0].fromEntity).to.equal("beekeeper");
      expect(handoffs[1].toEntity).to.equal("retailer");
      expect(handoffs[0].locationLat).to.equal(1297000n);
    });
  });

  describe("HiveMonitorLogger", function () {
    it("records hive data and flags anomalous readings", async function () {
      await hiveMonitorLogger.logHiveData("HONEY-001", 34, 62, 21, 88, "Apiary One", "SENSOR-01", false);
      await hiveMonitorLogger.logHiveData("HONEY-001", 42, 50, 19, 63, "Apiary One", "SENSOR-01", true);

      const readings = await hiveMonitorLogger.getReadings("HONEY-001");
      const latest = await hiveMonitorLogger.getLatestReading("HONEY-001");
      expect(readings).to.have.length(2);
      expect(await hiveMonitorLogger.isBreached("HONEY-001")).to.equal(true);
      expect(latest.temperature).to.equal(42n);
      expect(latest.isAnomaly).to.equal(true);
    });

    it("returns an empty reading for an unknown batch", async function () {
      const latest = await hiveMonitorLogger.getLatestReading("UNKNOWN");
      expect(latest.timestamp).to.equal(0n);
      expect(await hiveMonitorLogger.isBreached("UNKNOWN")).to.equal(false);
    });
  });
});
