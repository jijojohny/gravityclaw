import { ethers } from "ethers";
import { contractProvider } from "./index";
import { logger } from "../services/logger";

export interface TreasuryStats {
  totalPlatformFees: bigint;
  totalProviderPayments: bigint;
  feePercent: bigint;
}

export class TreasuryService {
  private static instance: TreasuryService;

  private constructor() {}

  static getInstance(): TreasuryService {
    if (!TreasuryService.instance) {
      TreasuryService.instance = new TreasuryService();
    }
    return TreasuryService.instance;
  }

  private getContract() {
    return contractProvider.getTreasury();
  }

  /**
   * Get user balance in treasury
   */
  async getUserBalance(userAddress: string): Promise<bigint> {
    const contract = this.getContract();
    return await contract.getUserBalance(userAddress);
  }

  /**
   * Get provider earnings
   */
  async getProviderEarnings(providerAddress: string): Promise<bigint> {
    const contract = this.getContract();
    return await contract.getProviderEarnings(providerAddress);
  }

  /**
   * Get treasury stats
   */
  async getStats(): Promise<TreasuryStats> {
    const contract = this.getContract();
    const [totalPlatformFees, totalProviderPayments, feePercent] = await contract.getStats();

    return {
      totalPlatformFees,
      totalProviderPayments,
      feePercent,
    };
  }

  /**
   * Pay a compute provider (operator only)
   */
  async payProvider(
    userAddress: string,
    providerAddress: string,
    amount: bigint
  ): Promise<string> {
    const contract = this.getContract();

    logger.info("Paying provider", {
      user: userAddress,
      provider: providerAddress,
      amount: amount.toString(),
    });

    const tx = await contract.payProvider(userAddress, providerAddress, amount);
    const receipt = await tx.wait();

    logger.info("Provider paid", { txHash: receipt.hash });

    return receipt.hash;
  }

  /**
   * Batch pay multiple providers (operator only)
   */
  async batchPayProviders(
    userAddress: string,
    providers: string[],
    amounts: bigint[]
  ): Promise<string> {
    const contract = this.getContract();

    logger.info("Batch paying providers", {
      user: userAddress,
      providerCount: providers.length,
    });

    const tx = await contract.batchPayProviders(userAddress, providers, amounts);
    const receipt = await tx.wait();

    logger.info("Providers batch paid", { txHash: receipt.hash });

    return receipt.hash;
  }

  /**
   * Refund user (operator only)
   */
  async refundUser(userAddress: string, amount: bigint): Promise<string> {
    const contract = this.getContract();

    logger.info("Refunding user", { user: userAddress, amount: amount.toString() });

    const tx = await contract.refundUser(userAddress, amount);
    const receipt = await tx.wait();

    logger.info("User refunded", { txHash: receipt.hash });

    return receipt.hash;
  }

  /**
   * Withdraw platform fees (admin only)
   */
  async withdrawPlatformFees(toAddress: string): Promise<string> {
    const contract = this.getContract();

    logger.info("Withdrawing platform fees", { to: toAddress });

    const tx = await contract.withdrawPlatformFees(toAddress);
    const receipt = await tx.wait();

    logger.info("Platform fees withdrawn", { txHash: receipt.hash });

    return receipt.hash;
  }

  /**
   * Set fee percentage (admin only)
   */
  async setFeePercent(newFee: number): Promise<string> {
    const contract = this.getContract();

    logger.info("Setting fee percent", { newFee });

    const tx = await contract.setFeePercent(newFee);
    const receipt = await tx.wait();

    return receipt.hash;
  }

  /**
   * Get platform fee percentage
   */
  async getFeePercent(): Promise<number> {
    const contract = this.getContract();
    const fee = await contract.platformFeePercent();
    return Number(fee);
  }

  /**
   * Get payment token address
   */
  async getPaymentToken(): Promise<string> {
    const contract = this.getContract();
    return await contract.paymentToken();
  }

  /**
   * Check if address has operator role
   */
  async hasOperatorRole(address: string): Promise<boolean> {
    const contract = this.getContract();
    const OPERATOR_ROLE = await contract.OPERATOR_ROLE();
    return await contract.hasRole(OPERATOR_ROLE, address);
  }

  /**
   * Check if address has withdrawer role
   */
  async hasWithdrawerRole(address: string): Promise<boolean> {
    const contract = this.getContract();
    const WITHDRAWER_ROLE = await contract.WITHDRAWER_ROLE();
    return await contract.hasRole(WITHDRAWER_ROLE, address);
  }

  /**
   * Format amount from contract units (6 decimals) to human readable
   */
  formatAmount(amount: bigint): string {
    return (Number(amount) / 1_000_000).toFixed(2);
  }

  /**
   * Parse amount to contract units (6 decimals)
   */
  parseAmount(amount: number): bigint {
    return BigInt(Math.floor(amount * 1_000_000));
  }
}

export const treasuryService = TreasuryService.getInstance();
