import { Request, Response } from "express";
import { config } from "../config/index.js";
import { logger } from "../services/logger.js";
import { getStripe } from "../services/stripe.js";
import {
  persistSubscriptionFromStripe,
  markSubscriptionCancelled,
} from "../services/subscriptionStripeSync.js";

/**
 * Raw body handler — must run with express.raw({ type: "application/json" }).
 */
export async function stripeWebhookHandler(req: Request, res: Response) {
  if (!config.stripe.webhookSecret) {
    logger.error("STRIPE_WEBHOOK_SECRET is not set");
    return res.status(500).json({ error: "Webhook not configured" });
  }

  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") {
    return res.status(400).json({ error: "Missing stripe-signature" });
  }

  let event;
  try {
    const stripe = getStripe();
    const rawBody = req.body;
    if (!Buffer.isBuffer(rawBody)) {
      logger.error("Stripe webhook expected raw buffer body");
      return res.status(400).json({ error: "Invalid body" });
    }
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      config.stripe.webhookSecret
    );
  } catch (err) {
    logger.warn("Stripe webhook signature verification failed", { err });
    return res.status(400).json({ error: "Invalid signature" });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        await persistSubscriptionFromStripe(sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await markSubscriptionCancelled(sub.id);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object;
        if (typeof invoice.subscription === "string") {
          const stripe = getStripe();
          const sub = await stripe.subscriptions.retrieve(invoice.subscription);
          await persistSubscriptionFromStripe(sub);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        if (typeof invoice.subscription === "string") {
          const stripe = getStripe();
          const sub = await stripe.subscriptions.retrieve(invoice.subscription);
          await persistSubscriptionFromStripe(sub);
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    logger.error("Stripe webhook handler error", { err, type: event.type });
    return res.status(500).json({ error: "Webhook handler failed" });
  }

  return res.json({ received: true });
}
