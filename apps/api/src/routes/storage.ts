import { Router, Request, Response } from "express";
import { storageService } from "../services/storage.js";
import { logger } from "../services/logger.js";
import multer from "multer";
import * as path from "path";
import * as os from "os";

const router = Router();

// Configure multer for file uploads
const upload = multer({
  dest: path.join(os.tmpdir(), "gravityclaw-uploads"),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

/**
 * GET /storage/status
 * Get 0G Storage service status
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    const status = storageService.getStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error("Failed to get storage status", { error });
    res.status(500).json({
      success: false,
      error: "Failed to get storage status",
    });
  }
});

/**
 * POST /storage/upload
 * Upload a file to 0G Storage
 */
router.post("/upload", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file provided",
      });
    }

    const result = await storageService.uploadFile(req.file.path);

    res.json({
      success: true,
      data: {
        rootHash: result.rootHash,
        txHash: result.txHash,
        filename: req.file.originalname,
        size: req.file.size,
      },
    });
  } catch (error) {
    logger.error("Failed to upload file", { error });
    res.status(500).json({
      success: false,
      error: "Failed to upload file to 0G Storage",
    });
  }
});

/**
 * POST /storage/upload-data
 * Upload raw data to 0G Storage
 */
router.post("/upload-data", async (req: Request, res: Response) => {
  try {
    const { data, filename } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        error: "No data provided",
      });
    }

    const buffer = Buffer.from(data, typeof data === "string" ? "utf-8" : undefined);
    const result = await storageService.uploadData(buffer, filename || "data.txt");

    res.json({
      success: true,
      data: {
        rootHash: result.rootHash,
        txHash: result.txHash,
      },
    });
  } catch (error) {
    logger.error("Failed to upload data", { error });
    res.status(500).json({
      success: false,
      error: "Failed to upload data to 0G Storage",
    });
  }
});

/**
 * POST /storage/upload-config
 * Upload OpenClaw configuration to 0G Storage
 */
router.post("/upload-config", async (req: Request, res: Response) => {
  try {
    const { personality, customSoul } = req.body;

    if (!personality) {
      return res.status(400).json({
        success: false,
        error: "Personality type required",
      });
    }

    const result = await storageService.uploadConfig(personality, customSoul);

    res.json({
      success: true,
      data: {
        rootHash: result.rootHash,
        txHash: result.txHash,
        configHash: result.configHash,
        files: Object.keys(result.files),
      },
    });
  } catch (error) {
    logger.error("Failed to upload config", { error });
    res.status(500).json({
      success: false,
      error: "Failed to upload config to 0G Storage",
    });
  }
});

/**
 * GET /storage/download/:rootHash
 * Download a file from 0G Storage
 */
router.get("/download/:rootHash", async (req: Request, res: Response) => {
  try {
    const rootHash = req.params.rootHash as string;
    const outputPath = path.join(os.tmpdir(), `download-${rootHash}`);

    await storageService.downloadFile(rootHash, outputPath);

    res.download(outputPath, `${rootHash.substring(0, 16)}.bin`, (err) => {
      if (err) {
        logger.error("Failed to send file", { error: err });
      }
    });
  } catch (error) {
    logger.error("Failed to download file", { error });
    res.status(500).json({
      success: false,
      error: "Failed to download file from 0G Storage",
    });
  }
});

/**
 * GET /storage/config/:rootHash
 * Download OpenClaw config from 0G Storage
 */
router.get("/config/:rootHash", async (req: Request, res: Response) => {
  try {
    const rootHash = req.params.rootHash as string;
    const config = await storageService.downloadConfig(rootHash);

    if (!config) {
      return res.status(404).json({
        success: false,
        error: "Config not found",
      });
    }

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error("Failed to download config", { error });
    res.status(500).json({
      success: false,
      error: "Failed to download config from 0G Storage",
    });
  }
});

/**
 * POST /storage/hash
 * Calculate file hash without uploading
 */
router.post("/hash", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file provided",
      });
    }

    const hash = await storageService.calculateFileHash(req.file.path);

    res.json({
      success: true,
      data: {
        rootHash: hash,
        filename: req.file.originalname,
        size: req.file.size,
      },
    });
  } catch (error) {
    logger.error("Failed to calculate hash", { error });
    res.status(500).json({
      success: false,
      error: "Failed to calculate file hash",
    });
  }
});

export default router;
