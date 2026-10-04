# Honey Chain Contracts

Hardhat workspace for Honey Chain's on-chain batch, custody, and hive-monitor records.

## Contracts

- `BatchNFT.sol` stores honey batch provenance and lets the owner revoke or expire a batch.
- `HandoffLogger.sol` records custody transfers and optional location coordinates.
- `HiveMonitorLogger.sol` records hive readings and anomaly flags.

## Local development

```bash
npm install
cp .env.example .env
npm run node:local
```

In another terminal, deploy the contracts to the local Hardhat node:

```bash
npm run deploy:local
```

Copy the printed contract addresses into `backend/.env`. Use a development-only wallet key for the local node. Never put a production wallet key in source control.

## Compile and test

```bash
npm run compile
npm test
```

## Test network deployment

Set `POLYGON_AMOY_RPC` and `PRIVATE_KEY` in `.env`, then run:

```bash
npm run deploy:amoy
```

Keep real signing keys and RPC credentials private.
