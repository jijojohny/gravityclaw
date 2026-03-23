"use client";

import { useCallback, useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { api } from "@/lib/api";
import { ArrowLeft, Bot, CreditCard, Loader2, ExternalLink } from "lucide-react";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

type Plan = {
  id: string;
  name: string;
  priceMonthly: number;
  maxInstances: number;
  maxMessages: number;
  features: string[];
  stripeReady: boolean;
};

type BillingUsageState = {
  messagesUsed: number;
  messagesFromInstances: number;
  maxMessages: number | null;
  periodStart: string;
  periodEnd: string;
  withinPlanLimit: boolean;
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

function formatMoney(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function SubscribeForm({
  planId,
  email,
  onSubscribed,
}: {
  planId: string;
  email: string | undefined;
  onSubscribed: () => void;
}) {
  const { getAccessToken } = usePrivy();
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!stripe || !elements) return;

    const card = elements.getElement(CardElement);
    if (!card) {
      setError("Card field is not ready");
      return;
    }

    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setError("Not signed in");
        return;
      }
      api.setToken(token);

      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card,
        billing_details: { email: email || undefined },
      });

      if (pmError || !paymentMethod) {
        setError(pmError?.message ?? "Could not read card details");
        return;
      }

      const res = await api.subscribeBilling(planId, paymentMethod.id);
      if (!res.success) {
        setError(res.error ?? "Subscription failed");
        return;
      }
      onSubscribed();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div className="rounded-md border border-border bg-muted/30 p-4">
        <Label className="mb-2 block text-sm">Card</Label>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "hsl(var(--foreground))",
                "::placeholder": { color: "hsl(var(--muted-foreground))" },
              },
              invalid: { color: "#ef4444" },
            },
          }}
        />
      </div>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      <Button type="submit" disabled={!stripe || loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pay & subscribe
          </>
        )}
      </Button>
    </form>
  );
}

export default function BillingPage() {
  const { authenticated, ready, login, user, getAccessToken } = usePrivy();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [subscriptionSummary, setSubscriptionSummary] = useState<string | null>(null);
  const [billingUsage, setBillingUsage] = useState<BillingUsageState | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const email =
    user?.email?.address ??
    (user?.google?.email as string | undefined) ??
    undefined;

  const refreshBilling = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    api.setToken(token);
    const res = await api.getBilling();
    if (!res.success || !res.data) {
      setBillingError(res.error ?? "Could not load billing");
      return;
    }
    setBillingError(null);
    setBillingUsage(res.data.usage);
    const sub = res.data.subscription;
    if (sub) {
      const end = new Date(sub.currentPeriodEnd).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      setSubscriptionSummary(
        `${sub.plan.name} · ${formatMoney(sub.plan.priceMonthly)} / mo · renews ${end} · ${sub.status}`
      );
    } else {
      setSubscriptionSummary(null);
    }
  }, [getAccessToken]);

  useEffect(() => {
    void (async () => {
      setLoadingPlans(true);
      const res = await api.getBillingPlans();
      if (res.success && res.data?.plans) {
        setPlans(res.data.plans);
        const firstReady = res.data.plans.find((p) => p.stripeReady);
        if (firstReady) setSelectedPlanId(firstReady.id);
      }
      setLoadingPlans(false);
    })();
  }, []);

  useEffect(() => {
    if (!ready || !authenticated) return;
    void refreshBilling();
  }, [ready, authenticated, refreshBilling]);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      api.setToken(token);
      const res = await api.billingPortal(
        typeof window !== "undefined" ? `${window.location.origin}/billing` : undefined
      );
      if (res.success && res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setBillingError(res.error ?? "Could not open billing portal");
      }
    } finally {
      setPortalLoading(false);
    }
  };

  const cancelAtPeriodEnd = async () => {
    setCancelLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      api.setToken(token);
      const res = await api.cancelBilling();
      if (!res.success) {
        setBillingError(res.error ?? "Could not cancel");
        return;
      }
      await refreshBilling();
    } finally {
      setCancelLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Bot className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle>Sign in for billing</CardTitle>
            <CardDescription>Manage your subscription and payment method</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" size="lg" onClick={login}>
              Sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const canSubscribe =
    Boolean(stripePromise) &&
    Boolean(selectedPlan?.stripeReady) &&
    Boolean(selectedPlanId);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <div className="flex items-center gap-2 ml-auto">
            <Bot className="h-6 w-6 text-primary" />
            <span className="font-bold">Billing</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {billingError ? (
          <p className="text-sm text-amber-600 dark:text-amber-400">{billingError}</p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Current subscription</CardTitle>
            <CardDescription>
              {subscriptionSummary ?? "No active subscription yet"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={portalLoading}
              onClick={() => void openPortal()}
            >
              {portalLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Customer portal
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={cancelLoading || !subscriptionSummary}
              onClick={() => void cancelAtPeriodEnd()}
            >
              {cancelLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Cancel at period end"
              )}
            </Button>
          </CardContent>
        </Card>

        {billingUsage ? (
          <Card>
            <CardHeader>
              <CardTitle>Usage this period</CardTitle>
              <CardDescription>
                {new Date(billingUsage.periodStart).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                –{" "}
                {new Date(billingUsage.periodEnd).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!billingUsage.withinPlanLimit ? (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Message usage is above your plan limit for this period. Upgrade or wait for renewal.
                </p>
              ) : null}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Messages (plan meter)</span>
                  <span className="tabular-nums">
                    {billingUsage.messagesUsed.toLocaleString()}
                    {billingUsage.maxMessages != null
                      ? ` / ${billingUsage.maxMessages.toLocaleString()}`
                      : ""}
                    {billingUsage.maxMessages == null ? " · no subscription cap" : null}
                  </span>
                </div>
                {billingUsage.maxMessages != null ? (
                  <Progress
                    value={Math.min(
                      100,
                      (billingUsage.messagesUsed / billingUsage.maxMessages) * 100
                    )}
                    className="h-2"
                  />
                ) : null}
                <p className="text-xs text-muted-foreground mt-2">
                  Lifetime across instances:{" "}
                  {billingUsage.messagesFromInstances.toLocaleString()} messages logged
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">By instance (this period)</h4>
                <ul className="text-sm space-y-2">
                  {billingUsage.byInstance.length === 0 ? (
                    <li className="text-muted-foreground">No instances yet</li>
                  ) : (
                    billingUsage.byInstance.map((row) => (
                      <li
                        key={row.id}
                        className="flex justify-between gap-4 border-b border-border/60 pb-2 last:border-0"
                      >
                        <span className="truncate">{row.name}</span>
                        <span className="tabular-nums text-muted-foreground shrink-0">
                          {row.messagesInPeriod.toLocaleString()} msgs
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {billingUsage.recentDaily.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium mb-2">Last 14 days (all instances)</h4>
                  <div className="flex flex-wrap gap-2">
                    {billingUsage.recentDaily.slice(-14).map((d) => (
                      <div
                        key={d.date}
                        className="text-xs rounded-md bg-muted px-2 py-1 tabular-nums"
                        title={`${d.tokensUsed.toLocaleString()} tokens`}
                      >
                        {d.date.slice(5)}: {d.messageCount}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Subscribe with card</CardTitle>
            <CardDescription>
              Choose a plan and enter your card. Requires Stripe Price ids in the database (run{" "}
              <code className="text-xs bg-muted px-1 rounded">pnpm db:seed</code> with{" "}
              <code className="text-xs bg-muted px-1 rounded">STRIPE_PRICE_*</code> set).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loadingPlans ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : plans.length === 0 ? (
              <p className="text-sm text-muted-foreground">No plans configured.</p>
            ) : (
              <>
                <RadioGroup
                  value={selectedPlanId}
                  onValueChange={setSelectedPlanId}
                  className="space-y-3"
                >
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className="flex items-start space-x-3 rounded-lg border border-border p-4"
                    >
                      <RadioGroupItem
                        value={plan.id}
                        id={plan.id}
                        disabled={!plan.stripeReady}
                      />
                      <Label htmlFor={plan.id} className="flex-1 cursor-pointer space-y-1">
                        <div className="flex justify-between gap-2">
                          <span className="font-medium capitalize">{plan.name}</span>
                          <span>{formatMoney(plan.priceMonthly)} / mo</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {plan.maxInstances} instance(s) · {plan.maxMessages.toLocaleString()}{" "}
                          messages / mo
                          {!plan.stripeReady ? " · missing Stripe price id" : null}
                        </p>
                        <ul className="text-xs text-muted-foreground list-disc list-inside">
                          {plan.features.map((f) => (
                            <li key={f}>{f}</li>
                          ))}
                        </ul>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                {!publishableKey ? (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to enable card entry.
                  </p>
                ) : stripePromise && canSubscribe ? (
                  <Elements stripe={stripePromise}>
                    <SubscribeForm
                      planId={selectedPlanId}
                      email={email}
                      onSubscribed={() => void refreshBilling()}
                    />
                  </Elements>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a plan with a configured Stripe price to continue.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
