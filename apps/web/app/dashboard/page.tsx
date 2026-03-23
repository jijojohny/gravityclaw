"use client";

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
  MoreVertical,
  ExternalLink,
  LogOut,
} from "lucide-react";

const mockInstances = [
  {
    id: "1",
    name: "My Assistant",
    telegramUsername: "@MyAssistantBot",
    model: "GPT-4o",
    personality: "Professional",
    status: "active",
    messagesThisMonth: 2847,
    maxMessages: 10000,
    lastActive: "2 minutes ago",
  },
];

const mockStats = {
  totalMessages: 2847,
  activeInstances: 1,
  uptime: "99.9%",
  avgResponseTime: "1.2s",
};

export default function DashboardPage() {
  const router = useRouter();
  const { authenticated, logout, user } = usePrivy();

  if (!authenticated) {
    router.push("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/80 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <span className="font-bold">GravityClaw</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.email?.address || "User"}
            </span>
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
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
                <div>
                  <p className="text-2xl font-bold">{mockStats.totalMessages.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Messages</p>
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
                  <p className="text-2xl font-bold">{mockStats.activeInstances}</p>
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
                  <p className="text-2xl font-bold">{mockStats.uptime}</p>
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
                  <p className="text-2xl font-bold">{mockStats.avgResponseTime}</p>
                  <p className="text-sm text-muted-foreground">Avg Response</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instances List */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Bots</h2>
          {mockInstances.length === 0 ? (
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
              {mockInstances.map((instance) => (
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
                            <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-xs rounded-full">
                              Active
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {instance.telegramUsername} • {instance.model} • {instance.personality}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Clock className="h-3 w-3" />
                            {instance.lastActive}
                          </div>
                          <div className="w-32">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>{instance.messagesThisMonth.toLocaleString()}</span>
                              <span>{instance.maxMessages.toLocaleString()}</span>
                            </div>
                            <Progress
                              value={(instance.messagesThisMonth / instance.maxMessages) * 100}
                              className="h-1.5"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={`https://t.me/${instance.telegramUsername.slice(1)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
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
            <CardDescription>Manage your subscription</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl font-bold">Starter</span>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                    Active
                  </span>
                </div>
                <p className="text-muted-foreground">
                  $5/month • Renews on April 23, 2026
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">Manage Billing</Button>
                <Button>Upgrade Plan</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
