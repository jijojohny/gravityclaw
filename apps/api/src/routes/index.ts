import { Router } from "express";
import { deployRouter } from "./deploy.js";
import { instancesRouter } from "./instances.js";
import { healthRouter } from "./health.js";
import contractsRouter from "./contracts.js";
import storageRouter from "./storage.js";
import computeRouter from "./compute.js";
import { billingRouter } from "./billing.js";
import { usageRouter } from "./usage.js";

const router = Router();

router.use("/health", healthRouter);
router.use("/deploy", deployRouter);
router.use("/instances", instancesRouter);
router.use("/contracts", contractsRouter);
router.use("/storage", storageRouter);
router.use("/compute", computeRouter);
router.use("/billing", billingRouter);
router.use("/usage", usageRouter);

export { router as apiRouter };
