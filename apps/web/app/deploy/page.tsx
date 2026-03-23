"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Bot, 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Loader2,
  Sparkles,
  MessageSquare,
  Zap,
  ExternalLink
} from "lucide-react";

const AI_MODELS = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "OpenAI's most capable model. Great for complex tasks.",
    price: "$0.01/1K tokens",
    recommended: true,
  },
  {
    id: "claude-3-sonnet",
    name: "Claude 3.5 Sonnet",
    description: "Anthropic's balanced model. Fast and intelligent.",
    price: "$0.003/1K tokens",
    recommended: false,
  },
  {
    id: "claude-3-opus",
    name: "Claude 3 Opus",
    description: "Anthropic's most powerful model for complex reasoning.",
    price: "$0.015/1K tokens",
    recommended: false,
  },
  {
    id: "0g-compute",
    name: "0G Compute",
    description: "Decentralized AI inference. Most cost-effective.",
    price: "$0.003/1K tokens",
    recommended: false,
  },
];

const PERSONALITIES = [
  {
    id: "professional",
    name: "Professional Assistant",
    description: "Formal, efficient, and business-focused.",
    emoji: "💼",
  },
  {
    id: "friendly",
    name: "Friendly Helper",
    description: "Warm, casual, and approachable.",
    emoji: "😊",
  },
  {
    id: "technical",
    name: "Technical Expert",
    description: "Detailed, precise, and code-savvy.",
    emoji: "🔧",
  },
  {
    id: "custom",
    name: "Custom",
    description: "Define your own personality later.",
    emoji: "✨",
  },
];

type Step = 1 | 2 | 3 | 4;

interface DeploymentConfig {
  model: string;
  telegramToken: string;
  personality: string;
}

export default function DeployPage() {
  const router = useRouter();
  const { authenticated, login, user } = usePrivy();
  const [step, setStep] = useState<Step>(1);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployProgress, setDeployProgress] = useState(0);
  const [deployStatus, setDeployStatus] = useState("");
  const [config, setConfig] = useState<DeploymentConfig>({
    model: "gpt-4o",
    telegramToken: "",
    personality: "professional",
  });

  const handleDeploy = async () => {
    setStep(4);
    setIsDeploying(true);
    
    const steps = [
      { progress: 20, status: "Validating configuration..." },
      { progress: 40, status: "Storing config on 0G Storage..." },
      { progress: 60, status: "Provisioning on 0G Compute..." },
      { progress: 80, status: "Configuring Telegram webhook..." },
      { progress: 100, status: "Your bot is live!" },
    ];

    for (const s of steps) {
      await new Promise((r) => setTimeout(r, 1500));
      setDeployProgress(s.progress);
      setDeployStatus(s.status);
    }

    setIsDeploying(false);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Bot className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle>Sign in to Deploy</CardTitle>
            <CardDescription>
              Create an account to deploy your AI assistant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" size="lg" onClick={login}>
              Sign In to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <span className="font-bold">GravityClaw</span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      {/* Progress Steps */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center gap-4 mb-12">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s ? <Check className="h-5 w-5" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-20 h-1 mx-2 transition-colors ${
                    step > s ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Choose Model */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-2">Choose Your AI Model</h1>
              <p className="text-muted-foreground">
                Select the AI that will power your assistant
              </p>
            </div>

            <RadioGroup
              value={config.model}
              onValueChange={(value) => setConfig({ ...config, model: value })}
              className="space-y-4"
            >
              {AI_MODELS.map((model) => (
                <label
                  key={model.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                    config.model === model.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value={model.id} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{model.name}</span>
                      {model.recommended && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {model.description}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {model.price}
                  </div>
                </label>
              ))}
            </RadioGroup>

            <div className="flex justify-end mt-8">
              <Button size="lg" onClick={() => setStep(2)}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Connect Telegram */}
        {step === 2 && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <MessageSquare className="h-12 w-12 text-primary mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-2">Connect Telegram</h1>
              <p className="text-muted-foreground">
                Create a Telegram bot and paste the token here
              </p>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">How to get a bot token</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  <p>
                    Open Telegram and search for{" "}
                    <a
                      href="https://t.me/BotFather"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      @BotFather
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  <p>Send <code className="bg-muted px-1 rounded">/newbot</code> and follow the instructions</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  <p>Copy the bot token and paste it below</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div>
                <Label htmlFor="telegram-token">Bot Token</Label>
                <Input
                  id="telegram-token"
                  type="password"
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  value={config.telegramToken}
                  onChange={(e) =>
                    setConfig({ ...config, telegramToken: e.target.value })
                  }
                  className="mt-2"
                />
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <Button variant="outline" size="lg" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                size="lg"
                onClick={() => setStep(3)}
                disabled={!config.telegramToken}
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Choose Personality */}
        {step === 3 && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <Bot className="h-12 w-12 text-primary mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-2">Choose Personality</h1>
              <p className="text-muted-foreground">
                How should your AI assistant behave?
              </p>
            </div>

            <RadioGroup
              value={config.personality}
              onValueChange={(value) =>
                setConfig({ ...config, personality: value })
              }
              className="grid grid-cols-2 gap-4"
            >
              {PERSONALITIES.map((p) => (
                <label
                  key={p.id}
                  className={`flex flex-col items-center gap-2 p-6 rounded-xl border cursor-pointer transition-all text-center ${
                    config.personality === p.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value={p.id} className="sr-only" />
                  <span className="text-3xl">{p.emoji}</span>
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {p.description}
                  </span>
                  {config.personality === p.id && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </label>
              ))}
            </RadioGroup>

            <div className="flex justify-between mt-8">
              <Button variant="outline" size="lg" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button size="lg" onClick={handleDeploy}>
                <Zap className="mr-2 h-4 w-4" />
                Deploy Now
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Deploying */}
        {step === 4 && (
          <div className="max-w-2xl mx-auto text-center">
            {isDeploying ? (
              <>
                <Loader2 className="h-16 w-16 text-primary mx-auto mb-6 animate-spin" />
                <h1 className="text-3xl font-bold mb-4">Deploying Your Bot</h1>
                <p className="text-muted-foreground mb-8">{deployStatus}</p>
                <Progress value={deployProgress} className="h-2 mb-4" />
                <p className="text-sm text-muted-foreground">
                  {deployProgress}% complete
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                  <Check className="h-10 w-10 text-green-500" />
                </div>
                <h1 className="text-3xl font-bold mb-4">Your Bot is Live!</h1>
                <p className="text-muted-foreground mb-8">
                  Your AI assistant is now running 24/7 on Zero Gravity Chain
                </p>

                <Card className="mb-8">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-center gap-4">
                      <Bot className="h-8 w-8 text-primary" />
                      <div className="text-left">
                        <p className="font-semibold">@YourBot</p>
                        <p className="text-sm text-muted-foreground">
                          {AI_MODELS.find((m) => m.id === config.model)?.name} •{" "}
                          {PERSONALITIES.find((p) => p.id === config.personality)?.name}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" asChild>
                    <a
                      href="https://t.me/YourBot"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Open in Telegram
                    </a>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => router.push("/dashboard")}
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
