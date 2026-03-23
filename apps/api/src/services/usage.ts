import { prisma } from "./prisma.js";

function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function endOfUtcMonth(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999)
  );
}

export type UsageSummary = {
  periodStart: Date;
  periodEnd: Date;
  messagesUsed: number;
  maxMessages: number | null;
  withinPlanLimit: boolean;
  messagesFromInstancesLifetime: number;
  tokensUsedInPeriod: number;
  estimatedCostInPeriod: number;
  byInstance: Array<{
    id: string;
    name: string;
    telegramBotUsername: string | null;
    status: string;
    messagesCountLifetime: number;
    messagesInPeriod: number;
  }>;
  recentDaily: Array<{ date: string; messageCount: number; tokensUsed: number }>;
};

/**
 * Record message usage for metering: UsageLog row, instance counters, subscription quota when active.
 */
export async function recordInstanceUsage(
  instanceId: string,
  input: { messageCount: number; tokensUsed?: number; cost?: number }
): Promise<{
  withinPlanLimit: boolean;
  messagesUsedAfter: number;
  maxMessages: number | null;
}> {
  const messageCount = Math.floor(input.messageCount);
  const tokensUsed = Math.floor(input.tokensUsed ?? 0);
  const cost = input.cost ?? 0;

  if (messageCount < 1) {
    throw new Error("messageCount must be at least 1");
  }

  return prisma.$transaction(async (tx) => {
    const instance = await tx.instance.findUnique({
      where: { id: instanceId },
      select: { id: true, userId: true },
    });

    if (!instance) {
      throw new Error("Instance not found");
    }

    await tx.usageLog.create({
      data: {
        instanceId,
        messageCount,
        tokensUsed,
        cost,
      },
    });

    await tx.instance.update({
      where: { id: instanceId },
      data: {
        messagesCount: { increment: messageCount },
        lastActiveAt: new Date(),
      },
    });

    const sub = await tx.subscription.findUnique({
      where: { userId: instance.userId },
      include: { plan: true },
    });

    const now = new Date();
    const activeSub =
      sub &&
      sub.status === "ACTIVE" &&
      sub.currentPeriodEnd > now &&
      sub.currentPeriodStart <= now;

    if (activeSub) {
      const maxMessages = sub.plan.maxMessages;
      const next = sub.messagesUsed + messageCount;
      const withinPlanLimit = next <= maxMessages;

      await tx.subscription.update({
        where: { id: sub.id },
        data: { messagesUsed: { increment: messageCount } },
      });

      return {
        withinPlanLimit,
        messagesUsedAfter: next,
        maxMessages,
      };
    }

    return {
      withinPlanLimit: true,
      messagesUsedAfter: 0,
      maxMessages: null,
    };
  });
}

export async function getUsageSummaryForUser(userId: string): Promise<UsageSummary> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: { plan: true },
  });

  const now = new Date();
  const useStripePeriod =
    subscription &&
    subscription.status !== "CANCELLED" &&
    subscription.status !== "EXPIRED" &&
    subscription.currentPeriodEnd > now;

  const periodStart = useStripePeriod
    ? subscription.currentPeriodStart
    : startOfUtcMonth(now);
  const periodEnd = useStripePeriod
    ? subscription.currentPeriodEnd
    : endOfUtcMonth(now);

  const maxMessages = useStripePeriod ? subscription.plan.maxMessages : null;

  const periodAgg = await prisma.usageLog.aggregate({
    where: {
      instance: { userId },
      date: { gte: periodStart, lte: periodEnd },
    },
    _sum: { messageCount: true, tokensUsed: true, cost: true },
  });

  const tokensUsedInPeriod = periodAgg._sum.tokensUsed ?? 0;
  const estimatedCostInPeriod = periodAgg._sum.cost ?? 0;

  const messagesUsed =
    subscription?.status === "ACTIVE"
      ? subscription.messagesUsed
      : (periodAgg._sum.messageCount ?? 0);

  const instances = await prisma.instance.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      telegramBotUsername: true,
      status: true,
      messagesCount: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const messagesFromInstancesLifetime = instances.reduce(
    (s, i) => s + i.messagesCount,
    0
  );

  const periodLogs = await prisma.usageLog.groupBy({
    by: ["instanceId"],
    where: {
      instance: { userId },
      date: { gte: periodStart, lte: periodEnd },
    },
    _sum: { messageCount: true },
  });

  const perInstancePeriod = new Map(
    periodLogs.map((r) => [r.instanceId, r._sum.messageCount ?? 0])
  );

  const withinPlanLimit =
    maxMessages == null ? true : messagesUsed <= maxMessages;

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  const rawDaily = await prisma.$queryRaw<
    Array<{ day: Date; msg: bigint; tok: bigint }>
  >`
    SELECT date_trunc('day', date AT TIME ZONE 'UTC') AS day,
           SUM("messageCount")::bigint AS msg,
           SUM("tokensUsed")::bigint AS tok
    FROM "UsageLog" ul
    INNER JOIN "Instance" i ON i.id = ul."instanceId"
    WHERE i."userId" = ${userId}
      AND ul.date >= ${thirtyDaysAgo}
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  const recentDaily = rawDaily.map((row) => ({
    date: row.day.toISOString().slice(0, 10),
    messageCount: Number(row.msg),
    tokensUsed: Number(row.tok),
  }));

  return {
    periodStart,
    periodEnd,
    messagesUsed,
    maxMessages,
    withinPlanLimit,
    messagesFromInstancesLifetime,
    tokensUsedInPeriod,
    estimatedCostInPeriod,
    byInstance: instances.map((i) => ({
      id: i.id,
      name: i.name,
      telegramBotUsername: i.telegramBotUsername,
      status: i.status,
      messagesCountLifetime: i.messagesCount,
      messagesInPeriod: perInstancePeriod.get(i.id) ?? 0,
    })),
    recentDaily,
  };
}
