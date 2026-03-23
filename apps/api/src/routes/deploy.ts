import { Router, Response } from "express";
import { DeploymentConfigSchema } from "../types/index.js";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth.js";
import { orchestratorService } from "../services/orchestrator.js";
import { logger } from "../services/logger.js";

const router = Router();

router.post(
  "/",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const config = DeploymentConfigSchema.parse(req.body);
      const userId = req.user!.id;

      logger.info("Starting deployment", { userId, model: config.model });

      const result = await orchestratorService.deployInstance(userId, config);

      return res.status(201).json({
        success: true,
        data: {
          instanceId: result.instanceId,
          telegramBotUsername: result.telegramBotUsername,
          telegramBotUrl: `https://t.me/${result.telegramBotUsername}`,
        },
      });
    } catch (error) {
      logger.error("Deployment failed", { error });
      
      if (error instanceof Error && error.message.includes("Telegram")) {
        return res.status(400).json({
          success: false,
          error: "Invalid Telegram bot token. Please check and try again.",
        });
      }

      return res.status(500).json({
        success: false,
        error: "Deployment failed. Please try again.",
      });
    }
  }
);

router.get(
  "/:instanceId/status",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { instanceId } = req.params;
      const status = await orchestratorService.getDeploymentStatus(instanceId);

      return res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      logger.error("Failed to get deployment status", { error });
      return res.status(404).json({
        success: false,
        error: "Instance not found",
      });
    }
  }
);

export { router as deployRouter };
