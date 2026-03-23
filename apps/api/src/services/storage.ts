import { Indexer, ZgFile } from "@0glabs/0g-ts-sdk";
import { ethers } from "ethers";
import { config } from "../config/index.js";
import { logger } from "./logger.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

interface OpenClawConfig {
  soul: string;
  agents: string;
  user: string;
}

interface UploadResult {
  rootHash: string;
  txHash?: string;
  configHash: string;
  files: Record<string, string>;
}

const PERSONALITY_TEMPLATES: Record<string, string> = {
  professional: `# SOUL

You are a professional AI assistant. You communicate in a formal, efficient, and business-focused manner.

## Core Traits
- Professional and courteous
- Clear and concise communication
- Task-oriented and efficient
- Knowledgeable and helpful

## Guidelines
- Maintain a formal tone
- Focus on delivering value
- Be direct but polite
- Prioritize accuracy and helpfulness`,

  friendly: `# SOUL

You are a friendly and approachable AI assistant. You communicate in a warm, casual, and supportive manner.

## Core Traits
- Warm and welcoming
- Casual but respectful
- Supportive and encouraging
- Patient and understanding

## Guidelines
- Use a conversational tone
- Show empathy and understanding
- Be encouraging and positive
- Make interactions enjoyable`,

  technical: `# SOUL

You are a technical expert AI assistant. You provide detailed, precise, and code-savvy responses.

## Core Traits
- Technically proficient
- Detail-oriented
- Precise and accurate
- Code-savvy

## Guidelines
- Provide detailed technical explanations
- Include code examples when relevant
- Be precise with terminology
- Explain complex concepts clearly`,

  custom: `# SOUL

You are a helpful AI assistant.

## Core Traits
- Helpful and responsive
- Adaptable to user needs
- Clear communicator

## Guidelines
- Listen to user needs
- Provide accurate information
- Be respectful and professional`,
};

export class StorageService {
  private indexer: Indexer | null = null;
  private provider: ethers.JsonRpcProvider | null = null;
  private signer: ethers.Wallet | null = null;
  private initialized = false;
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(os.tmpdir(), "gravityclaw-storage");
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    this.initializeIfConfigured();
  }

  private initializeIfConfigured() {
    if (this.initialized) return;

    try {
      if (config.og.privateKey && config.og.privateKey.length >= 64) {
        this.provider = new ethers.JsonRpcProvider(config.og.chainRpc);
        this.signer = new ethers.Wallet(config.og.privateKey, this.provider);
        this.indexer = new Indexer(config.og.storageIndexerRpc);
        this.initialized = true;
        logger.info("0G Storage service initialized", {
          indexer: config.og.storageIndexerRpc,
        });
      } else {
        logger.warn("0G Storage not configured - using mock mode");
      }
    } catch (error) {
      logger.warn("Failed to initialize 0G Storage - using mock mode", { error });
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Upload OpenClaw configuration to 0G Storage
   */
  async uploadConfig(
    personality: string,
    customSoul?: string
  ): Promise<UploadResult> {
    const soul = customSoul || PERSONALITY_TEMPLATES[personality] || PERSONALITY_TEMPLATES.custom;

    const files: OpenClawConfig = {
      soul,
      agents: `# AGENTS

## Available Commands
- /start - Start conversation
- /help - Show help
- /settings - Manage settings

## Behavior
- Respond to all messages
- Maintain conversation context
- Be helpful and informative`,
      user: `# USER

User preferences will be learned over time.`,
    };

    const configString = JSON.stringify(files, null, 2);
    const configHash = ethers.keccak256(ethers.toUtf8Bytes(configString));

    if (!this.initialized || !this.indexer || !this.signer) {
      logger.info("Using mock storage mode - config not uploaded to 0G", { configHash });
      return {
        rootHash: configHash,
        configHash,
        files: {
          "SOUL.md": files.soul,
          "AGENTS.md": files.agents,
          "USER.md": files.user,
        },
      };
    }

    try {
      // Write config to temp file
      const tempFilePath = path.join(this.tempDir, `config-${Date.now()}.json`);
      fs.writeFileSync(tempFilePath, configString);

      logger.info("Uploading config to 0G Storage", { tempFilePath });

      // Create ZgFile from the temp file
      const zgFile = await ZgFile.fromFilePath(tempFilePath);

      // Generate merkle tree
      const [tree, treeErr] = await zgFile.merkleTree();
      if (treeErr !== null) {
        throw new Error(`Error generating Merkle tree: ${treeErr}`);
      }

      const rootHash = tree?.rootHash() || "";
      logger.info("Generated root hash", { rootHash });

      // Upload to 0G Storage network
      const [uploadResult, uploadErr] = await this.indexer.upload(
        zgFile,
        config.og.chainRpc,
        this.signer
      );

      if (uploadErr !== null) {
        throw new Error(`Upload error: ${uploadErr}`);
      }

      // Clean up temp file
      await zgFile.close();
      fs.unlinkSync(tempFilePath);

      // Extract txHash from upload result (could be string or object with hash)
      const txHash = typeof uploadResult === "string" 
        ? uploadResult 
        : (uploadResult as any)?.hash || (uploadResult as any)?.txHash || String(uploadResult);

      logger.info("Config uploaded to 0G Storage", {
        rootHash,
        txHash,
      });

      return {
        rootHash,
        txHash,
        configHash,
        files: {
          "SOUL.md": files.soul,
          "AGENTS.md": files.agents,
          "USER.md": files.user,
        },
      };
    } catch (error) {
      logger.error("Failed to upload config to 0G Storage", { error });
      // Fallback to mock mode
      return {
        rootHash: configHash,
        configHash,
        files: {
          "SOUL.md": files.soul,
          "AGENTS.md": files.agents,
          "USER.md": files.user,
        },
      };
    }
  }

  /**
   * Upload arbitrary file to 0G Storage
   */
  async uploadFile(filePath: string): Promise<{ rootHash: string; txHash?: string }> {
    if (!this.initialized || !this.indexer || !this.signer) {
      const fileContent = fs.readFileSync(filePath);
      const hash = ethers.keccak256(fileContent);
      logger.info("Mock file upload", { hash });
      return { rootHash: hash };
    }

    try {
      const zgFile = await ZgFile.fromFilePath(filePath);

      const [tree, treeErr] = await zgFile.merkleTree();
      if (treeErr !== null) {
        throw new Error(`Error generating Merkle tree: ${treeErr}`);
      }

      const rootHash = tree?.rootHash() || "";

      const [uploadResult, uploadErr] = await this.indexer.upload(
        zgFile,
        config.og.chainRpc,
        this.signer
      );

      if (uploadErr !== null) {
        throw new Error(`Upload error: ${uploadErr}`);
      }

      await zgFile.close();

      const txHash = typeof uploadResult === "string" 
        ? uploadResult 
        : (uploadResult as any)?.hash || (uploadResult as any)?.txHash || String(uploadResult);

      logger.info("File uploaded to 0G Storage", { rootHash, txHash });

      return { rootHash, txHash };
    } catch (error) {
      logger.error("Failed to upload file to 0G Storage", { error });
      throw error;
    }
  }

  /**
   * Upload data buffer to 0G Storage
   */
  async uploadData(data: Buffer | string, filename: string): Promise<{ rootHash: string; txHash?: string }> {
    const tempFilePath = path.join(this.tempDir, `${Date.now()}-${filename}`);
    
    try {
      fs.writeFileSync(tempFilePath, data);
      const result = await this.uploadFile(tempFilePath);
      fs.unlinkSync(tempFilePath);
      return result;
    } catch (error) {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      throw error;
    }
  }

  /**
   * Download file from 0G Storage
   */
  async downloadFile(rootHash: string, outputPath: string): Promise<void> {
    if (!this.initialized || !this.indexer) {
      throw new Error("0G Storage not initialized");
    }

    try {
      logger.info("Downloading from 0G Storage", { rootHash, outputPath });

      const err = await this.indexer.download(rootHash, outputPath, true);
      if (err !== null) {
        throw new Error(`Download error: ${err}`);
      }

      logger.info("File downloaded from 0G Storage", { rootHash, outputPath });
    } catch (error) {
      logger.error("Failed to download from 0G Storage", { error });
      throw error;
    }
  }

  /**
   * Download config from 0G Storage
   */
  async downloadConfig(rootHash: string): Promise<OpenClawConfig | null> {
    if (!this.initialized || !this.indexer) {
      logger.warn("0G Storage not initialized - cannot download config");
      return null;
    }

    try {
      const outputPath = path.join(this.tempDir, `download-${Date.now()}.json`);
      
      await this.downloadFile(rootHash, outputPath);
      
      const content = fs.readFileSync(outputPath, "utf-8");
      fs.unlinkSync(outputPath);
      
      const config = JSON.parse(content) as OpenClawConfig;
      
      logger.info("Config downloaded from 0G Storage", { rootHash });
      
      return config;
    } catch (error) {
      logger.error("Failed to download config from 0G Storage", { error });
      return null;
    }
  }

  /**
   * Calculate merkle root hash for a file without uploading
   */
  async calculateFileHash(filePath: string): Promise<string> {
    try {
      const zgFile = await ZgFile.fromFilePath(filePath);
      const [tree, err] = await zgFile.merkleTree();
      await zgFile.close();

      if (err !== null) {
        throw new Error(`Error calculating hash: ${err}`);
      }

      return tree?.rootHash() || "";
    } catch (error) {
      // Fallback to simple hash
      const content = fs.readFileSync(filePath);
      return ethers.keccak256(content);
    }
  }

  /**
   * Get status of 0G Storage connection
   */
  getStatus(): {
    initialized: boolean;
    indexerUrl: string;
    signerAddress: string | null;
  } {
    return {
      initialized: this.initialized,
      indexerUrl: config.og.storageIndexerRpc,
      signerAddress: this.signer?.address || null,
    };
  }
}

export const storageService = new StorageService();
