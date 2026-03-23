# GravityClaw Implementation Plan

> Deploy OpenClaw under 1 minute on Zero Gravity Chain

## Executive Summary

GravityClaw is a one-click deployment platform that enables non-technical users to deploy their own 24/7 active OpenClaw AI agent instance in under 1 minute. By leveraging 0G (Zero Gravity) Chain's decentralized infrastructure, we eliminate the traditional 60+ minute setup process involving servers, SSH, and manual configuration.

### Traditional Setup vs GravityClaw

| Traditional Approach | Time | GravityClaw |
|---------------------|------|----------|
| Purchasing local virtual machine | 15 min | - |
| Creating SSH keys and storing securely | 10 min | - |
| Connecting to the server via SSH | 5 min | - |
| Installing Node.js and NPM | 5 min | - |
| Installing OpenClaw | 7 min | - |
| Setting up OpenClaw | 10 min | - |
| Connecting to AI provider | 4 min | - |
| Pairing with Telegram | 4 min | - |
| **Total** | **60 min** | **< 1 min** |

**GravityClaw Flow:** Pick a model → Connect Telegram → Deploy → Done.

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER LAYER                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     GravityClaw Web Application                         │    │
│  │         (Next.js 14 + TypeScript + TailwindCSS)                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION LAYER                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │   Social Login   │  │  Account         │  │   Stripe         │          │
│  │ (Google/Email)   │  │  Abstraction     │  │   Payments       │          │
│  │     [Privy]      │  │  Wallet          │  │                  │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND SERVICES                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │    API Server    │  │   Deployment     │  │    Instance      │          │
│  │   (Node.js +     │  │   Orchestrator   │  │    Manager       │          │
│  │    Express)      │  │                  │  │                  │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │    Payment       │  │    Job Queue     │  │    Health        │          │
│  │    Processor     │  │   (BullMQ)       │  │    Monitor       │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      0G (ZERO GRAVITY) INFRASTRUCTURE                        │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         0G CHAIN                                     │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │    │
│  │  │ Instance    │ │Subscription │ │  Treasury   │ │  Instance   │   │    │
│  │  │ Registry    │ │  Manager    │ │  Contract   │ │  Factory    │   │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐   │
│  │   0G COMPUTE        │ │    0G STORAGE       │ │      0G DA          │   │
│  │   NETWORK           │ │    NETWORK          │ │                     │   │
│  │                     │ │                     │ │  - Audit Logs       │   │
│  │  - OpenClaw Gateway │ │  - SOUL.md          │ │  - Usage Metrics    │   │
│  │  - AI Inference     │ │  - AGENTS.md        │ │  - Event History    │   │
│  │  - GPU Marketplace  │ │  - Memory Files     │ │                     │   │
│  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OPENCLAW INSTANCES                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Instance 1  │  │  Instance 2  │  │  Instance 3  │  │  Instance N  │    │
│  │  (User A)    │  │  (User B)    │  │  (User C)    │  │  (User N)    │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
└─────────┼─────────────────┼─────────────────┼─────────────────┼─────────────┘
          │                 │                 │                 │
          ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │   Telegram API   │  │   AI Providers   │  │   Other Channels │          │
│  │                  │  │ (Claude/GPT/0G)  │  │  (Discord, etc)  │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 0G Infrastructure Utilization

### 0G Chain (EVM-Compatible Blockchain)

**Network Details:**
- Mainnet RPC: `https://evmrpc.0g.ai` (Chain ID: 16661)
- Testnet RPC: `https://evmrpc-testnet.0g.ai` (Chain ID: 16602)
- Performance: 11,000 TPS per shard, sub-second finality
- EVM Version: Cancun-Deneb compatible

**Smart Contract Functions:**

| Contract | Purpose | Key Functions |
|----------|---------|---------------|
| `InstanceRegistry.sol` | Track user instances | `registerInstance()`, `getInstance()`, `updateStatus()` |
| `Subscription.sol` | Manage billing | `subscribe()`, `renew()`, `cancel()`, `checkActive()` |
| `Treasury.sol` | Hold & distribute funds | `deposit()`, `withdraw()`, `payProvider()` |
| `InstanceFactory.sol` | Standardized creation | `createInstance()`, `cloneInstance()` |

### 0G Compute Network

**Purpose:** Decentralized GPU marketplace for running OpenClaw instances

**Benefits:**
- ~90% cost savings ($0.003/1K tokens vs $0.03 on OpenAI)
- Decentralized infrastructure (no single point of failure)
- TEE verification for secure AI inference
- OpenAI API compatible interface

**Integration:**
```typescript
import { ServingBroker } from '@0glabs/0g-serving-broker';

const broker = new ServingBroker(signer);
const providers = await broker.listProviders();
const service = await broker.requestService({
  type: 'inference',
  model: 'claude-3-sonnet'
});
```

### 0G Storage Network

**Purpose:** Decentralized storage for OpenClaw configurations and memory

**Stored Data:**
- `SOUL.md` - Agent personality and behavior
- `AGENTS.md` - Operating instructions
- `USER.md` - User preferences
- `MEMORY.md` - Long-term curated memory
- `memory/*.md` - Daily notes and conversation logs

**Integration:**
```typescript
import { Indexer, ZgFile } from '@0glabs/0g-ts-sdk';

const indexer = new Indexer(OG_INDEXER_RPC);
const file = await ZgFile.fromBuffer(Buffer.from(soulContent));
const [tx, err] = await indexer.upload(file, OG_EVM_RPC, signer);
const rootHash = tx.rootHash; // Use for retrieval
```

### 0G DA (Data Availability)

**Purpose:** Immutable audit trail and compliance logging

**Logged Events:**
- Instance deployments
- Configuration changes
- Billing events
- Usage metrics
- Error logs

---

## User Journey

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER JOURNEY (< 1 MINUTE)                          │
└─────────────────────────────────────────────────────────────────────────────┘

    [Landing Page]
          │
          ▼
    ┌─────────────┐
    │ Click       │
    │ "Deploy Now"│
    └──────┬──────┘
           │ (0 sec)
           ▼
    ┌─────────────┐
    │ Social      │───► Google / Email / Apple
    │ Login       │
    └──────┬──────┘
           │ (5 sec)
           │
           │ ┌──────────────────────────────────┐
           │ │ Behind the scenes:               │
           │ │ - Create AA wallet (invisible)   │
           │ │ - Generate encryption keys       │
           │ │ - Initialize session             │
           │ └──────────────────────────────────┘
           │
           ▼
    ┌─────────────────────────────────────┐
    │         CONFIGURATION WIZARD        │
    │                                     │
    │  Step 1: Choose AI Model            │
    │  ┌─────────────────────────────┐   │
    │  │ ○ Claude 3.5 Sonnet         │   │
    │  │ ● GPT-4o (recommended)      │   │
    │  │ ○ Claude 3 Opus             │   │
    │  │ ○ 0G Compute (cheapest)     │   │
    │  └─────────────────────────────┘   │
    │                                     │
    │  Step 2: Connect Telegram           │
    │  ┌─────────────────────────────┐   │
    │  │ Enter Bot Token:            │   │
    │  │ [____________________]      │   │
    │  │                             │   │
    │  │ 📖 How to get a bot token  │   │
    │  └─────────────────────────────┘   │
    │                                     │
    │  Step 3: Personality (Optional)     │
    │  ┌─────────────────────────────┐   │
    │  │ Choose a template:          │   │
    │  │ ○ Professional Assistant    │   │
    │  │ ○ Friendly Helper           │   │
    │  │ ○ Technical Expert          │   │
    │  │ ○ Custom (edit later)       │   │
    │  └─────────────────────────────┘   │
    └──────────────┬──────────────────────┘
                   │ (15 sec user input)
                   ▼
    ┌─────────────────────────────────────┐
    │           PAYMENT                   │
    │                                     │
    │  Starter Plan: $5/month             │
    │                                     │
    │  ┌─────────────────────────────┐   │
    │  │ 💳 Pay with Card            │   │
    │  └─────────────────────────────┘   │
    │  ┌─────────────────────────────┐   │
    │  │ 🔗 Pay with Crypto          │   │
    │  └─────────────────────────────┘   │
    │                                     │
    └──────────────┬──────────────────────┘
                   │ (10 sec)
                   │
                   │ ┌──────────────────────────────────────────┐
                   │ │ Behind the scenes:                       │
                   │ │ 1. Stripe processes payment              │
                   │ │ 2. Webhook triggers deployment           │
                   │ │ 3. Create subscription on 0G Chain       │
                   │ │ 4. Store config on 0G Storage            │
                   │ │ 5. Provision on 0G Compute               │
                   │ │ 6. Configure Telegram webhook            │
                   │ │ 7. Health check                          │
                   │ └──────────────────────────────────────────┘
                   │
                   ▼
    ┌─────────────────────────────────────┐
    │          DEPLOYMENT                 │
    │                                     │
    │     ████████████████░░░░  75%       │
    │                                     │
    │  ✓ Payment confirmed                │
    │  ✓ Configuration saved              │
    │  ✓ Instance provisioned             │
    │  ◐ Connecting to Telegram...        │
    │                                     │
    └──────────────┬──────────────────────┘
                   │ (20 sec)
                   ▼
    ┌─────────────────────────────────────┐
    │          SUCCESS! 🎉                │
    │                                     │
    │  Your AI assistant is live!         │
    │                                     │
    │  ┌─────────────────────────────┐   │
    │  │  Open @YourBot on Telegram  │   │
    │  └─────────────────────────────┘   │
    │                                     │
    │  ┌─────────────────────────────┐   │
    │  │  Go to Dashboard            │   │
    │  └─────────────────────────────┘   │
    │                                     │
    └─────────────────────────────────────┘

    TOTAL TIME: ~45 seconds
```

---

## Smart Contracts

### InstanceRegistry.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract InstanceRegistry is Ownable {
    
    struct Instance {
        bytes32 instanceId;
        address owner;
        bytes32 configHash;      // 0G Storage root hash
        uint256 computeProviderId;
        string telegramBotId;
        InstanceStatus status;
        uint256 createdAt;
        uint256 lastActiveAt;
    }
    
    enum InstanceStatus {
        Pending,
        Active,
        Paused,
        Terminated
    }
    
    mapping(address => bytes32[]) public userInstances;
    mapping(bytes32 => Instance) public instances;
    
    event InstanceCreated(
        bytes32 indexed instanceId,
        address indexed owner,
        bytes32 configHash
    );
    
    event InstanceStatusChanged(
        bytes32 indexed instanceId,
        InstanceStatus newStatus
    );
    
    function registerInstance(
        bytes32 _instanceId,
        bytes32 _configHash,
        uint256 _computeProviderId,
        string calldata _telegramBotId
    ) external returns (bytes32) {
        require(instances[_instanceId].owner == address(0), "Instance exists");
        
        instances[_instanceId] = Instance({
            instanceId: _instanceId,
            owner: msg.sender,
            configHash: _configHash,
            computeProviderId: _computeProviderId,
            telegramBotId: _telegramBotId,
            status: InstanceStatus.Pending,
            createdAt: block.timestamp,
            lastActiveAt: block.timestamp
        });
        
        userInstances[msg.sender].push(_instanceId);
        
        emit InstanceCreated(_instanceId, msg.sender, _configHash);
        
        return _instanceId;
    }
    
    function activateInstance(bytes32 _instanceId) external onlyOwner {
        require(instances[_instanceId].owner != address(0), "Instance not found");
        instances[_instanceId].status = InstanceStatus.Active;
        emit InstanceStatusChanged(_instanceId, InstanceStatus.Active);
    }
    
    function getInstance(bytes32 _instanceId) external view returns (Instance memory) {
        return instances[_instanceId];
    }
    
    function getUserInstances(address _user) external view returns (bytes32[] memory) {
        return userInstances[_user];
    }
    
    function updateConfigHash(bytes32 _instanceId, bytes32 _newConfigHash) external {
        require(instances[_instanceId].owner == msg.sender, "Not owner");
        instances[_instanceId].configHash = _newConfigHash;
    }
}
```

### Subscription.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Subscription is Ownable {
    
    IERC20 public paymentToken; // USDC or OG token
    
    struct Plan {
        string name;
        uint256 pricePerMonth;  // In payment token units
        uint256 maxInstances;
        uint256 maxMessagesPerMonth;
        bool isActive;
    }
    
    struct UserSubscription {
        uint256 planId;
        uint256 startTime;
        uint256 endTime;
        uint256 messagesUsed;
        bool autoRenew;
    }
    
    mapping(uint256 => Plan) public plans;
    mapping(address => UserSubscription) public subscriptions;
    uint256 public planCount;
    
    event Subscribed(address indexed user, uint256 planId, uint256 endTime);
    event Renewed(address indexed user, uint256 newEndTime);
    event Cancelled(address indexed user);
    
    constructor(address _paymentToken) Ownable(msg.sender) {
        paymentToken = IERC20(_paymentToken);
        
        // Initialize default plans
        _createPlan("Starter", 5 * 10**6, 1, 10000);      // $5, 1 instance, 10K messages
        _createPlan("Pro", 19 * 10**6, 3, 50000);         // $19, 3 instances, 50K messages
        _createPlan("Enterprise", 99 * 10**6, 100, 0);    // $99, unlimited
    }
    
    function _createPlan(
        string memory _name,
        uint256 _price,
        uint256 _maxInstances,
        uint256 _maxMessages
    ) internal {
        plans[planCount] = Plan({
            name: _name,
            pricePerMonth: _price,
            maxInstances: _maxInstances,
            maxMessagesPerMonth: _maxMessages,
            isActive: true
        });
        planCount++;
    }
    
    function subscribe(uint256 _planId) external {
        require(plans[_planId].isActive, "Plan not active");
        require(subscriptions[msg.sender].endTime < block.timestamp, "Already subscribed");
        
        uint256 price = plans[_planId].pricePerMonth;
        require(paymentToken.transferFrom(msg.sender, address(this), price), "Payment failed");
        
        subscriptions[msg.sender] = UserSubscription({
            planId: _planId,
            startTime: block.timestamp,
            endTime: block.timestamp + 30 days,
            messagesUsed: 0,
            autoRenew: true
        });
        
        emit Subscribed(msg.sender, _planId, subscriptions[msg.sender].endTime);
    }
    
    function renew() external {
        UserSubscription storage sub = subscriptions[msg.sender];
        require(sub.endTime > 0, "No subscription");
        
        uint256 price = plans[sub.planId].pricePerMonth;
        require(paymentToken.transferFrom(msg.sender, address(this), price), "Payment failed");
        
        sub.endTime += 30 days;
        sub.messagesUsed = 0;
        
        emit Renewed(msg.sender, sub.endTime);
    }
    
    function isActive(address _user) external view returns (bool) {
        return subscriptions[_user].endTime > block.timestamp;
    }
    
    function canUseMessages(address _user, uint256 _count) external view returns (bool) {
        UserSubscription memory sub = subscriptions[_user];
        if (sub.endTime < block.timestamp) return false;
        
        uint256 maxMessages = plans[sub.planId].maxMessagesPerMonth;
        if (maxMessages == 0) return true; // Unlimited
        
        return sub.messagesUsed + _count <= maxMessages;
    }
    
    function recordUsage(address _user, uint256 _messageCount) external onlyOwner {
        subscriptions[_user].messagesUsed += _messageCount;
    }
}
```

### Treasury.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Treasury is AccessControl, ReentrancyGuard {
    
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    IERC20 public paymentToken;
    
    mapping(address => uint256) public userBalances;
    mapping(address => uint256) public providerEarnings;
    
    uint256 public platformFeePercent = 10; // 10%
    uint256 public totalPlatformFees;
    
    event Deposited(address indexed user, uint256 amount);
    event ProviderPaid(address indexed provider, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    
    constructor(address _paymentToken) {
        paymentToken = IERC20(_paymentToken);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }
    
    function deposit(uint256 _amount) external {
        require(paymentToken.transferFrom(msg.sender, address(this), _amount), "Transfer failed");
        userBalances[msg.sender] += _amount;
        emit Deposited(msg.sender, _amount);
    }
    
    function payProvider(
        address _user,
        address _provider,
        uint256 _amount
    ) external onlyRole(OPERATOR_ROLE) nonReentrant {
        require(userBalances[_user] >= _amount, "Insufficient balance");
        
        uint256 platformFee = (_amount * platformFeePercent) / 100;
        uint256 providerAmount = _amount - platformFee;
        
        userBalances[_user] -= _amount;
        providerEarnings[_provider] += providerAmount;
        totalPlatformFees += platformFee;
        
        emit ProviderPaid(_provider, providerAmount);
    }
    
    function withdrawProviderEarnings() external nonReentrant {
        uint256 amount = providerEarnings[msg.sender];
        require(amount > 0, "No earnings");
        
        providerEarnings[msg.sender] = 0;
        require(paymentToken.transfer(msg.sender, amount), "Transfer failed");
        
        emit Withdrawn(msg.sender, amount);
    }
    
    function withdrawPlatformFees(address _to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 amount = totalPlatformFees;
        totalPlatformFees = 0;
        require(paymentToken.transfer(_to, amount), "Transfer failed");
    }
}
```

---

## Project Structure

```
gravityclaw/
├── apps/
│   ├── web/                          # Next.js Frontend
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── deploy/
│   │   │   │   └── page.tsx          # Deployment wizard
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx          # User dashboard
│   │   │   │   ├── instances/
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx  # Instance details
│   │   │   │   └── settings/
│   │   │   │       └── page.tsx
│   │   │   └── api/
│   │   │       ├── auth/
│   │   │       │   └── route.ts
│   │   │       ├── deploy/
│   │   │       │   └── route.ts
│   │   │       └── webhook/
│   │   │           └── stripe/
│   │   │               └── route.ts
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui components
│   │   │   ├── deploy/
│   │   │   │   ├── ModelSelector.tsx
│   │   │   │   ├── TelegramSetup.tsx
│   │   │   │   ├── PersonalityPicker.tsx
│   │   │   │   └── DeploymentProgress.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── InstanceCard.tsx
│   │   │   │   ├── UsageStats.tsx
│   │   │   │   └── BillingInfo.tsx
│   │   │   └── layout/
│   │   │       ├── Header.tsx
│   │   │       ├── Footer.tsx
│   │   │       └── Sidebar.tsx
│   │   ├── lib/
│   │   │   ├── privy.ts              # Auth configuration
│   │   │   ├── 0g-sdk.ts             # 0G SDK wrapper
│   │   │   ├── stripe.ts             # Stripe client
│   │   │   └── api.ts                # API client
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useInstances.ts
│   │   │   └── useDeployment.ts
│   │   ├── public/
│   │   ├── styles/
│   │   │   └── globals.css
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── api/                          # Backend API Server
│       ├── src/
│       │   ├── index.ts              # Entry point
│       │   ├── config/
│       │   │   ├── index.ts
│       │   │   └── constants.ts
│       │   ├── routes/
│       │   │   ├── index.ts
│       │   │   ├── deploy.ts         # POST /deploy
│       │   │   ├── instances.ts      # CRUD /instances
│       │   │   ├── webhook.ts        # Stripe webhooks
│       │   │   └── health.ts         # Health checks
│       │   ├── services/
│       │   │   ├── orchestrator.ts   # Deployment orchestration
│       │   │   ├── compute.ts        # 0G Compute integration
│       │   │   ├── storage.ts        # 0G Storage integration
│       │   │   ├── chain.ts          # 0G Chain integration
│       │   │   ├── telegram.ts       # Telegram bot setup
│       │   │   └── payment.ts        # Payment processing
│       │   ├── jobs/
│       │   │   ├── queue.ts          # BullMQ setup
│       │   │   ├── deploy.job.ts     # Deployment job
│       │   │   ├── health.job.ts     # Health check job
│       │   │   └── billing.job.ts    # Billing job
│       │   ├── middleware/
│       │   │   ├── auth.ts
│       │   │   ├── rateLimit.ts
│       │   │   └── errorHandler.ts
│       │   ├── utils/
│       │   │   ├── logger.ts
│       │   │   ├── crypto.ts
│       │   │   └── validators.ts
│       │   └── types/
│       │       └── index.ts
│       ├── prisma/
│       │   └── schema.prisma         # Database schema
│       ├── Dockerfile
│       ├── tsconfig.json
│       └── package.json
│
├── contracts/                        # Solidity Smart Contracts
│   ├── src/
│   │   ├── InstanceRegistry.sol
│   │   ├── Subscription.sol
│   │   ├── Treasury.sol
│   │   ├── InstanceFactory.sol
│   │   └── interfaces/
│   │       └── IGravityClaw.sol
│   ├── test/
│   │   ├── InstanceRegistry.t.sol
│   │   ├── Subscription.t.sol
│   │   └── Treasury.t.sol
│   ├── script/
│   │   ├── Deploy.s.sol
│   │   └── Verify.s.sol
│   ├── hardhat.config.ts
│   ├── foundry.toml
│   └── package.json
│
├── packages/
│   ├── shared/                       # Shared code
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── instance.ts
│   │   │   │   ├── subscription.ts
│   │   │   │   └── deployment.ts
│   │   │   ├── constants/
│   │   │   │   ├── chains.ts
│   │   │   │   └── contracts.ts
│   │   │   └── utils/
│   │   │       └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── openclaw-templates/           # OpenClaw configuration templates
│       ├── personalities/
│       │   ├── professional.md
│       │   ├── friendly.md
│       │   ├── technical.md
│       │   └── custom.md
│       ├── agents/
│       │   └── default.md
│       └── package.json
│
├── docker/
│   ├── docker-compose.yml            # Local development
│   ├── docker-compose.prod.yml       # Production
│   └── openclaw/
│       ├── Dockerfile                # OpenClaw base image
│       └── entrypoint.sh
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── deploy-contracts.yml
│       └── deploy-apps.yml
│
├── docs/
│   ├── architecture.md
│   ├── api-reference.md
│   └── deployment-guide.md
│
├── turbo.json                        # Turborepo configuration
├── pnpm-workspace.yaml
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

---

## Technology Stack

### Frontend (apps/web)

| Technology | Purpose | Version |
|------------|---------|---------|
| Next.js | React framework with App Router | 14.x |
| TypeScript | Type safety | 5.x |
| TailwindCSS | Styling | 3.x |
| shadcn/ui | UI components | latest |
| Privy | Authentication + wallet abstraction | 1.x |
| wagmi | Ethereum interactions | 2.x |
| viem | Ethereum library | 2.x |
| @0glabs/0g-ts-sdk | 0G Storage integration | 0.3.x |
| Stripe.js | Payment processing | latest |
| Zustand | State management | 4.x |
| React Query | Data fetching | 5.x |

### Backend (apps/api)

| Technology | Purpose | Version |
|------------|---------|---------|
| Node.js | Runtime | 22.x |
| Express | HTTP framework | 4.x |
| TypeScript | Type safety | 5.x |
| Prisma | ORM | 5.x |
| PostgreSQL | Primary database | 16.x |
| Redis | Cache + job queue | 7.x |
| BullMQ | Job processing | 5.x |
| ethers.js | Ethereum library | 6.x |
| @0glabs/0g-ts-sdk | 0G Storage | 0.3.x |
| @0glabs/0g-serving-broker | 0G Compute | 0.4.x |
| Stripe SDK | Payment processing | latest |
| Winston | Logging | 3.x |
| Zod | Validation | 3.x |

### Smart Contracts (contracts)

| Technology | Purpose | Version |
|------------|---------|---------|
| Solidity | Smart contract language | 0.8.24 |
| Hardhat | Development framework | 2.x |
| Foundry | Testing framework | latest |
| OpenZeppelin | Contract libraries | 5.x |
| ethers.js | Deployment scripts | 6.x |

### Infrastructure

| Service | Purpose |
|---------|---------|
| Vercel | Frontend hosting |
| Railway / Render | Backend hosting |
| Supabase | PostgreSQL + Auth backup |
| Upstash | Redis hosting |
| 0G Network | Blockchain + Storage + Compute |

---

## API Endpoints

### Authentication

```
POST /api/auth/verify
  Body: { token: string }
  Response: { user: User, session: Session }
```

### Deployment

```
POST /api/deploy
  Headers: Authorization: Bearer <token>
  Body: {
    model: "claude-3-sonnet" | "gpt-4o" | "0g-compute",
    telegramToken: string,
    personality: "professional" | "friendly" | "technical" | "custom",
    customSoul?: string
  }
  Response: {
    instanceId: string,
    status: "pending",
    estimatedTime: number
  }

GET /api/deploy/:instanceId/status
  Response: {
    status: "pending" | "provisioning" | "configuring" | "active" | "failed",
    progress: number,
    message: string,
    telegramBotUrl?: string
  }
```

### Instances

```
GET /api/instances
  Response: { instances: Instance[] }

GET /api/instances/:id
  Response: { instance: Instance, stats: Stats }

PATCH /api/instances/:id
  Body: { status?: string, config?: Partial<Config> }
  Response: { instance: Instance }

DELETE /api/instances/:id
  Response: { success: boolean }

POST /api/instances/:id/restart
  Response: { success: boolean }
```

### Configuration

```
GET /api/instances/:id/config
  Response: { soul: string, agents: string, user: string }

PUT /api/instances/:id/config
  Body: { soul?: string, agents?: string, user?: string }
  Response: { configHash: string }
```

### Billing

```
GET /api/billing
  Response: { subscription: Subscription, usage: Usage, invoices: Invoice[] }

POST /api/billing/subscribe
  Body: { planId: string, paymentMethodId: string }
  Response: { subscription: Subscription }

POST /api/billing/cancel
  Response: { success: boolean }
```

### Webhooks

```
POST /api/webhook/stripe
  Headers: Stripe-Signature: <signature>
  Body: StripeEvent
  Response: { received: true }
```

---

## Database Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id              String         @id @default(cuid())
  privyId         String         @unique
  email           String?        @unique
  walletAddress   String?        @unique
  stripeCustomerId String?       @unique
  
  instances       Instance[]
  subscription    Subscription?
  
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}

model Instance {
  id                String          @id @default(cuid())
  onChainId         String          @unique  // bytes32 from contract
  
  userId            String
  user              User            @relation(fields: [userId], references: [id])
  
  name              String
  model             String          // claude-3-sonnet, gpt-4o, etc.
  personality       String          // professional, friendly, etc.
  
  telegramBotToken  String          // encrypted
  telegramBotId     String
  telegramBotUsername String?
  
  configHash        String          // 0G Storage root hash
  computeProviderId String?         // 0G Compute provider
  endpoint          String?         // Instance endpoint
  
  status            InstanceStatus  @default(PENDING)
  
  messagesCount     Int             @default(0)
  lastActiveAt      DateTime?
  
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  
  usageLogs         UsageLog[]
  
  @@index([userId])
  @@index([status])
}

enum InstanceStatus {
  PENDING
  PROVISIONING
  CONFIGURING
  ACTIVE
  PAUSED
  FAILED
  TERMINATED
}

model Subscription {
  id              String            @id @default(cuid())
  
  userId          String            @unique
  user            User              @relation(fields: [userId], references: [id])
  
  planId          String
  plan            Plan              @relation(fields: [planId], references: [id])
  
  stripeSubscriptionId String?      @unique
  onChainId       String?           // bytes32 from contract
  
  status          SubscriptionStatus @default(ACTIVE)
  
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  
  messagesUsed    Int               @default(0)
  autoRenew       Boolean           @default(true)
  
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELLED
  EXPIRED
}

model Plan {
  id              String          @id @default(cuid())
  name            String          @unique
  stripePriceId   String?
  
  priceMonthly    Int             // in cents
  maxInstances    Int
  maxMessages     Int             // 0 = unlimited
  features        String[]
  
  subscriptions   Subscription[]
  
  createdAt       DateTime        @default(now())
}

model UsageLog {
  id              String          @id @default(cuid())
  
  instanceId      String
  instance        Instance        @relation(fields: [instanceId], references: [id])
  
  messageCount    Int
  tokensUsed      Int
  cost            Float           // in USD
  
  date            DateTime        @default(now())
  
  @@index([instanceId, date])
}

model DeploymentLog {
  id              String          @id @default(cuid())
  instanceId      String
  
  step            String
  status          String
  message         String?
  metadata        Json?
  
  createdAt       DateTime        @default(now())
  
  @@index([instanceId])
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goals:** Set up project structure, deploy contracts, basic auth

**Tasks:**
1. Initialize monorepo with Turborepo
2. Set up Next.js frontend with TailwindCSS + shadcn/ui
3. Configure Privy authentication
4. Set up Express backend with Prisma
5. Deploy smart contracts to 0G Testnet
6. Create basic landing page
7. Implement user registration flow

**Deliverables:**
- [ ] Working monorepo structure
- [ ] User can sign up with Google/email
- [ ] Contracts deployed to testnet
- [ ] Basic API endpoints working

### Phase 2: Deployment Pipeline (Week 3-4)

**Goals:** Core deployment functionality

**Tasks:**
1. Integrate 0G Storage SDK for config upload
2. Integrate 0G Compute SDK for instance provisioning
3. Build deployment orchestrator service
4. Implement BullMQ job processing
5. Create Telegram bot configuration automation
6. Build deployment wizard UI (3 steps)
7. Add real-time deployment progress updates (WebSocket)

**Deliverables:**
- [ ] User can deploy an OpenClaw instance
- [ ] Configuration stored on 0G Storage
- [ ] Instance runs on 0G Compute
- [ ] Telegram bot connected and working

### Phase 3: Payments & Billing (Week 5-6)

**Goals:** Payment processing, subscription management

**Tasks:**
1. Integrate Stripe for fiat payments
2. Connect Stripe webhooks to backend
3. Implement on-chain subscription recording
4. Build Treasury contract integration
5. Create billing dashboard UI
6. Add usage tracking and metering
7. Implement auto-renewal logic

**Deliverables:**
- [ ] User can pay with credit card
- [ ] Subscription recorded on-chain
- [ ] Usage tracked and displayed
- [ ] Auto-renewal working

### Phase 4: Dashboard & Management (Week 7-8)

**Goals:** Full instance management capabilities

**Tasks:**
1. Build user dashboard with instance list
2. Create instance detail pages
3. Add configuration editor (SOUL.md, etc.)
4. Implement instance restart/pause/terminate
5. Add usage analytics and charts
6. Build settings page
7. Implement instance health monitoring

**Deliverables:**
- [ ] Full dashboard functionality
- [ ] User can edit instance configuration
- [ ] Health status visible
- [ ] Usage analytics displayed

### Phase 5: Production Hardening (Week 9-10)

**Goals:** Production readiness

**Tasks:**
1. Security audit for smart contracts
2. Penetration testing for API
3. Load testing and optimization
4. Error handling and recovery
5. Monitoring and alerting setup
6. Deploy to 0G Mainnet
7. Documentation completion

**Deliverables:**
- [ ] Contracts audited and deployed to mainnet
- [ ] Production infrastructure ready
- [ ] Monitoring in place
- [ ] Documentation complete

---

## Security Considerations

### Smart Contract Security
- Use OpenZeppelin battle-tested contracts
- Implement reentrancy guards on all fund transfers
- Access control with role-based permissions
- Upgrade pattern for future improvements (proxy)
- Professional audit before mainnet deployment

### API Security
- Rate limiting on all endpoints
- Input validation with Zod
- CORS configuration
- Helmet.js security headers
- JWT token expiration and refresh
- Encrypted storage for sensitive data (Telegram tokens)

### Key Management
- Never store private keys in code
- Use environment variables with encryption
- Hardware security modules (HSM) for production
- Key rotation policies

### Data Privacy
- Encrypt user data at rest
- TLS for all communications
- GDPR compliance measures
- Data retention policies

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRODUCTION                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Vercel     │    │   Railway    │    │   Upstash    │      │
│  │  (Frontend)  │    │  (Backend)   │    │   (Redis)    │      │
│  │              │    │              │    │              │      │
│  │  Next.js     │───▶│  Express     │───▶│  BullMQ      │      │
│  │  App         │    │  API         │    │  Queues      │      │
│  └──────────────┘    └──────┬───────┘    └──────────────┘      │
│                             │                                    │
│                             ▼                                    │
│                      ┌──────────────┐                           │
│                      │   Supabase   │                           │
│                      │  PostgreSQL  │                           │
│                      └──────────────┘                           │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                      0G INFRASTRUCTURE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   0G Chain   │    │  0G Storage  │    │  0G Compute  │      │
│  │   (Mainnet)  │    │   Network    │    │   Network    │      │
│  │              │    │              │    │              │      │
│  │  Contracts   │    │  Configs     │    │  OpenClaw    │      │
│  │  Registry    │    │  Memories    │    │  Instances   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Environment Variables

```env
# .env.example

# App
NODE_ENV=development
APP_URL=http://localhost:3000
API_URL=http://localhost:4000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/gravityclaw

# Redis
REDIS_URL=redis://localhost:6379

# Authentication (Privy)
NEXT_PUBLIC_PRIVY_APP_ID=
PRIVY_APP_SECRET=

# 0G Network
OG_CHAIN_RPC=https://evmrpc-testnet.0g.ai
OG_CHAIN_ID=16602
OG_INDEXER_RPC=https://indexer-testnet.0g.ai
OG_PRIVATE_KEY=

# Contracts (deployed addresses)
CONTRACT_INSTANCE_REGISTRY=
CONTRACT_SUBSCRIPTION=
CONTRACT_TREASURY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Telegram
TELEGRAM_API_URL=https://api.telegram.org

# Encryption
ENCRYPTION_KEY=

# Monitoring
SENTRY_DSN=
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Deployment time | < 60 seconds |
| Deployment success rate | > 99% |
| Instance uptime | > 99.9% |
| API response time (p95) | < 200ms |
| User conversion rate | > 10% |
| Monthly recurring revenue | Track growth |

---

## Future Enhancements

1. **Multi-channel support** - Discord, Slack, WhatsApp integration
2. **Custom skills marketplace** - Users can share and sell OpenClaw skills
3. **Team accounts** - Multiple users managing shared instances
4. **Advanced analytics** - Conversation insights, sentiment analysis
5. **White-label solution** - Custom branding for enterprises
6. **Mobile app** - iOS/Android dashboard
7. **Crypto payments** - Direct OG token and stablecoin payments
8. **DAO governance** - Community-driven feature prioritization

---

## Getting Started (Development)

```bash
# Clone repository
git clone https://github.com/yourusername/gravityclaw.git
cd gravityclaw

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Start database
docker-compose up -d postgres redis

# Run migrations
pnpm db:migrate

# Deploy contracts to testnet
pnpm contracts:deploy:testnet

# Start development servers
pnpm dev

# Frontend: http://localhost:3000
# Backend:  http://localhost:4000
```

---

## License

MIT License - See LICENSE file for details.

---

## Contact

- Website: https://gravityclaw.ai
- Twitter: @gravityclaw
- Discord: discord.gg/gravityclaw
- Email: team@gravityclaw.ai
