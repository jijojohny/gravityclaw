import { Router, Request, Response } from "express";
import { prisma } from "../services/prisma.js";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    return res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "connected",
        api: "running",
      },
    });
  } catch (error) {
    return res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "disconnected",
        api: "running",
      },
    });
  }
});

export { router as healthRouter };
