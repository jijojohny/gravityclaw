import { Router, Response } from "express";
import { z } from "zod";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth.js";
import { prisma } from "../services/prisma.js";
import { orchestratorService } from "../services/orchestrator.js";
import { logger } from "../services/logger.js";
import { recordInstanceUsage } from "../services/usage.js";

const router = Router();

router.get(
  "/",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const instances = await prisma.instance.findMany({
        where: { userId: req.user!.id },
        select: {
          id: true,
          name: true,
          model: true,
          personality: true,
          telegramBotUsername: true,
          status: true,
          messagesCount: true,
          lastActiveAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return res.json({
        success: true,
        data: { instances },
      });
    } catch (error) {
      logger.error("Failed to fetch instances", { error });
      return res.status(500).json({
        success: false,
        error: "Failed to fetch instances",
      });
    }
  }
);

router.get(
  "/:id",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const instance = await prisma.instance.findFirst({
        where: {
          id: id as string,
          userId: req.user!.id,
        },
        include: {
          usageLogs: {
            orderBy: { date: "desc" },
            take: 30,
          },
        },
      });

      if (!instance) {
        return res.status(404).json({
          success: false,
          error: "Instance not found",
        });
      }

      // Remove sensitive data
      const { telegramBotToken, ...safeInstance } = instance;

      return res.json({
        success: true,
        data: { instance: safeInstance },
      });
    } catch (error) {
      logger.error("Failed to fetch instance", { error });
      return res.status(500).json({
        success: false,
        error: "Failed to fetch instance",
      });
    }
  }
);

const instanceUsageBody = z.object({
  messageCount: z.number().int().positive(),
  tokensUsed: z.number().int().nonnegative().optional(),
  cost: z.number().nonnegative().optional(),
});

router.post(
  "/:id/usage",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;

      const instance = await prisma.instance.findFirst({
        where: { id, userId: req.user!.id },
        select: { id: true },
      });

      if (!instance) {
        return res.status(404).json({
          success: false,
          error: "Instance not found",
        });
      }

      const parsed = instanceUsageBody.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid body",
          details: parsed.error.flatten(),
        });
      }

      const result = await recordInstanceUsage(id, parsed.data);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Failed to record instance usage", { error });
      const message =
        error instanceof Error ? error.message : "Failed to record usage";
      return res.status(400).json({
        success: false,
        error: message,
      });
    }
  }
);

router.patch(
  "/:id",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      const { name, status } = req.body;

      const instance = await prisma.instance.findFirst({
        where: { id, userId: req.user!.id },
      });

      if (!instance) {
        return res.status(404).json({
          success: false,
          error: "Instance not found",
        });
      }

      const updated = await prisma.instance.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(status && { status }),
        },
      });

      return res.json({
        success: true,
        data: { instance: updated },
      });
    } catch (error) {
      logger.error("Failed to update instance", { error });
      return res.status(500).json({
        success: false,
        error: "Failed to update instance",
      });
    }
  }
);

router.delete(
  "/:id",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;

      await orchestratorService.stopInstance(id, req.user!.id);

      return res.json({
        success: true,
        data: { message: "Instance terminated" },
      });
    } catch (error) {
      logger.error("Failed to delete instance", { error });
      return res.status(500).json({
        success: false,
        error: "Failed to terminate instance",
      });
    }
  }
);

router.post(
  "/:id/restart",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;

      const instance = await prisma.instance.findFirst({
        where: { id, userId: req.user!.id },
      });

      if (!instance) {
        return res.status(404).json({
          success: false,
          error: "Instance not found",
        });
      }

      await orchestratorService.restartInstance(id, req.user!.id);

      return res.json({
        success: true,
        data: { message: "Instance restarted" },
      });
    } catch (error) {
      logger.error("Failed to restart instance", { error });
      const message =
        error instanceof Error ? error.message : "Failed to restart instance";
      const code =
        message.includes("not found") || message.includes("Cannot restart")
          ? 400
          : 500;
      return res.status(code).json({
        success: false,
        error: message,
      });
    }
  }
);

router.post(
  "/:id/stop",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;

      await orchestratorService.pauseInstance(id, req.user!.id);

      return res.json({
        success: true,
        data: { message: "Instance stopped" },
      });
    } catch (error) {
      logger.error("Failed to stop instance", { error });
      const message =
        error instanceof Error ? error.message : "Failed to stop instance";
      const code = message.includes("not found") ? 404 : message.includes("Cannot pause") ? 400 : 500;
      return res.status(code).json({
        success: false,
        error: message,
      });
    }
  }
);

router.post(
  "/:id/pause",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;

      await orchestratorService.pauseInstance(id, req.user!.id);

      return res.json({
        success: true,
        data: { message: "Instance paused" },
      });
    } catch (error) {
      logger.error("Failed to pause instance", { error });
      return res.status(500).json({
        success: false,
        error: "Failed to pause instance",
      });
    }
  }
);

router.post(
  "/:id/resume",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;

      await orchestratorService.resumeInstance(id, req.user!.id);

      return res.json({
        success: true,
        data: { message: "Instance resumed" },
      });
    } catch (error) {
      logger.error("Failed to resume instance", { error });
      return res.status(500).json({
        success: false,
        error: "Failed to resume instance",
      });
    }
  }
);

export { router as instancesRouter };
