// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

contract HiveMonitorLogger is Ownable {
    struct HiveReading {
        string batchId;
        int256 temperature;
        int256 humidity;
        uint256 weightKg;
        uint256 acousticHealthScore; // 0-100 score
        string location;
        string sensorId;
        uint256 timestamp;
        bool isAnomaly;
    }

    mapping(string => HiveReading[]) public readings;
    mapping(string => bool) public batchBreached;

    event HiveDataLogged(string batchId, int256 temperature, int256 humidity, uint256 weightKg, uint256 acousticHealthScore, string sensorId, uint256 timestamp);
    event AnomalyDetected(string batchId, string details, uint256 timestamp);

    function logHiveData(
        string memory batchId,
        int256 temperature,
        int256 humidity,
        uint256 weightKg,
        uint256 acousticHealthScore,
        string memory location,
        string memory sensorId,
        bool isAnomaly
    ) public {
        readings[batchId].push(HiveReading({
            batchId: batchId,
            temperature: temperature,
            humidity: humidity,
            weightKg: weightKg,
            acousticHealthScore: acousticHealthScore,
            location: location,
            sensorId: sensorId,
            timestamp: block.timestamp,
            isAnomaly: isAnomaly
        }));

        if (isAnomaly) {
            batchBreached[batchId] = true;
            emit AnomalyDetected(batchId, "Hive sensor anomaly detected", block.timestamp);
        }

        emit HiveDataLogged(batchId, temperature, humidity, weightKg, acousticHealthScore, sensorId, block.timestamp);
    }

    function getReadings(string memory batchId) public view returns (HiveReading[] memory) {
        return readings[batchId];
    }

    function isBreached(string memory batchId) public view returns (bool) {
        return batchBreached[batchId];
    }

    function getLatestReading(string memory batchId) public view returns (HiveReading memory) {
        uint256 len = readings[batchId].length;
        if (len == 0) {
            return HiveReading({
                batchId: batchId,
                temperature: 0,
                humidity: 0,
                weightKg: 0,
                acousticHealthScore: 0,
                location: "",
                sensorId: "",
                timestamp: 0,
                isAnomaly: false
            });
        }
        return readings[batchId][len - 1];
    }
}
