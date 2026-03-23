import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  
  database: {
    url: process.env.DATABASE_URL || "postgresql://localhost:5432/gravityclaw",
  },
  
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },
  
  og: {
    chainRpc: process.env.OG_CHAIN_RPC || "https://evmrpc-testnet.0g.ai",
    chainId: parseInt(process.env.OG_CHAIN_ID || "16602", 10),
    indexerRpc: process.env.OG_INDEXER_RPC || "https://indexer-testnet.0g.ai",
    privateKey: process.env.OG_PRIVATE_KEY || "",
  },
  
  contracts: {
    instanceRegistry: process.env.CONTRACT_INSTANCE_REGISTRY || "",
    subscription: process.env.CONTRACT_SUBSCRIPTION || "",
    treasury: process.env.CONTRACT_TREASURY || "",
  },
  
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  },
  
  privy: {
    appId: process.env.PRIVY_APP_ID || "",
    appSecret: process.env.PRIVY_APP_SECRET || "",
  },
  
  encryption: {
    key: process.env.ENCRYPTION_KEY || "dev-encryption-key-change-in-prod",
  },
  
  telegram: {
    apiUrl: process.env.TELEGRAM_API_URL || "https://api.telegram.org",
  },
};

export const isProduction = config.nodeEnv === "production";
