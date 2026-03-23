import { Router, Request, Response } from "express";
import { computeService, ChatMessage } from "../services/compute.js";
import { logger } from "../services/logger.js";

const router = Router();

/**
 * GET /compute/status
 * Get 0G Compute service status
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    const status = computeService.getStatus();
    const accountInfo = await computeService.getAccountInfo();

    res.json({
      success: true,
      data: {
        ...status,
        account: accountInfo,
      },
    });
  } catch (error) {
    logger.error("Failed to get compute status", { error });
    res.status(500).json({
      success: false,
      error: "Failed to get compute status",
    });
  }
});

/**
 * GET /compute/services
 * List all available AI services on 0G Compute Network
 */
router.get("/services", async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    let services = await computeService.listServices();

    if (type) {
      services = services.filter((s) => s.serviceType === type);
    }

    res.json({
      success: true,
      data: {
        count: services.length,
        services,
      },
    });
  } catch (error) {
    logger.error("Failed to list compute services", { error });
    res.status(500).json({
      success: false,
      error: "Failed to list compute services",
    });
  }
});

/**
 * GET /compute/services/chatbot
 * List chatbot services
 */
router.get("/services/chatbot", async (req: Request, res: Response) => {
  try {
    const services = await computeService.getChatbotServices();

    res.json({
      success: true,
      data: {
        count: services.length,
        services,
      },
    });
  } catch (error) {
    logger.error("Failed to list chatbot services", { error });
    res.status(500).json({
      success: false,
      error: "Failed to list chatbot services",
    });
  }
});

/**
 * GET /compute/services/image
 * List text-to-image services
 */
router.get("/services/image", async (req: Request, res: Response) => {
  try {
    const services = await computeService.getImageServices();

    res.json({
      success: true,
      data: {
        count: services.length,
        services,
      },
    });
  } catch (error) {
    logger.error("Failed to list image services", { error });
    res.status(500).json({
      success: false,
      error: "Failed to list image services",
    });
  }
});

/**
 * GET /compute/provider/:address
 * Get service metadata for a provider
 */
router.get("/provider/:address", async (req: Request, res: Response) => {
  try {
    const address = req.params.address as string;
    const metadata = await computeService.getServiceMetadata(address);

    if (!metadata) {
      return res.status(404).json({
        success: false,
        error: "Provider not found or not available",
      });
    }

    res.json({
      success: true,
      data: metadata,
    });
  } catch (error) {
    logger.error("Failed to get provider metadata", { error });
    res.status(500).json({
      success: false,
      error: "Failed to get provider metadata",
    });
  }
});

/**
 * POST /compute/chat
 * Make a chat completion request
 */
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { provider, messages, systemPrompt, temperature, maxTokens } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Messages array is required",
      });
    }

    const chatMessages: ChatMessage[] = [];

    if (systemPrompt) {
      chatMessages.push({ role: "system", content: systemPrompt });
    }

    chatMessages.push(...messages);

    const response = await computeService.chatCompletion(provider, chatMessages, {
      temperature,
      maxTokens,
    });

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    logger.error("Chat completion failed", { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Chat completion failed",
    });
  }
});

/**
 * POST /compute/chat/simple
 * Simple chat endpoint with just a message
 */
router.post("/chat/simple", async (req: Request, res: Response) => {
  try {
    const { message, systemPrompt, provider } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: "Message is required",
      });
    }

    const response = await computeService.chat(message, systemPrompt, provider);

    res.json({
      success: true,
      data: {
        response,
      },
    });
  } catch (error) {
    logger.error("Simple chat failed", { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Chat failed",
    });
  }
});

/**
 * POST /compute/image/generate
 * Generate an image from text prompt
 */
router.post("/image/generate", async (req: Request, res: Response) => {
  try {
    const { provider, prompt, size, n } = req.body;

    if (!provider) {
      return res.status(400).json({
        success: false,
        error: "Provider address is required",
      });
    }

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: "Prompt is required",
      });
    }

    const response = await computeService.generateImage(provider, prompt, {
      size,
      n,
    });

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    logger.error("Image generation failed", { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Image generation failed",
    });
  }
});

/**
 * POST /compute/deposit
 * Deposit funds to compute ledger
 */
router.post("/deposit", async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Valid amount is required (minimum 3 0G for initial deposit)",
      });
    }

    await computeService.depositFunds(amount);

    res.json({
      success: true,
      data: {
        message: "Deposit successful",
        amount,
      },
    });
  } catch (error) {
    logger.error("Deposit failed", { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Deposit failed",
    });
  }
});

/**
 * POST /compute/transfer
 * Transfer funds to a provider sub-account
 */
router.post("/transfer", async (req: Request, res: Response) => {
  try {
    const { provider, amount } = req.body;

    if (!provider) {
      return res.status(400).json({
        success: false,
        error: "Provider address is required",
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Valid amount is required (minimum 1 0G recommended)",
      });
    }

    // Convert to wei (18 decimals)
    const amountWei = BigInt(Math.floor(amount * 1e18));
    await computeService.transferToProvider(provider, amountWei);

    res.json({
      success: true,
      data: {
        message: "Transfer successful",
        provider,
        amount,
      },
    });
  } catch (error) {
    logger.error("Transfer failed", { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Transfer failed",
    });
  }
});

export default router;
