// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BatchNFT is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;

    struct BatchData {
        string batchId;
        string beekeeperId;
        string hiveId;
        uint256 harvestDate;
        string gpsLocation;
        string floralSource;
        uint256 quantityKg;
        string status; // active, revoked, expired
        address mintedBy;
    }

    mapping(uint256 => BatchData) public batches;
    mapping(string => uint256) public batchIdToToken;

    event BatchMinted(uint256 tokenId, string batchId, string beekeeperId, string hiveId, address mintedBy);
    event BatchRevoked(string batchId, address revokedBy);
    event BatchExpired(string batchId);

    constructor() ERC721("HoneyChainBatch", "HCB") {}

    function mintBatch(
        string memory batchId,
        string memory beekeeperId,
        string memory hiveId,
        uint256 harvestDate,
        string memory gpsLocation,
        string memory floralSource,
        uint256 quantityKg
    ) public onlyOwner {
        require(batchIdToToken[batchId] == 0, "Batch already minted");

        _tokenIds++;
        uint256 newItemId = _tokenIds;

        _mint(msg.sender, newItemId);

        batches[newItemId] = BatchData({
            batchId: batchId,
            beekeeperId: beekeeperId,
            hiveId: hiveId,
            harvestDate: harvestDate,
            gpsLocation: gpsLocation,
            floralSource: floralSource,
            quantityKg: quantityKg,
            status: "active",
            mintedBy: msg.sender
        });

        batchIdToToken[batchId] = newItemId;

        emit BatchMinted(newItemId, batchId, beekeeperId, hiveId, msg.sender);
    }

    function getBatch(string memory batchId) public view returns (BatchData memory) {
        uint256 tokenId = batchIdToToken[batchId];
        require(tokenId != 0, "Batch not found");
        return batches[tokenId];
    }

    function revokeBatch(string memory batchId) public onlyOwner {
        uint256 tokenId = batchIdToToken[batchId];
        require(tokenId != 0, "Batch not found");
        batches[tokenId].status = "revoked";
        emit BatchRevoked(batchId, msg.sender);
    }

    function markExpired(string memory batchId) public onlyOwner {
        uint256 tokenId = batchIdToToken[batchId];
        require(tokenId != 0, "Batch not found");
        batches[tokenId].status = "expired";
        emit BatchExpired(batchId);
    }

    function isBatchValid(string memory batchId) public view returns (bool) {
        uint256 tokenId = batchIdToToken[batchId];
        if (tokenId == 0) return false;
        
        BatchData memory batch = batches[tokenId];
        bool isActive = keccak256(abi.encodePacked(batch.status)) == keccak256(abi.encodePacked("active"));
        
        return isActive;
    }
}
