import { ethers } from "ethers";
import { config } from "../config";
import { logger } from "../services/logger";

import InstanceRegistryABI from "./abis/InstanceRegistry.json";
import SubscriptionABI from "./abis/Subscription.json";
import TreasuryABI from "./abis/Treasury.json";

export { InstanceRegistryABI, SubscriptionABI, TreasuryABI };

export class ContractProvider {
  private static instance: ContractProvider;
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet | null = null;

  private instanceRegistry: ethers.Contract | null = null;
  private subscription: ethers.Contract | null = null;
  private treasury: ethers.Contract | null = null;

  private constructor() {
    this.provider = new ethers.JsonRpcProvider(config.og.chainRpc);

    if (config.og.privateKey && config.og.privateKey.length === 64) {
      this.signer = new ethers.Wallet(config.og.privateKey, this.provider);
      logger.info("Contract provider initialized with signer", {
        address: this.signer.address,
      });
    } else {
      logger.warn("Contract provider initialized in read-only mode (no private key)");
    }
  }

  static getInstance(): ContractProvider {
    if (!ContractProvider.instance) {
      ContractProvider.instance = new ContractProvider();
    }
    return ContractProvider.instance;
  }

  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  getSigner(): ethers.Wallet | null {
    return this.signer;
  }

  getSignerOrThrow(): ethers.Wallet {
    if (!this.signer) {
      throw new Error("No signer available - private key not configured");
    }
    return this.signer;
  }

  getInstanceRegistry(): ethers.Contract {
    if (!this.instanceRegistry) {
      if (!config.contracts.instanceRegistry) {
        throw new Error("InstanceRegistry contract address not configured");
      }
      const signerOrProvider = this.signer || this.provider;
      this.instanceRegistry = new ethers.Contract(
        config.contracts.instanceRegistry,
        InstanceRegistryABI,
        signerOrProvider
      );
    }
    return this.instanceRegistry;
  }

  getSubscription(): ethers.Contract {
    if (!this.subscription) {
      if (!config.contracts.subscription) {
        throw new Error("Subscription contract address not configured");
      }
      const signerOrProvider = this.signer || this.provider;
      this.subscription = new ethers.Contract(
        config.contracts.subscription,
        SubscriptionABI,
        signerOrProvider
      );
    }
    return this.subscription;
  }

  getTreasury(): ethers.Contract {
    if (!this.treasury) {
      if (!config.contracts.treasury) {
        throw new Error("Treasury contract address not configured");
      }
      const signerOrProvider = this.signer || this.provider;
      this.treasury = new ethers.Contract(
        config.contracts.treasury,
        TreasuryABI,
        signerOrProvider
      );
    }
    return this.treasury;
  }

  async getBalance(address?: string): Promise<string> {
    const targetAddress = address || this.signer?.address;
    if (!targetAddress) {
      throw new Error("No address provided and no signer available");
    }
    const balance = await this.provider.getBalance(targetAddress);
    return ethers.formatEther(balance);
  }

  async getBlockNumber(): Promise<number> {
    return await this.provider.getBlockNumber();
  }
}

export const contractProvider = ContractProvider.getInstance();
