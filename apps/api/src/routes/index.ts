import { Router } from "express";
import { deployRouter } from "./deploy.js";
import { instancesRouter } from "./instances.js";
import { healthRouter } from "./health.js";

const router = Router();

router.use("/health", healthRouter);
router.use("/deploy", deployRouter);
router.use("/instances", instancesRouter);

export { router as apiRouter };
