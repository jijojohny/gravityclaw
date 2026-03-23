# GravityClaw

> Deploy OpenClaw in Under 1 Minute on Zero Gravity Chain

GravityClaw is a one-click deployment platform that enables non-technical users to deploy their own 24/7 active OpenClaw AI agent instance in under 1 minute.

## Features

- **Lightning Fast** - Deploy in under 60 seconds
- **Decentralized** - Powered by Zero Gravity Chain
- **Always Online** - 24/7 uptime on decentralized infrastructure
- **Full Ownership** - Your keys, your bot, your data

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Backend API (Express)                 │
└─────────────────────────────────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
     ┌───────────┐  ┌───────────┐  ┌───────────┐
     │ 0G Chain  │  │ 0G Storage│  │ 0G Compute│
     │ Contracts │  │  Network  │  │  Network  │
     └───────────┘  └───────────┘  └───────────┘
```

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Node.js, Express, Prisma, PostgreSQL
- **Blockchain**: Solidity, Hardhat, 0G Chain
- **Auth**: Privy (social login + wallet abstraction)
- **Payments**: Stripe + 0G Chain

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9+
- Docker (for local database)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/gravityclaw.git
cd gravityclaw

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start database services
docker compose -f docker/docker-compose.yml up -d

# Generate Prisma client
pnpm db:generate

# Push database schema
pnpm db:push

# Start development servers
pnpm dev
```

### Access

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- API Health: http://localhost:4000/api/health

## Project Structure

```
gravityclaw/
├── apps/
│   ├── web/                    # Next.js frontend
│   └── api/                    # Express backend
├── contracts/                  # Solidity smart contracts
├── packages/
│   ├── shared/                 # Shared types and constants
│   └── openclaw-templates/     # OpenClaw configuration templates
├── docker/                     # Docker configurations
└── IMPLEMENTATION.md           # Full implementation plan
```

## Smart Contracts

Deploy contracts to 0G Testnet:

```bash
cd contracts
pnpm install
pnpm compile
pnpm deploy:testnet
```

Contracts:
- **InstanceRegistry**: Tracks deployed OpenClaw instances
- **Subscription**: Manages subscription plans and billing
- **Treasury**: Handles payments and provider settlements

## Configuration

See `.env.example` for all available configuration options.

Key configurations:
- `PRIVY_APP_ID`: Privy authentication
- `OG_CHAIN_RPC`: 0G Chain RPC endpoint
- `STRIPE_SECRET_KEY`: Stripe payments

## License

MIT
