import { ethers } from "ethers";
import { contractProvider } from "./index";
import { logger } from "../services/logger";

export interface Plan {
  name: string;
  pricePerMonth: bigint;
  maxInstances: bigint;
  maxMessagesPerMonth: bigint;
  isActive: boolean;
}

export interface UserSubscription {
  planId: bigint;
  startTime: bigint;
  endTime: bigint;
  messagesUsed: bigint;
  autoRenew: boolean;
}

export class SubscriptionService {
  private static instance: SubscriptionService;

  private constructor() {}

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  private getContract() {
    return contractProvider.getSubscription();
  }

  /**
   * Get plan details
   */
  async getPlan(planId: number): Promise<Plan> {
    const contract = this.getContract();
    const result = await contract.getPlan(planId);

    return {
      name: result.name,
      pricePerMonth: result.pricePerMonth,
      maxInstances: result.maxInstances,
      maxMessagesPerMonth: result.maxMessagesPerMonth,
      isActive: result.isActive,
    };
  }

  /**
   * Get all available plans
   */
  async getAllPlans(): Promise<Plan[]> {
    const contract = this.getContract();
    const planCount = await contract.planCount();
    const plans: Plan[] = [];

    for (let i = 0; i < Number(planCount); i++) {
      const plan = await this.getPlan(i);
      plans.push(plan);
    }

    return plans;
  }

  /**
   * Get user subscription details
   */
  async getSubscription(userAddress: string): Promise<UserSubscription | null> {
    const contract = this.getContract();

    try {
      const result = await contract.getSubscription(userAddress);

      if (result.endTime === 0n) {
        return null;
      }

      return {
        planId: result.planId,
        startTime: result.startTime,
        endTime: result.endTime,
        messagesUsed: result.messagesUsed,
        autoRenew: result.autoRenew,
      };
    } catch (error) {
      logger.error("Failed to get subscription", { userAddress, error });
      return null;
    }
  }

  /**
   * Check if user has active subscription
   */
  async isActive(userAddress: string): Promise<boolean> {
    const contract = this.getContract();
    return await contract.isActive(userAddress);
  }

  /**
   * Check if user can use specified number of messages
   */
  async canUseMessages(userAddress: string, count: number): Promise<boolean> {
    const contract = this.getContract();
    return await contract.canUseMessages(userAddress, count);
  }

  /**
   * Get remaining messages for user
   */
  async getRemainingMessages(userAddress: string): Promise<bigint> {
    const contract = this.getContract();
    return await contract.getRemainingMessages(userAddress);
  }

  /**
   * Record message usage (operator only)
   */
  async recordUsage(userAddress: string, messageCount: number): Promise<string> {
    const contract = this.getContract();

    logger.info("Recording usage", { userAddress, messageCount });

    const tx = await contract.recordUsage(userAddress, messageCount);
    const receipt = await tx.wait();

    logger.info("Usage recorded", { txHash: receipt.hash });

    return receipt.hash;
  }

  /**
   * Create a new plan (admin only)
   */
  async createPlan(
    name: string,
    price: bigint,
    maxInstances: number,
    maxMessages: number
  ): Promise<string> {
    const contract = this.getContract();

    logger.info("Creating plan", { name, price: price.toString() });

    const tx = await contract.createPlan(name, price, maxInstances, maxMessages);
    const receipt = await tx.wait();

    logger.info("Plan created", { txHash: receipt.hash });

    return receipt.hash;
  }

  /**
   * Update an existing plan (admin only)
   */
  async updatePlan(planId: number, newPrice: bigint, isActive: boolean): Promise<string> {
    const contract = this.getContract();

    logger.info("Updating plan", { planId, newPrice: newPrice.toString(), isActive });

    const tx = await contract.updatePlan(planId, newPrice, isActive);
    const receipt = await tx.wait();

    return receipt.hash;
  }

  /**
   * Get treasury address
   */
  async getTreasury(): Promise<string> {
    const contract = this.getContract();
    return await contract.treasury();
  }

  /**
   * Get payment token address
   */
  async getPaymentToken(): Promise<string> {
    const contract = this.getContract();
    return await contract.paymentToken();
  }

  /**
   * Get plan count
   */
  async getPlanCount(): Promise<number> {
    const contract = this.getContract();
    const count = await contract.planCount();
    return Number(count);
  }

  /**
   * Format price from contract units (6 decimals) to human readable
   */
  formatPrice(price: bigint): string {
    return (Number(price) / 1_000_000).toFixed(2);
  }

  /**
   * Parse price to contract units (6 decimals)
   */
  parsePrice(price: number): bigint {
    return BigInt(Math.floor(price * 1_000_000));
  }
}

export const subscriptionService = SubscriptionService.getInstance();
