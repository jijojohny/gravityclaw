import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * priceMonthly is in cents (e.g. 500 = $5.00).
 * Set STRIPE_PRICE_STARTER in .env to your recurring Price id from Stripe Dashboard.
 */
async function main() {
  const starterPrice = process.env.STRIPE_PRICE_STARTER || null;

  await prisma.plan.upsert({
    where: { name: "starter" },
    create: {
      name: "starter",
      stripePriceId: starterPrice,
      priceMonthly: 500,
      maxInstances: 1,
      maxMessages: 10000,
      features: [
        "1 bot instance",
        "10k messages / month",
        "Telegram channel",
      ],
    },
    update: {
      ...(starterPrice ? { stripePriceId: starterPrice } : {}),
    },
  });

  await prisma.plan.upsert({
    where: { name: "pro" },
    create: {
      name: "pro",
      stripePriceId: process.env.STRIPE_PRICE_PRO || null,
      priceMonthly: 2900,
      maxInstances: 5,
      maxMessages: 100000,
      features: [
        "Up to 5 instances",
        "100k messages / month",
        "Priority support",
      ],
    },
    update: {
      ...(process.env.STRIPE_PRICE_PRO
        ? { stripePriceId: process.env.STRIPE_PRICE_PRO }
        : {}),
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    void prisma.$disconnect();
    process.exit(1);
  });
