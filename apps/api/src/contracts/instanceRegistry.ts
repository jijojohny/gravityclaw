import { ethers } from "ethers";
import { contractProvider } from "./index";
import { logger } from "../services/logger";

export enum InstanceStatus {
  Pending = 0,
  Active = 1,
  Paused = 2,
  Terminated = 3,
}

export interface OnChainInstance {
  instanceId: string;
  owner: string;
  configHash: string;
  computeProviderId: bigint;
  telegramBotId: string;
  status: InstanceStatus;
  createdAt: bigint;
  lastActiveAt: bigint;
}

export class InstanceRegistryService {
  private static instance: InstanceRegistryService;

  private constructor() {}

  static getInstance(): InstanceRegistryService {
    if (!InstanceRegistryService.instance) {
      InstanceRegistryService.instance = new InstanceRegistryService();
    }
    return InstanceRegistryService.instance;
  }

  private getContract() {
    return contractProvider.getInstanceRegistry();
  }

  /**
   * Register a new OpenClaw instance on-chain
   */
  async registerInstance(
    instanceId: string,
    configHash: string,
    computeProviderId: number,
    telegramBotId: string
  ): Promise<{ txHash: string; instanceId: string }> {
    const contract = this.getContract();
    const signer = contractProvider.getSignerOrThrow();

    const instanceIdBytes = ethers.id(instanceId);
    const configHashBytes = ethers.id(configHash);

    logger.info("Registering instance on-chain", {
      instanceId,
      instanceIdBytes,
      telegramBotId,
    });

    const tx = await contract.registerInstance(
      instanceIdBytes,
      configHashBytes,
      computeProviderId,
      telegramBotId
    );

    logger.info("Instance registration tx submitted", { txHash: tx.hash });

    const receipt = await tx.wait();

    logger.info("Instance registered on-chain", {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    });

    return {
      txHash: receipt.hash,
      instanceId: instanceIdBytes,
    };
  }

  /**
   * Activate an instance (operator only)
   */
  async activateInstance(instanceId: string): Promise<string> {
    const contract = this.getContract();
    const instanceIdBytes = ethers.id(instanceId);

    logger.info("Activating instance on-chain", { instanceId });

    const tx = await contract.activateInstance(instanceIdBytes);
    const receipt = await tx.wait();

    logger.info("Instance activated", { txHash: receipt.hash });

    return receipt.hash;
  }

  /**
   * Pause an instance
   */
  async pauseInstance(instanceId: string): Promise<string> {
    const contract = this.getContract();
    const instanceIdBytes = ethers.id(instanceId);

    logger.info("Pausing instance", { instanceId });

    const tx = await contract.pauseInstance(instanceIdBytes);
    const receipt = await tx.wait();

    return receipt.hash;
  }

  /**
   * Resume a paused instance
   */
  async resumeInstance(instanceId: string): Promise<string> {
    const contract = this.getContract();
    const instanceIdBytes = ethers.id(instanceId);

    logger.info("Resuming instance", { instanceId });

    const tx = await contract.resumeInstance(instanceIdBytes);
    const receipt = await tx.wait();

    return receipt.hash;
  }

  /**
   * Terminate an instance
   */
  async terminateInstance(instanceId: string): Promise<string> {
    const contract = this.getContract();
    const instanceIdBytes = ethers.id(instanceId);

    logger.info("Terminating instance", { instanceId });

    const tx = await contract.terminateInstance(instanceIdBytes);
    const receipt = await tx.wait();

    return receipt.hash;
  }

  /**
   * Update instance configuration hash
   */
  async updateConfigHash(instanceId: string, newConfigHash: string): Promise<string> {
    const contract = this.getContract();
    const instanceIdBytes = ethers.id(instanceId);
    const configHashBytes = ethers.id(newConfigHash);

    logger.info("Updating instance config", { instanceId });

    const tx = await contract.updateConfigHash(instanceIdBytes, configHashBytes);
    const receipt = await tx.wait();

    return receipt.hash;
  }

  /**
   * Record instance activity (operator only)
   */
  async recordActivity(instanceId: string): Promise<string> {
    const contract = this.getContract();
    const instanceIdBytes = ethers.id(instanceId);

    const tx = await contract.recordActivity(instanceIdBytes);
    const receipt = await tx.wait();

    return receipt.hash;
  }

  /**
   * Get instance details from chain
   */
  async getInstance(instanceId: string): Promise<OnChainInstance | null> {
    const contract = this.getContract();
    const instanceIdBytes = ethers.id(instanceId);

    try {
      const result = await contract.getInstance(instanceIdBytes);

      if (result.owner === ethers.ZeroAddress) {
        return null;
      }

      return {
        instanceId: result.instanceId,
        owner: result.owner,
        configHash: result.configHash,
        computeProviderId: result.computeProviderId,
        telegramBotId: result.telegramBotId,
        status: Number(result.status) as InstanceStatus,
        createdAt: result.createdAt,
        lastActiveAt: result.lastActiveAt,
      };
    } catch (error) {
      logger.error("Failed to get instance from chain", { instanceId, error });
      return null;
    }
  }

  /**
   * Get instance by bytes32 ID directly
   */
  async getInstanceByBytes(instanceIdBytes: string): Promise<OnChainInstance | null> {
    const contract = this.getContract();

    try {
      const result = await contract.getInstance(instanceIdBytes);

      if (result.owner === ethers.ZeroAddress) {
        return null;
      }

      return {
        instanceId: result.instanceId,
        owner: result.owner,
        configHash: result.configHash,
        computeProviderId: result.computeProviderId,
        telegramBotId: result.telegramBotId,
        status: Number(result.status) as InstanceStatus,
        createdAt: result.createdAt,
        lastActiveAt: result.lastActiveAt,
      };
    } catch (error) {
      logger.error("Failed to get instance from chain", { instanceIdBytes, error });
      return null;
    }
  }

  /**
   * Get all instance IDs for a user
   */
  async getUserInstances(userAddress: string): Promise<string[]> {
    const contract = this.getContract();

    try {
      const instanceIds = await contract.getUserInstances(userAddress);
      return instanceIds;
    } catch (error) {
      logger.error("Failed to get user instances", { userAddress, error });
      return [];
    }
  }

  /**
   * Get total instance count
   */
  async getTotalInstances(): Promise<number> {
    const contract = this.getContract();
    const total = await contract.totalInstances();
    return Number(total);
  }

  /**
   * Check if instance is active
   */
  async isInstanceActive(instanceId: string): Promise<boolean> {
    const contract = this.getContract();
    const instanceIdBytes = ethers.id(instanceId);
    return await contract.isInstanceActive(instanceIdBytes);
  }
}

export const instanceRegistryService = InstanceRegistryService.getInstance();
