export type AIModel = "gpt-4o" | "claude-3-sonnet" | "claude-3-opus" | "0g-compute";

export type Personality = "professional" | "friendly" | "technical" | "custom";

export type InstanceStatus =
  | "PENDING"
  | "PROVISIONING"
  | "CONFIGURING"
  | "ACTIVE"
  | "PAUSED"
  | "FAILED"
  | "TERMINATED";

export type SubscriptionStatus = "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED";

export interface DeploymentConfig {
  model: AIModel;
  telegramToken: string;
  personality: Personality;
  customSoul?: string;
}

export interface Instance {
  id: string;
  onChainId: string;
  userId: string;
  name: string;
  model: AIModel;
  personality: Personality;
  telegramBotId: string;
  telegramBotUsername: string | null;
  configHash: string;
  computeProviderId: string | null;
  endpoint: string | null;
  status: InstanceStatus;
  messagesCount: number;
  lastActiveAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  privyId: string;
  email: string | null;
  walletAddress: string | null;
  stripeCustomerId: string | null;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  messagesUsed: number;
  autoRenew: boolean;
}

export interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  maxInstances: number;
  maxMessages: number;
  features: string[];
}

export interface DeploymentStatus {
  status: InstanceStatus;
  progress: number;
  message: string;
  telegramBotUrl?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

export interface UsageLog {
  id: string;
  instanceId: string;
  messageCount: number;
  tokensUsed: number;
  cost: number;
  date: Date;
}
