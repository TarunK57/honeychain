# Honey Chain

Honey Chain is a traceability platform for beekeepers and honey supply chains. It records harvest batches and handoffs, issues QR codes for verification, and gives operators a view of batch activity and locations.

## What it includes

- Public QR verification for honey batches
- Beekeeper, collection-center administrator, and governance portals
- Batch minting, inventory, custody handoffs, and scan history
- Map and dashboard views for recorded batch and scan locations
- Solidity contracts for batch records, handoffs, and hive monitoring
- Supabase-backed accounts and data, with a local development fallback

## Run locally

Use Node.js 18 or newer. Install each workspace's dependencies:

```bash
cd backend && npm install
cd ../frontend && npm install
cd ../contracts && npm install
```

Configure the backend and frontend environment files before starting the app:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill in the Supabase project URL and keys. The backend also needs valid contract addresses and a blockchain RPC URL for on-chain operations. See [contracts/README.md](contracts/README.md) for contract deployment scripts.

Start the API and website in separate terminals:

```bash
cd backend && npm start
```

```bash
cd frontend && npm start
```

The website runs at <http://localhost:3000>, and the API health endpoint is <http://localhost:5000/health>.

## Local development account

When the backend is not running in production mode, it provisions a local superadmin account. By default, the email is `Superadmin@gmail.com` and the password is `Superadmin@123`. Set `HONEYCHAIN_SUPERADMIN_EMAIL` and `HONEYCHAIN_SUPERADMIN_PASSWORD` in `backend/.env` to use different values. The older `MEDITRACE_SUPERADMIN_*` environment names are still accepted for existing local setups.

This bootstrap account is for local development only. Set `NODE_ENV=production` and configure Supabase authentication before deploying.

## Configuration

| Location | Purpose |
| --- | --- |
| `backend/.env` | Supabase service credentials, bootstrap account, RPC URL, contract addresses, and optional AI key |
| `frontend/.env` | Supabase public URL/key and optional API base URL |
| `contracts/.env` | RPC endpoints and deployer key for contract deployment |

Never commit `.env` files or production secrets. Templates use placeholders and are safe to copy.

## Repository

The source repository is intended to be published as [`TarunK57/honeychain`](https://github.com/TarunK57/honeychain).
