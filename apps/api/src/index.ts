import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config/index.js";
import { apiRouter } from "./routes/index.js";
import { stripeWebhookHandler } from "./routes/stripeWebhook.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { logger } from "./services/logger.js";

const app = express();

// Middleware
app.use(helmet());
const corsOrigin =
  process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()) ?? [
    "http://localhost:3000",
    "http://localhost:3001",
  ];

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

// Stripe webhooks require the raw body for signature verification
app.post(
  "/api/webhook/stripe",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    void stripeWebhookHandler(req, res).catch(next);
  }
);

app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// API Routes
app.use("/api", apiRouter);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Not found",
  });
});

// Start server
app.listen(config.port, () => {
  logger.info(`GravityClaw API server running on port ${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);
});

export default app;
