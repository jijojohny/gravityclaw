import { z } from "zod";

export const DeploymentConfigSchema = z.object({
  model: z.enum(["gpt-4o", "claude-3-sonnet", "claude-3-opus", "0g-compute"]),
  telegramToken: z.string().min(1),
  personality: z.enum(["professional", "friendly", "technical", "custom"]),
  customSoul: z.string().optional(),
});

export type DeploymentConfig = z.infer<typeof DeploymentConfigSchema>;

export interface Instance {
  id: string;
  onChainId: string;
  userId: string;
  name: string;
  model: string;
  personality: string;
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

export type InstanceStatus = 
  | "PENDING"
  | "PROVISIONING"
  | "CONFIGURING"
  | "ACTIVE"
  | "PAUSED"
  | "FAILED"
  | "TERMINATED";

export interface DeploymentJob {
  instanceId: string;
  userId: string;
  config: DeploymentConfig;
}

export interface User {
  id: string;
  privyId: string;
  email: string | null;
  walletAddress: string | null;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  messagesUsed: number;
}

export type SubscriptionStatus = "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED";

export interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  maxInstances: number;
  maxMessages: number;
  features: string[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
