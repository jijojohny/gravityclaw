import { Router } from "express";
import { deployRouter } from "./deploy.js";
import { instancesRouter } from "./instances.js";
import { healthRouter } from "./health.js";
import contractsRouter from "./contracts.js";

const router = Router();

router.use("/health", healthRouter);
router.use("/deploy", deployRouter);
router.use("/instances", instancesRouter);
router.use("/contracts", contractsRouter);

export { router as apiRouter };
