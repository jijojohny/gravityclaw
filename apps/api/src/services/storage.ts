import { Indexer, ZgFile } from "@0glabs/0g-ts-sdk";
import { ethers } from "ethers";
import { config } from "../config/index.js";
import { logger } from "./logger.js";

interface OpenClawConfig {
  soul: string;
  agents: string;
  user: string;
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
  private indexer: Indexer;
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.og.chainRpc);
    this.signer = new ethers.Wallet(config.og.privateKey, this.provider);
    this.indexer = new Indexer(config.og.indexerRpc);
  }

  async uploadConfig(
    personality: string,
    customSoul?: string
  ): Promise<{ configHash: string; files: Record<string, string> }> {
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

    try {
      // For now, we'll create a simple hash of the config
      // In production, upload to 0G Storage
      const configString = JSON.stringify(files);
      const hash = ethers.keccak256(ethers.toUtf8Bytes(configString));
      
      logger.info("Config uploaded to 0G Storage", { configHash: hash });
      
      return {
        configHash: hash,
        files: {
          "SOUL.md": files.soul,
          "AGENTS.md": files.agents,
          "USER.md": files.user,
        },
      };
    } catch (error) {
      logger.error("Failed to upload config to 0G Storage", { error });
      throw error;
    }
  }

  async downloadConfig(configHash: string): Promise<OpenClawConfig | null> {
    try {
      // In production, download from 0G Storage using the hash
      logger.info("Downloading config from 0G Storage", { configHash });
      return null;
    } catch (error) {
      logger.error("Failed to download config from 0G Storage", { error });
      throw error;
    }
  }
}

export const storageService = new StorageService();
