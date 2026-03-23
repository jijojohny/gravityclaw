import { Router } from "express";
import { contractProvider } from "../contracts/index.js";
import { instanceRegistryService, InstanceStatus } from "../contracts/instanceRegistry.js";
import { subscriptionService } from "../contracts/subscription.js";
import { treasuryService } from "../contracts/treasury.js";
import { logger } from "../services/logger.js";
import { config } from "../config/index.js";

const router = Router();

/**
 * GET /contracts/status
 * Get contract connection status and addresses
 */
router.get("/status", async (req, res) => {
  try {
    const balance = await contractProvider.getBalance().catch(() => "0");
    const blockNumber = await contractProvider.getBlockNumber().catch(() => 0);

    res.json({
      success: true,
      data: {
        connected: true,
        network: {
          chainId: config.og.chainId,
          rpc: config.og.chainRpc,
          blockNumber,
        },
        operator: {
          address: contractProvider.getSigner()?.address || null,
          balance: balance + " OG",
        },
        contracts: {
          instanceRegistry: config.contracts.instanceRegistry || null,
          subscription: config.contracts.subscription || null,
          treasury: config.contracts.treasury || null,
        },
      },
    });
  } catch (error) {
    logger.error("Failed to get contract status", { error });
    res.status(500).json({
      success: false,
      error: "Failed to get contract status",
    });
  }
});

/**
 * GET /contracts/instances/total
 * Get total instance count from chain
 */
router.get("/instances/total", async (req, res) => {
  try {
    const total = await instanceRegistryService.getTotalInstances();
    res.json({ success: true, data: { total } });
  } catch (error) {
    logger.error("Failed to get total instances", { error });
    res.status(500).json({ success: false, error: "Failed to get total instances" });
  }
});

/**
 * GET /contracts/instances/:id
 * Get instance details from chain
 */
router.get("/instances/:id", async (req, res) => {
  try {
    const instance = await instanceRegistryService.getInstance(req.params.id);
    
    if (!instance) {
      return res.status(404).json({ success: false, error: "Instance not found" });
    }

    res.json({
      success: true,
      data: {
        ...instance,
        computeProviderId: instance.computeProviderId.toString(),
        createdAt: Number(instance.createdAt),
        lastActiveAt: Number(instance.lastActiveAt),
        statusName: InstanceStatus[instance.status],
      },
    });
  } catch (error) {
    logger.error("Failed to get instance", { id: req.params.id, error });
    res.status(500).json({ success: false, error: "Failed to get instance" });
  }
});

/**
 * GET /contracts/instances/user/:address
 * Get all instances for a user address
 */
router.get("/instances/user/:address", async (req, res) => {
  try {
    const instanceIds = await instanceRegistryService.getUserInstances(req.params.address);
    
    const instances = await Promise.all(
      instanceIds.map(async (id: string) => {
        const instance = await instanceRegistryService.getInstanceByBytes(id);
        return instance ? {
          ...instance,
          computeProviderId: instance.computeProviderId.toString(),
          createdAt: Number(instance.createdAt),
          lastActiveAt: Number(instance.lastActiveAt),
          statusName: InstanceStatus[instance.status],
        } : null;
      })
    );

    res.json({
      success: true,
      data: instances.filter(Boolean),
    });
  } catch (error) {
    logger.error("Failed to get user instances", { address: req.params.address, error });
    res.status(500).json({ success: false, error: "Failed to get user instances" });
  }
});

/**
 * GET /contracts/plans
 * Get all subscription plans
 */
router.get("/plans", async (req, res) => {
  try {
    const plans = await subscriptionService.getAllPlans();
    
    res.json({
      success: true,
      data: plans.map((plan, index) => ({
        id: index,
        name: plan.name,
        pricePerMonth: subscriptionService.formatPrice(plan.pricePerMonth),
        priceRaw: plan.pricePerMonth.toString(),
        maxInstances: Number(plan.maxInstances),
        maxMessagesPerMonth: plan.maxMessagesPerMonth === 0n 
          ? "unlimited" 
          : Number(plan.maxMessagesPerMonth),
        isActive: plan.isActive,
      })),
    });
  } catch (error) {
    logger.error("Failed to get plans", { error });
    res.status(500).json({ success: false, error: "Failed to get plans" });
  }
});

/**
 * GET /contracts/plans/:id
 * Get specific plan details
 */
router.get("/plans/:id", async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    const plan = await subscriptionService.getPlan(planId);
    
    res.json({
      success: true,
      data: {
        id: planId,
        name: plan.name,
        pricePerMonth: subscriptionService.formatPrice(plan.pricePerMonth),
        priceRaw: plan.pricePerMonth.toString(),
        maxInstances: Number(plan.maxInstances),
        maxMessagesPerMonth: plan.maxMessagesPerMonth === 0n 
          ? "unlimited" 
          : Number(plan.maxMessagesPerMonth),
        isActive: plan.isActive,
      },
    });
  } catch (error) {
    logger.error("Failed to get plan", { id: req.params.id, error });
    res.status(500).json({ success: false, error: "Failed to get plan" });
  }
});

/**
 * GET /contracts/subscription/:address
 * Get user subscription status
 */
router.get("/subscription/:address", async (req, res) => {
  try {
    const subscription = await subscriptionService.getSubscription(req.params.address);
    const isActive = await subscriptionService.isActive(req.params.address);
    
    if (!subscription) {
      return res.json({
        success: true,
        data: {
          hasSubscription: false,
          isActive: false,
        },
      });
    }

    const plan = await subscriptionService.getPlan(Number(subscription.planId));
    const remainingMessages = await subscriptionService.getRemainingMessages(req.params.address);

    res.json({
      success: true,
      data: {
        hasSubscription: true,
        isActive,
        planId: Number(subscription.planId),
        planName: plan.name,
        startTime: Number(subscription.startTime),
        endTime: Number(subscription.endTime),
        messagesUsed: Number(subscription.messagesUsed),
        remainingMessages: remainingMessages === BigInt(Number.MAX_SAFE_INTEGER) 
          ? "unlimited" 
          : Number(remainingMessages),
        autoRenew: subscription.autoRenew,
      },
    });
  } catch (error) {
    logger.error("Failed to get subscription", { address: req.params.address, error });
    res.status(500).json({ success: false, error: "Failed to get subscription" });
  }
});

/**
 * GET /contracts/treasury/stats
 * Get treasury statistics
 */
router.get("/treasury/stats", async (req, res) => {
  try {
    const stats = await treasuryService.getStats();
    const feePercent = await treasuryService.getFeePercent();
    
    res.json({
      success: true,
      data: {
        totalPlatformFees: treasuryService.formatAmount(stats.totalPlatformFees),
        totalProviderPayments: treasuryService.formatAmount(stats.totalProviderPayments),
        feePercent,
      },
    });
  } catch (error) {
    logger.error("Failed to get treasury stats", { error });
    res.status(500).json({ success: false, error: "Failed to get treasury stats" });
  }
});

/**
 * GET /contracts/treasury/balance/:address
 * Get user balance in treasury
 */
router.get("/treasury/balance/:address", async (req, res) => {
  try {
    const balance = await treasuryService.getUserBalance(req.params.address);
    
    res.json({
      success: true,
      data: {
        address: req.params.address,
        balance: treasuryService.formatAmount(balance),
        balanceRaw: balance.toString(),
      },
    });
  } catch (error) {
    logger.error("Failed to get treasury balance", { address: req.params.address, error });
    res.status(500).json({ success: false, error: "Failed to get treasury balance" });
  }
});

/**
 * GET /contracts/treasury/earnings/:address
 * Get provider earnings
 */
router.get("/treasury/earnings/:address", async (req, res) => {
  try {
    const earnings = await treasuryService.getProviderEarnings(req.params.address);
    
    res.json({
      success: true,
      data: {
        address: req.params.address,
        earnings: treasuryService.formatAmount(earnings),
        earningsRaw: earnings.toString(),
      },
    });
  } catch (error) {
    logger.error("Failed to get provider earnings", { address: req.params.address, error });
    res.status(500).json({ success: false, error: "Failed to get provider earnings" });
  }
});

export default router;
