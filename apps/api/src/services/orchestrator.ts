import { ethers } from "ethers";
import { prisma } from "./prisma.js";
import { storageService } from "./storage.js";
import { telegramService } from "./telegram.js";
import { logger } from "./logger.js";
import { config } from "../config/index.js";
import type { DeploymentConfig, InstanceStatus } from "../types/index.js";

interface DeploymentResult {
  instanceId: string;
  onChainId: string;
  telegramBotUsername: string;
  endpoint: string;
}

export class OrchestratorService {
  async deployInstance(
    userId: string,
    deployConfig: DeploymentConfig
  ): Promise<DeploymentResult> {
    const instanceId = crypto.randomUUID();
    
    try {
      // Step 1: Create instance record
      logger.info("Creating instance record", { instanceId, userId });
      await this.updateInstanceStatus(instanceId, "PENDING");
      
      const instance = await prisma.instance.create({
        data: {
          id: instanceId,
          onChainId: ethers.hexlify(ethers.randomBytes(32)),
          userId,
          name: "My Assistant",
          model: deployConfig.model,
          personality: deployConfig.personality,
          telegramBotToken: await this.encryptToken(deployConfig.telegramToken),
          telegramBotId: "",
          status: "PENDING",
        },
      });

      // Step 2: Validate Telegram token and get bot info
      logger.info("Validating Telegram bot", { instanceId });
      await this.updateInstanceStatus(instanceId, "PROVISIONING");
      
      const botInfo = await telegramService.getBotInfo(deployConfig.telegramToken);
      
      await prisma.instance.update({
        where: { id: instanceId },
        data: {
          telegramBotId: String(botInfo.id),
          telegramBotUsername: botInfo.username,
          name: botInfo.first_name,
        },
      });

      // Step 3: Upload configuration to 0G Storage
      logger.info("Uploading config to 0G Storage", { instanceId });
      const { configHash } = await storageService.uploadConfig(
        deployConfig.personality,
        deployConfig.customSoul
      );

      await prisma.instance.update({
        where: { id: instanceId },
        data: { configHash },
      });

      // Step 4: Provision on 0G Compute (simulated for now)
      logger.info("Provisioning on 0G Compute", { instanceId });
      await this.updateInstanceStatus(instanceId, "CONFIGURING");
      
      // Simulate compute provisioning delay
      await new Promise((r) => setTimeout(r, 2000));
      
      const endpoint = `https://compute.0g.ai/instances/${instanceId}`;
      
      await prisma.instance.update({
        where: { id: instanceId },
        data: {
          endpoint,
          computeProviderId: "0g-compute-provider-1",
        },
      });

      // Step 5: Configure Telegram webhook
      logger.info("Configuring Telegram webhook", { instanceId });
      const webhookUrl = `${endpoint}/webhook/telegram`;
      await telegramService.setWebhook(deployConfig.telegramToken, webhookUrl);

      // Step 6: Mark as active
      await prisma.instance.update({
        where: { id: instanceId },
        data: {
          status: "ACTIVE",
          lastActiveAt: new Date(),
        },
      });

      // Log deployment
      await prisma.deploymentLog.create({
        data: {
          instanceId,
          step: "COMPLETED",
          status: "SUCCESS",
          message: "Instance deployed successfully",
          metadata: {
            model: deployConfig.model,
            personality: deployConfig.personality,
            telegramUsername: botInfo.username,
          },
        },
      });

      logger.info("Instance deployed successfully", {
        instanceId,
        telegramUsername: botInfo.username,
      });

      return {
        instanceId,
        onChainId: instance.onChainId,
        telegramBotUsername: botInfo.username,
        endpoint,
      };
    } catch (error) {
      logger.error("Deployment failed", { instanceId, error });
      
      await prisma.instance.update({
        where: { id: instanceId },
        data: { status: "FAILED" },
      }).catch(() => {});

      await prisma.deploymentLog.create({
        data: {
          instanceId,
          step: "FAILED",
          status: "ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      }).catch(() => {});

      throw error;
    }
  }

  private async updateInstanceStatus(
    instanceId: string,
    status: InstanceStatus
  ): Promise<void> {
    await prisma.deploymentLog.create({
      data: {
        instanceId,
        step: status,
        status: "IN_PROGRESS",
        message: `Instance status: ${status}`,
      },
    }).catch(() => {});
  }

  private async encryptToken(token: string): Promise<string> {
    // In production, use proper encryption
    // For now, just base64 encode
    return Buffer.from(token).toString("base64");
  }

  async getDeploymentStatus(instanceId: string): Promise<{
    status: InstanceStatus;
    progress: number;
    message: string;
    telegramBotUrl?: string;
  }> {
    const instance = await prisma.instance.findUnique({
      where: { id: instanceId },
    });

    if (!instance) {
      throw new Error("Instance not found");
    }

    const progressMap: Record<InstanceStatus, number> = {
      PENDING: 10,
      PROVISIONING: 40,
      CONFIGURING: 70,
      ACTIVE: 100,
      PAUSED: 100,
      FAILED: 0,
      TERMINATED: 0,
    };

    const messageMap: Record<InstanceStatus, string> = {
      PENDING: "Initializing deployment...",
      PROVISIONING: "Provisioning on 0G Compute...",
      CONFIGURING: "Configuring Telegram webhook...",
      ACTIVE: "Your bot is live!",
      PAUSED: "Instance is paused",
      FAILED: "Deployment failed",
      TERMINATED: "Instance terminated",
    };

    return {
      status: instance.status as InstanceStatus,
      progress: progressMap[instance.status as InstanceStatus] || 0,
      message: messageMap[instance.status as InstanceStatus] || "Unknown status",
      telegramBotUrl: instance.telegramBotUsername
        ? `https://t.me/${instance.telegramBotUsername}`
        : undefined,
    };
  }

  async stopInstance(instanceId: string, userId: string): Promise<void> {
    const instance = await prisma.instance.findFirst({
      where: { id: instanceId, userId },
    });

    if (!instance) {
      throw new Error("Instance not found");
    }

    // Delete webhook
    const token = Buffer.from(instance.telegramBotToken, "base64").toString();
    await telegramService.deleteWebhook(token);

    // Update status
    await prisma.instance.update({
      where: { id: instanceId },
      data: { status: "TERMINATED" },
    });

    logger.info("Instance stopped", { instanceId });
  }
}

export const orchestratorService = new OrchestratorService();
