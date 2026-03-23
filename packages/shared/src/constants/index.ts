export const OG_CHAINS = {
  testnet: {
    id: 16602,
    name: "0G Testnet",
    rpcUrl: "https://evmrpc-testnet.0g.ai",
    indexerUrl: "https://indexer-testnet.0g.ai",
    explorerUrl: "https://scan-testnet.0g.ai",
    nativeCurrency: {
      name: "OG",
      symbol: "OG",
      decimals: 18,
    },
  },
  mainnet: {
    id: 16661,
    name: "0G Mainnet",
    rpcUrl: "https://evmrpc.0g.ai",
    indexerUrl: "https://indexer.0g.ai",
    explorerUrl: "https://scan.0g.ai",
    nativeCurrency: {
      name: "OG",
      symbol: "OG",
      decimals: 18,
    },
  },
} as const;

export const AI_MODELS = [
  {
    id: "gpt-4o" as const,
    name: "GPT-4o",
    provider: "OpenAI",
    description: "OpenAI's most capable model. Great for complex tasks.",
    pricePerToken: 0.00001,
    recommended: true,
  },
  {
    id: "claude-3-sonnet" as const,
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    description: "Anthropic's balanced model. Fast and intelligent.",
    pricePerToken: 0.000003,
    recommended: false,
  },
  {
    id: "claude-3-opus" as const,
    name: "Claude 3 Opus",
    provider: "Anthropic",
    description: "Anthropic's most powerful model for complex reasoning.",
    pricePerToken: 0.000015,
    recommended: false,
  },
  {
    id: "0g-compute" as const,
    name: "0G Compute",
    provider: "0G Network",
    description: "Decentralized AI inference. Most cost-effective.",
    pricePerToken: 0.000003,
    recommended: false,
  },
] as const;

export const PERSONALITIES = [
  {
    id: "professional" as const,
    name: "Professional Assistant",
    description: "Formal, efficient, and business-focused.",
    emoji: "💼",
  },
  {
    id: "friendly" as const,
    name: "Friendly Helper",
    description: "Warm, casual, and approachable.",
    emoji: "😊",
  },
  {
    id: "technical" as const,
    name: "Technical Expert",
    description: "Detailed, precise, and code-savvy.",
    emoji: "🔧",
  },
  {
    id: "custom" as const,
    name: "Custom",
    description: "Define your own personality later.",
    emoji: "✨",
  },
] as const;

export const SUBSCRIPTION_PLANS = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 5,
    maxInstances: 1,
    maxMessages: 10000,
    features: ["1 AI Bot", "10,000 messages/month", "Basic AI models", "Telegram integration"],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 19,
    maxInstances: 3,
    maxMessages: 50000,
    features: ["3 AI Bots", "50,000 messages/month", "All AI models", "Custom personality", "Priority support"],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: 99,
    maxInstances: 100,
    maxMessages: 0, // unlimited
    features: ["Unlimited Bots", "Unlimited messages", "All AI models", "Custom integrations", "Dedicated support", "SLA guarantee"],
  },
] as const;

export const DEPLOYMENT_STEPS = [
  { id: "validate", label: "Validating configuration", progress: 20 },
  { id: "storage", label: "Storing config on 0G Storage", progress: 40 },
  { id: "compute", label: "Provisioning on 0G Compute", progress: 60 },
  { id: "telegram", label: "Configuring Telegram webhook", progress: 80 },
  { id: "complete", label: "Your bot is live!", progress: 100 },
] as const;
