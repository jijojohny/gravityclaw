import { Router, Response, NextFunction, Request } from "express";
import { z } from "zod";
import { config, isProduction } from "../config/index.js";
import { recordInstanceUsage, getUsageSummaryForUser } from "../services/usage.js";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth.js";
import { logger } from "../services/logger.js";

const router = Router();

function internalUsageSecretMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!config.usageIngestSecret) {
    if (isProduction) {
      return res.status(503).json({
        success: false,
        error: "USAGE_INGEST_SECRET is required in production",
      });
    }
    return next();
  }
  const provided = req.headers["x-internal-secret"];
  if (typeof provided !== "string" || provided !== config.usageIngestSecret) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  next();
}

const recordBody = z.object({
  instanceId: z.string().min(1),
  messageCount: z.number().int().positive(),
  tokensUsed: z.number().int().nonnegative().optional(),
  cost: z.number().nonnegative().optional(),
});

router.get(
  "/summary",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const summary = await getUsageSummaryForUser(req.user!.id);
      return res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      logger.error("Failed to load usage summary", { error });
      return res.status(500).json({
        success: false,
        error: "Failed to load usage summary",
      });
    }
  }
);

router.post("/record", internalUsageSecretMiddleware, async (req, res: Response) => {
  try {
    const parsed = recordBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid body",
        details: parsed.error.flatten(),
      });
    }

    const { instanceId, messageCount, tokensUsed, cost } = parsed.data;
    const result = await recordInstanceUsage(instanceId, {
      messageCount,
      tokensUsed,
      cost,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to record usage";
    const code = message.includes("not found") ? 404 : 400;
    logger.error("Usage record failed", { error });
    return res.status(code).json({
      success: false,
      error: message,
    });
  }
});

export { router as usageRouter };
