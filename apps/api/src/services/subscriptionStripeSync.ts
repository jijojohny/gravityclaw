import type Stripe from "stripe";
import { prisma } from "./prisma.js";
import { logger } from "./logger.js";
import { mapStripeSubscriptionStatus } from "./stripe.js";

export async function persistSubscriptionFromStripe(
  sub: Stripe.Subscription
): Promise<void> {
  let userId: string | null = sub.metadata?.userId ?? null;
  if (!userId) {
    const customerId =
      typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
    });
    userId = user?.id ?? null;
  }

  if (!userId) {
    logger.warn("Stripe subscription webhook: could not resolve user", {
      subscriptionId: sub.id,
    });
    return;
  }

  const priceId = sub.items.data[0]?.price.id;
  if (!priceId) {
    logger.warn("Stripe subscription has no price item", { subscriptionId: sub.id });
    return;
  }

  const plan = await prisma.plan.findFirst({
    where: { stripePriceId: priceId },
  });

  if (!plan) {
    logger.error("No Plan row matches Stripe price id", { priceId, subscriptionId: sub.id });
    return;
  }

  const existing = await prisma.subscription.findUnique({
    where: { userId },
  });

  const newStart = new Date(sub.current_period_start * 1000);
  const newEnd = new Date(sub.current_period_end * 1000);
  const periodChanged =
    !!existing &&
    existing.currentPeriodStart.getTime() !== newStart.getTime();

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      planId: plan.id,
      stripeSubscriptionId: sub.id,
      status: mapStripeSubscriptionStatus(sub.status),
      currentPeriodStart: newStart,
      currentPeriodEnd: newEnd,
      messagesUsed: 0,
      autoRenew: !sub.cancel_at_period_end,
    },
    update: {
      planId: plan.id,
      stripeSubscriptionId: sub.id,
      status: mapStripeSubscriptionStatus(sub.status),
      currentPeriodStart: newStart,
      currentPeriodEnd: newEnd,
      autoRenew: !sub.cancel_at_period_end,
      ...(periodChanged ? { messagesUsed: 0 } : {}),
    },
  });
}

export async function markSubscriptionCancelled(
  stripeSubscriptionId: string
): Promise<void> {
  const existing = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId },
  });
  if (!existing) return;

  await prisma.subscription.update({
    where: { id: existing.id },
    data: {
      status: "CANCELLED",
      autoRenew: false,
    },
  });
}
