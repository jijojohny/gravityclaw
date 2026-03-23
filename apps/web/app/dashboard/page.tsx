"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Bot,
  Plus,
  Settings,
  MessageSquare,
  Activity,
  Clock,
  Zap,
  ExternalLink,
  LogOut,
  Loader2,
  Square,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";

interface InstanceRow {
  id: string;
  name: string;
  telegramUsername: string;
  model: string;
  personality: string;
  status: string;
  messagesThisPeriod: number;
  messagesLifetime: number;
  planMaxMessages: number | null;
  lastActive: string;
}

interface Stats {
  totalMessages: number;
  activeInstances: number;
  uptime: string;
  avgResponseTime: string;
}

const defaultStats: Stats = {
  totalMessages: 0,
  activeInstances: 0,
  uptime: "99.9%",
  avgResponseTime: "1.2s",
};

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: "Pending",
    PROVISIONING: "Provisioning",
    CONFIGURING: "Configuring",
    ACTIVE: "Active",
    PAUSED: "Stopped",
    FAILED: "Failed",
    TERMINATED: "Terminated",
  };
  return map[status] ?? status;
}

function statusClass(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "bg-green-500/10 text-green-500";
    case "PAUSED":
      return "bg-amber-500/10 text-amber-500";
    case "FAILED":
    case "TERMINATED":
      return "bg-red-500/10 text-red-500";
    default:
      return "bg-primary/10 text-primary";
  }
}

function telegramUrl(username: string): string {
  const u = username.startsWith("@") ? username.slice(1) : username;
  return `https://t.me/${u}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { authenticated, logout, user, ready, getAccessToken } = usePrivy();
  const [instances, setInstances] = useState<InstanceRow[]>([]);
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionKind, setActionKind] = useState<string | null>(null);
  const [billingSummary, setBillingSummary] = useState<{
    planName: string;
    priceMonthly: number;
    periodEnd: string;
    status: string;
    messagesUsed: number;
    maxMessages: number | null;
    withinPlanLimit: boolean;
  } | null>(null);

  const loadDashboard = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    api.setToken(token);
    const [instRes, billRes] = await Promise.all([
      api.getInstances(),
      api.getBilling(),
    ]);

    if (!instRes.success || !instRes.data) {
      setLoadError(instRes.error ?? "Could not load instances");
      setInstances([]);
      setBillingSummary(null);
      return;
    }

    setLoadError(null);

    const billData = billRes.success ? billRes.data : undefined;
    const billOk = Boolean(billData);

    const usageById = new Map(
      billOk
        ? billData!.usage.byInstance.map((b) => [b.id, b] as const)
        : []
    );

    const planMax = billOk ? billData!.usage.maxMessages : null;
    const planUsed = billOk
      ? billData!.usage.messagesUsed
      : instRes.data.instances.reduce((s, i) => s + i.messagesCount, 0);
    const withinPlanLimit = billOk ? billData!.usage.withinPlanLimit : true;

    const rows: InstanceRow[] = instRes.data.instances.map((i) => {
      const u = usageById.get(i.id);
      return {
        id: i.id,
        name: i.name,
        telegramUsername: i.telegramBotUsername || "",
        model: i.model,
        personality: i.personality,
        status: i.status,
        messagesThisPeriod: u?.messagesInPeriod ?? 0,
        messagesLifetime: u?.messagesCountLifetime ?? i.messagesCount,
        planMaxMessages: planMax,
        lastActive: i.lastActiveAt
          ? new Date(i.lastActiveAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—",
      };
    });

    setInstances(rows);

    const activeCount = rows.filter((r) => r.status === "ACTIVE").length;
    setStats({
      ...defaultStats,
      totalMessages: planUsed,
      activeInstances: activeCount,
    });

    if (billOk && billData) {
      if (billData.subscription) {
        const sub = billData.subscription;
        setBillingSummary({
          planName: sub.plan.name,
          priceMonthly: sub.plan.priceMonthly,
          periodEnd: sub.currentPeriodEnd,
          status: sub.status,
          messagesUsed: planUsed,
          maxMessages: planMax,
          withinPlanLimit,
        });
      } else {
        setBillingSummary({
          planName: "No subscription",
          priceMonthly: 0,
          periodEnd: billData.usage.periodEnd,
          status: "NONE",
          messagesUsed: planUsed,
          maxMessages: planMax,
          withinPlanLimit,
        });
      }
    } else {
      setBillingSummary(null);
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
      return;
    }

    if (authenticated) {
      setLoading(true);
      void loadDashboard().finally(() => setLoading(false));
    }
  }, [ready, authenticated, router, loadDashboard]);

  const runAction = async (
    instanceId: string,
    kind: "stop" | "restart" | "terminate"
  ) => {
    const token = await getAccessToken();
    if (!token) return;
    api.setToken(token);
    setActionId(instanceId);
    setActionKind(kind);
    try {
      if (kind === "stop") {
        const res = await api.stopInstance(instanceId);
        if (!res.success) {
          setLoadError(res.error ?? "Stop failed");
          return;
        }
      } else if (kind === "restart") {
        const res = await api.restartInstance(instanceId);
        if (!res.success) {
          setLoadError(res.error ?? "Restart failed");
          return;
        }
      } else if (kind === "terminate") {
        if (
          typeof window !== "undefined" &&
          !window.confirm(
            "Terminate this bot permanently? Telegram webhook will be removed and the instance will be marked terminated."
          )
        ) {
          return;
        }
        const res = await api.deleteInstance(instanceId);
        if (!res.success) {
          setLoadError(res.error ?? "Terminate failed");
          return;
        }
      }
      await loadDashboard();
    } finally {
      setActionId(null);
      setActionKind(null);
    }
  };

  if (!ready || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/80 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Bot className="h-6 w-6 text-primary" />
            <span className="font-bold">GravityClaw</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.email?.address || user?.wallet?.address?.slice(0, 8) + "..." || "User"}
            </span>
            <Button variant="ghost" size="icon" onClick={logout} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {loadError ? (
          <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">{loadError}</p>
        ) : null}

        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your AI assistants and monitor usage
            </p>
          </div>
          <Link href="/deploy">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Deploy New Bot
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-2xl font-bold tabular-nums">
                    {stats.totalMessages.toLocaleString()}
                    {billingSummary?.maxMessages != null ? (
                      <span className="text-lg font-normal text-muted-foreground">
                        {" "}
                        / {billingSummary.maxMessages.toLocaleString()}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-sm text-muted-foreground">Messages (billing period)</p>
                  {billingSummary && !billingSummary.withinPlanLimit ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Over plan limit</p>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Bot className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activeInstances}</p>
                  <p className="text-sm text-muted-foreground">Active Bots</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Activity className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.uptime}</p>
                  <p className="text-sm text-muted-foreground">Uptime</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Zap className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.avgResponseTime}</p>
                  <p className="text-sm text-muted-foreground">Avg Response</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instances List */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Bots</h2>
          {instances.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No bots yet</h3>
                <p className="text-muted-foreground mb-4">
                  Deploy your first AI assistant in under 1 minute
                </p>
                <Link href="/deploy">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Deploy Your First Bot
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {instances.map((instance) => (
                <Card key={instance.id}>
                  <CardContent className="py-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{instance.name}</h3>
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full ${statusClass(instance.status)}`}
                            >
                              {statusLabel(instance.status)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {instance.telegramUsername
                              ? `@${instance.telegramUsername.replace(/^@/, "")}`
                              : "—"}{" "}
                            • {instance.model} • {instance.personality}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground mb-1">
                            <Clock className="h-3 w-3" />
                            {instance.lastActive}
                          </div>
                          <div className="w-40 ml-auto text-right">
                            <p className="text-xs text-muted-foreground mb-1">
                              Period: {instance.messagesThisPeriod.toLocaleString()} · Lifetime:{" "}
                              {instance.messagesLifetime.toLocaleString()}
                            </p>
                            {instance.planMaxMessages != null ? (
                              <Progress
                                value={Math.min(
                                  100,
                                  (instance.messagesThisPeriod / instance.planMaxMessages) * 100
                                )}
                                className="h-1.5"
                              />
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 justify-end">
                          {instance.telegramUsername ? (
                            <Button variant="outline" size="sm" asChild>
                              <a
                                href={telegramUrl(instance.telegramUsername)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          ) : null}
                          <Button variant="outline" size="sm" type="button" disabled>
                            <Settings className="h-4 w-4" />
                          </Button>

                          {instance.status !== "TERMINATED" && instance.status !== "FAILED" ? (
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                type="button"
                                disabled={
                                  instance.status === "PAUSED" ||
                                  (actionId === instance.id && actionKind === "stop")
                                }
                                title={
                                  instance.status === "PAUSED"
                                    ? "Already stopped"
                                    : "Stop bot (pause)"
                                }
                                onClick={() => void runAction(instance.id, "stop")}
                              >
                                {actionId === instance.id && actionKind === "stop" ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Square className="h-4 w-4" />
                                )}
                                <span className="ml-1 hidden sm:inline">Stop</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                disabled={actionId === instance.id && actionKind === "restart"}
                                title={
                                  instance.status === "PAUSED"
                                    ? "Start bot again"
                                    : "Refresh webhook / bounce"
                                }
                                onClick={() => void runAction(instance.id, "restart")}
                              >
                                {actionId === instance.id && actionKind === "restart" ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-4 w-4" />
                                )}
                                <span className="ml-1 hidden sm:inline">Restart</span>
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                type="button"
                                disabled={actionId === instance.id && actionKind === "terminate"}
                                title="Terminate permanently"
                                onClick={() => void runAction(instance.id, "terminate")}
                              >
                                {actionId === instance.id && actionKind === "terminate" ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                                <span className="ml-1 hidden sm:inline">Terminate</span>
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Subscription Card */}
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>Usage limits and billing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl font-bold capitalize">
                    {billingSummary?.planName ?? "—"}
                  </span>
                  {billingSummary ? (
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                      {billingSummary.status === "NONE" ? "No sub" : billingSummary.status}
                    </span>
                  ) : null}
                </div>
                <p className="text-muted-foreground">
                  {billingSummary && billingSummary.priceMonthly > 0 ? (
                    <>
                      {(billingSummary.priceMonthly / 100).toLocaleString(undefined, {
                        style: "currency",
                        currency: "USD",
                      })}
                      /mo · Renews{" "}
                      {new Date(billingSummary.periodEnd).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </>
                  ) : billingSummary ? (
                    <>
                      Usage this period: {billingSummary.messagesUsed.toLocaleString()}
                      {billingSummary.maxMessages != null
                        ? ` / ${billingSummary.maxMessages.toLocaleString()} messages`
                        : " messages"}
                    </>
                  ) : (
                    "Sign in and load billing to see plan details"
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href="/billing">Manage Billing</Link>
                </Button>
                <Button asChild>
                  <Link href="/billing">Upgrade Plan</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
