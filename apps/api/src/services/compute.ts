import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import { config } from "../config/index.js";
import { logger } from "./logger.js";

export interface ComputeService {
  provider: string;
  model: string;
  serviceType: "chatbot" | "text-to-image" | "speech-to-text";
  url: string;
  inputPrice: string;
  outputPrice: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finishReason: string;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ImageGenerationResponse {
  data: Array<{
    url: string;
    b64_json?: string;
  }>;
}

type ZGBroker = Awaited<ReturnType<typeof createZGComputeNetworkBroker>>;

export class ZeroGComputeService {
  private static instance: ZeroGComputeService;
  private broker: ZGBroker | null = null;
  private provider: ethers.JsonRpcProvider | null = null;
  private wallet: ethers.Wallet | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): ZeroGComputeService {
    if (!ZeroGComputeService.instance) {
      ZeroGComputeService.instance = new ZeroGComputeService();
    }
    return ZeroGComputeService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      if (!config.og.privateKey || config.og.privateKey.length < 64) {
        logger.warn("0G Compute not configured - no private key");
        return;
      }

      this.provider = new ethers.JsonRpcProvider(config.og.chainRpc);
      this.wallet = new ethers.Wallet(config.og.privateKey, this.provider);

      logger.info("Initializing 0G Compute broker...", {
        chainRpc: config.og.chainRpc,
        walletAddress: this.wallet.address,
      });

      this.broker = await createZGComputeNetworkBroker(this.wallet);
      this.initialized = true;

      logger.info("0G Compute service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize 0G Compute service", { error });
      this.initialized = false;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * List all available AI services on 0G Compute Network
   */
  async listServices(): Promise<ComputeService[]> {
    if (!this.initialized || !this.broker) {
      await this.initialize();
    }

    if (!this.broker) {
      logger.warn("0G Compute not available - returning empty services");
      return [];
    }

    try {
      const services = await this.broker.inference.listService();

      return services.map((s: any) => ({
        provider: s.provider,
        model: s.model,
        serviceType: s.serviceType as "chatbot" | "text-to-image" | "speech-to-text",
        url: s.url,
        inputPrice: s.inputPrice?.toString() || "0",
        outputPrice: s.outputPrice?.toString() || "0",
      }));
    } catch (error) {
      logger.error("Failed to list compute services", { error });
      return [];
    }
  }

  /**
   * Get chatbot services
   */
  async getChatbotServices(): Promise<ComputeService[]> {
    const services = await this.listServices();
    return services.filter((s) => s.serviceType === "chatbot");
  }

  /**
   * Get text-to-image services
   */
  async getImageServices(): Promise<ComputeService[]> {
    const services = await this.listServices();
    return services.filter((s) => s.serviceType === "text-to-image");
  }

  /**
   * Get service metadata for a provider
   */
  async getServiceMetadata(providerAddress: string): Promise<{ endpoint: string; model: string } | null> {
    if (!this.initialized || !this.broker) {
      await this.initialize();
    }

    if (!this.broker) {
      return null;
    }

    try {
      const metadata = await this.broker.inference.getServiceMetadata(providerAddress);
      return {
        endpoint: metadata.endpoint,
        model: metadata.model,
      };
    } catch (error) {
      logger.error("Failed to get service metadata", { providerAddress, error });
      return null;
    }
  }

  /**
   * Get account balance and info
   */
  async getAccountInfo(): Promise<{
    address: string;
    balance: string;
  } | null> {
    if (!this.wallet) {
      return null;
    }

    try {
      const balance = await this.provider?.getBalance(this.wallet.address);
      return {
        address: this.wallet.address,
        balance: ethers.formatEther(balance || 0),
      };
    } catch (error) {
      logger.error("Failed to get account info", { error });
      return null;
    }
  }

  /**
   * Deposit funds to compute ledger
   */
  async depositFunds(amount: number): Promise<void> {
    if (!this.initialized || !this.broker) {
      await this.initialize();
    }

    if (!this.broker) {
      throw new Error("0G Compute not initialized");
    }

    try {
      logger.info("Depositing funds to 0G Compute ledger", { amount });
      await this.broker.ledger.depositFund(amount);
      logger.info("Deposit successful", { amount });
    } catch (error) {
      logger.error("Failed to deposit funds", { error });
      throw error;
    }
  }

  /**
   * Transfer funds to a provider sub-account
   */
  async transferToProvider(providerAddress: string, amount: bigint): Promise<void> {
    if (!this.initialized || !this.broker) {
      await this.initialize();
    }

    if (!this.broker) {
      throw new Error("0G Compute not initialized");
    }

    try {
      logger.info("Transferring funds to provider", { providerAddress, amount: amount.toString() });
      await this.broker.ledger.transferFund(providerAddress, "inference", amount);
      logger.info("Transfer successful", { providerAddress, amount: amount.toString() });
    } catch (error) {
      logger.error("Failed to transfer funds", { error });
      throw error;
    }
  }

  /**
   * Make a chat completion request
   */
  async chatCompletion(
    providerAddress: string,
    messages: ChatMessage[],
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<ChatCompletionResponse> {
    if (!this.initialized || !this.broker) {
      await this.initialize();
    }

    if (!this.broker) {
      throw new Error("0G Compute not initialized");
    }

    try {
      // Get service metadata
      const metadata = await this.broker.inference.getServiceMetadata(providerAddress);

      // Generate auth headers
      const headers = await this.broker.inference.getRequestHeaders(providerAddress);

      // Make request
      const response = await fetch(`${metadata.endpoint}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({
          model: metadata.model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 1024,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Chat completion failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as any;

      // Optional: verify response integrity
      const chatID = response.headers.get("ZG-Res-Key") || data.id;
      if (chatID) {
        try {
          await this.broker.inference.processResponse(providerAddress, chatID);
        } catch (verifyError) {
          logger.warn("Response verification failed", { verifyError });
        }
      }

      logger.info("Chat completion successful", {
        provider: providerAddress,
        model: metadata.model,
        messageCount: messages.length,
      });

      return {
        id: data.id,
        choices: data.choices.map((c: any) => ({
          message: {
            role: c.message.role,
            content: c.message.content,
          },
          finishReason: c.finish_reason,
        })),
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      logger.error("Chat completion failed", { providerAddress, error });
      throw error;
    }
  }

  /**
   * Generate image from text prompt
   */
  async generateImage(
    providerAddress: string,
    prompt: string,
    options?: {
      size?: string;
      n?: number;
    }
  ): Promise<ImageGenerationResponse> {
    if (!this.initialized || !this.broker) {
      await this.initialize();
    }

    if (!this.broker) {
      throw new Error("0G Compute not initialized");
    }

    try {
      const metadata = await this.broker.inference.getServiceMetadata(providerAddress);
      const headers = await this.broker.inference.getRequestHeaders(providerAddress);

      const response = await fetch(`${metadata.endpoint}/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({
          model: metadata.model,
          prompt,
          n: options?.n ?? 1,
          size: options?.size ?? "1024x1024",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Image generation failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as any;

      // Optional: verify response
      const chatID = response.headers.get("ZG-Res-Key");
      if (chatID) {
        try {
          await this.broker.inference.processResponse(providerAddress, chatID);
        } catch (verifyError) {
          logger.warn("Response verification failed", { verifyError });
        }
      }

      logger.info("Image generation successful", {
        provider: providerAddress,
        prompt: prompt.substring(0, 50),
      });

      return {
        data: data.data.map((d: any) => ({
          url: d.url,
          b64_json: d.b64_json,
        })),
      };
    } catch (error) {
      logger.error("Image generation failed", { providerAddress, error });
      throw error;
    }
  }

  /**
   * Simple chat helper using default or configured provider
   */
  async chat(
    message: string,
    systemPrompt?: string,
    providerAddress?: string
  ): Promise<string> {
    const provider = providerAddress || config.og.computeProviderAddress;

    if (!provider) {
      throw new Error("No compute provider configured");
    }

    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }

    messages.push({ role: "user", content: message });

    const response = await this.chatCompletion(provider, messages);

    return response.choices[0]?.message?.content || "";
  }

  /**
   * Get status of 0G Compute connection
   */
  getStatus(): {
    initialized: boolean;
    chainRpc: string;
    walletAddress: string | null;
    defaultProvider: string | null;
  } {
    return {
      initialized: this.initialized,
      chainRpc: config.og.chainRpc,
      walletAddress: this.wallet?.address || null,
      defaultProvider: config.og.computeProviderAddress || null,
    };
  }
}

export const computeService = ZeroGComputeService.getInstance();
