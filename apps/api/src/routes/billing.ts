import { Router, Response } from "express";
import type Stripe from "stripe";
import { z } from "zod";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth.js";
import { prisma } from "../services/prisma.js";
import { logger } from "../services/logger.js";
import { getStripe, stripeConfigured } from "../services/stripe.js";
import { persistSubscriptionFromStripe } from "../services/subscriptionStripeSync.js";
import { getUsageSummaryForUser } from "../services/usage.js";

const router = Router();

const subscribeBody = z.object({
  planId: z.string().min(1),
  paymentMethodId: z.string().min(1),
});

router.get("/plans", async (_req, res: Response) => {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { priceMonthly: "asc" },
      select: {
        id: true,
        name: true,
        priceMonthly: true,
        maxInstances: true,
        maxMessages: true,
        features: true,
        stripePriceId: true,
      },
    });

    const stripeOk = stripeConfigured();

    return res.json({
      success: true,
      data: {
        plans: plans.map((p) => ({
          ...p,
          stripeReady: stripeOk && Boolean(p.stripePriceId),
        })),
      },
    });
  } catch (error) {
    logger.error("Failed to list plans", { error });
    return res.status(500).json({
      success: false,
      error: "Failed to list plans",
    });
  }
});

router.get("/", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    const usageSummary = await getUsageSummaryForUser(userId);

    let invoices: Array<{
      id: string;
      status: string | null;
      amountPaid: number;
      currency: string;
      created: number;
      hostedInvoiceUrl: string | null;
      invoicePdf: string | null;
    }> = [];

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (stripeConfigured() && user?.stripeCustomerId) {
      const stripe = getStripe();
      const list = await stripe.invoices.list({
        customer: user.stripeCustomerId,
        limit: 24,
      });
      invoices = list.data.map((inv) => ({
        id: inv.id,
        status: inv.status ?? null,
        amountPaid: inv.amount_paid,
        currency: inv.currency,
        created: inv.created,
        hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
        invoicePdf: inv.invoice_pdf ?? null,
      }));
    }

    const messagesUsed = usageSummary.messagesUsed;

    return res.json({
      success: true,
      data: {
        subscription: subscription
          ? {
              id: subscription.id,
              planId: subscription.planId,
              plan: subscription.plan,
              status: subscription.status,
              currentPeriodStart: subscription.currentPeriodStart,
              currentPeriodEnd: subscription.currentPeriodEnd,
              messagesUsed,
              maxMessages: subscription.plan.maxMessages,
              autoRenew: subscription.autoRenew,
              stripeSubscriptionId: subscription.stripeSubscriptionId,
            }
          : null,
        usage: {
          messagesUsed,
          messagesFromInstances: usageSummary.messagesFromInstancesLifetime,
          maxMessages: usageSummary.maxMessages,
          periodStart: usageSummary.periodStart,
          periodEnd: usageSummary.periodEnd,
          withinPlanLimit: usageSummary.withinPlanLimit,
          tokensUsedInPeriod: usageSummary.tokensUsedInPeriod,
          estimatedCostInPeriod: usageSummary.estimatedCostInPeriod,
          byInstance: usageSummary.byInstance,
          recentDaily: usageSummary.recentDaily,
        },
        invoices,
      },
    });
  } catch (error) {
    logger.error("Failed to load billing", { error });
    return res.status(500).json({
      success: false,
      error: "Failed to load billing",
    });
  }
});

router.post(
  "/subscribe",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!stripeConfigured()) {
        return res.status(503).json({
          success: false,
          error: "Stripe is not configured",
        });
      }

      const parsed = subscribeBody.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid body",
          details: parsed.error.flatten(),
        });
      }

      const { planId, paymentMethodId } = parsed.data;
      const userId = req.user!.id;

      const plan = await prisma.plan.findUnique({
        where: { id: planId },
      });

      if (!plan?.stripePriceId) {
        return res.status(400).json({
          success: false,
          error: "Plan is not available for card checkout (missing Stripe price)",
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      const stripe = getStripe();

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email ?? undefined,
          metadata: { userId },
        });
        customerId = customer.id;
        await prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId: customerId },
        });
      }

      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });

      const existing = await prisma.subscription.findUnique({
        where: { userId },
      });

      let stripeSubscription: Stripe.Subscription | undefined;

      if (existing?.stripeSubscriptionId) {
        const prior = await stripe.subscriptions.retrieve(
          existing.stripeSubscriptionId
        );
        if (prior.status === "active" || prior.status === "trialing") {
          const itemId = prior.items.data[0]?.id;
          if (!itemId) {
            return res.status(500).json({
              success: false,
              error: "Existing subscription has no line items",
            });
          }
          stripeSubscription = await stripe.subscriptions.update(
            existing.stripeSubscriptionId,
            {
              items: [{ id: itemId, price: plan.stripePriceId }],
              default_payment_method: paymentMethodId,
              metadata: { userId },
              payment_behavior: "error_if_incomplete",
              proration_behavior: "create_prorations",
            }
          );
        }
      }

      if (!stripeSubscription) {
        stripeSubscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [{ price: plan.stripePriceId }],
          default_payment_method: paymentMethodId,
          metadata: { userId },
          payment_behavior: "error_if_incomplete",
          expand: ["latest_invoice.payment_intent"],
        });
      }

      await persistSubscriptionFromStripe(stripeSubscription);

      const updated = await prisma.subscription.findUnique({
        where: { userId },
        include: { plan: true },
      });

      return res.json({
        success: true,
        data: {
          subscription: updated,
        },
      });
    } catch (error) {
      logger.error("Subscribe failed", { error });
      const message =
        error instanceof Error ? error.message : "Failed to create subscription";
      return res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

router.post("/cancel", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!stripeConfigured()) {
      return res.status(503).json({
        success: false,
        error: "Stripe is not configured",
      });
    }

    const userId = req.user!.id;
    const sub = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!sub?.stripeSubscriptionId) {
      return res.status(400).json({
        success: false,
        error: "No Stripe subscription to cancel",
      });
    }

    const stripe = getStripe();
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await prisma.subscription.update({
      where: { userId },
      data: { autoRenew: false },
    });

    return res.json({ success: true, data: { success: true } });
  } catch (error) {
    logger.error("Cancel subscription failed", { error });
    return res.status(500).json({
      success: false,
      error: "Failed to cancel subscription",
    });
  }
});

router.post(
  "/portal",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!stripeConfigured()) {
        return res.status(503).json({
          success: false,
          error: "Stripe is not configured",
        });
      }

      const returnUrl =
        (typeof req.body?.returnUrl === "string" && req.body.returnUrl) ||
        process.env.STRIPE_BILLING_RETURN_URL ||
        "http://localhost:3001/dashboard";

      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { stripeCustomerId: true },
      });

      if (!user?.stripeCustomerId) {
        return res.status(400).json({
          success: false,
          error: "No billing account yet. Subscribe to a plan first.",
        });
      }

      const stripe = getStripe();
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: returnUrl,
      });

      return res.json({
        success: true,
        data: { url: session.url },
      });
    } catch (error) {
      logger.error("Billing portal failed", { error });
      return res.status(500).json({
        success: false,
        error: "Failed to create billing portal session",
      });
    }
  }
);

export { router as billingRouter };
