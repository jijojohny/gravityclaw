import { Router, Response } from "express";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth.js";
import { prisma } from "../services/prisma.js";
import { orchestratorService } from "../services/orchestrator.js";
import { logger } from "../services/logger.js";

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
      const instance = await prisma.instance.findFirst({
        where: {
          id: req.params.id,
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

router.patch(
  "/:id",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
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
      const { id } = req.params;

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
      const { id } = req.params;

      const instance = await prisma.instance.findFirst({
        where: { id, userId: req.user!.id },
      });

      if (!instance) {
        return res.status(404).json({
          success: false,
          error: "Instance not found",
        });
      }

      // Restart logic would go here
      await prisma.instance.update({
        where: { id },
        data: { status: "ACTIVE", lastActiveAt: new Date() },
      });

      return res.json({
        success: true,
        data: { message: "Instance restarted" },
      });
    } catch (error) {
      logger.error("Failed to restart instance", { error });
      return res.status(500).json({
        success: false,
        error: "Failed to restart instance",
      });
    }
  }
);

export { router as instancesRouter };
