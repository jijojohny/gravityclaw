"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { 
  Zap, 
  Clock, 
  Shield, 
  Bot, 
  Rocket, 
  Check,
  ArrowRight,
  Terminal,
  Cloud,
  Lock
} from "lucide-react";

const traditionalSteps = [
  { task: "Purchasing local virtual machine", time: "15 min" },
  { task: "Creating SSH keys and storing securely", time: "10 min" },
  { task: "Connecting to the server via SSH", time: "5 min" },
  { task: "Installing Node.js and NPM", time: "5 min" },
  { task: "Installing OpenClaw", time: "7 min" },
  { task: "Setting up OpenClaw", time: "10 min" },
  { task: "Connecting to AI provider", time: "4 min" },
  { task: "Pairing with Telegram", time: "4 min" },
];

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Deploy in under 60 seconds. Pick a model, connect Telegram, and you're live.",
  },
  {
    icon: Shield,
    title: "Decentralized & Secure",
    description: "Powered by Zero Gravity Chain. Your data is encrypted and distributed.",
  },
  {
    icon: Cloud,
    title: "Always Online",
    description: "24/7 uptime on decentralized infrastructure. No single point of failure.",
  },
  {
    icon: Lock,
    title: "You Own Your Bot",
    description: "Full control over your AI agent. Your keys, your bot, your data.",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "$5",
    period: "/month",
    features: ["1 AI Bot", "10,000 messages/month", "Basic AI models", "Telegram integration"],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    features: ["3 AI Bots", "50,000 messages/month", "All AI models", "Custom personality", "Priority support"],
    cta: "Go Pro",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "/month",
    features: ["Unlimited Bots", "Unlimited messages", "All AI models", "Custom integrations", "Dedicated support", "SLA guarantee"],
    cta: "Contact Us",
    popular: false,
  },
];

export default function HomePage() {
  const router = useRouter();
  const { login, authenticated, ready } = usePrivy();

  useEffect(() => {
    if (ready && authenticated) {
      router.push("/deploy");
    }
  }, [ready, authenticated, router]);

  const handleLogin = () => {
    login();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/40 backdrop-blur-sm fixed top-0 w-full z-50 bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Bot className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold gradient-text">GravityClaw</span>
            </div>
            <div className="flex items-center gap-4">
              {authenticated ? (
                <Link href="/dashboard">
                  <Button>Dashboard</Button>
                </Link>
              ) : (
                <>
                  <Button variant="ghost" onClick={handleLogin}>
                    Sign In
                  </Button>
                  <Button onClick={handleLogin}>
                    Deploy Now
                    <Rocket className="ml-2 h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary">Powered by Zero Gravity Chain</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Deploy OpenClaw in{" "}
            <span className="gradient-text">Under 1 Minute</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Skip the servers, SSH, and technical complexity. One-click deploy your own 24/7 
            active AI assistant on decentralized infrastructure.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button size="lg" className="text-lg px-8 py-6 glow" onClick={handleLogin}>
              Deploy Your Bot Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6">
              Watch Demo
            </Button>
          </div>

          {/* Comparison Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Traditional Way */}
            <div className="bg-card border border-border rounded-2xl p-6 text-left">
              <div className="flex items-center gap-2 mb-4">
                <Terminal className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-muted-foreground">Traditional Way</h3>
              </div>
              <div className="space-y-2">
                {traditionalSteps.map((step, i) => (
                  <div key={i} className="flex justify-between text-sm py-2 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground">{step.task}</span>
                    <span className="text-destructive font-mono">{step.time}</span>
                  </div>
                ))}
                <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
                  <span>Total Time</span>
                  <span className="text-destructive">60+ minutes</span>
                </div>
              </div>
            </div>

            {/* GravityClaw Way */}
            <div className="bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary rounded-2xl p-6 text-left relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                  RECOMMENDED
                </span>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <Rocket className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">GravityClaw</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 py-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Pick your AI model</span>
                </div>
                <div className="flex items-center gap-3 py-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Connect Telegram</span>
                </div>
                <div className="flex items-center gap-3 py-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Click Deploy</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-4 border-t border-primary/30">
                  <span>Total Time</span>
                  <span className="text-green-500 text-2xl">&lt; 1 minute</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Why Choose GravityClaw?
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Built on Zero Gravity Chain for maximum performance, security, and decentralization.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors">
                <feature.icon className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Start free, upgrade when you need more. No hidden fees.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <div 
                key={i} 
                className={`bg-card border rounded-2xl p-6 relative ${
                  plan.popular 
                    ? "border-primary shadow-lg shadow-primary/20 scale-105" 
                    : "border-border"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 bg-primary text-primary-foreground text-sm font-bold rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}
                <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full" 
                  variant={plan.popular ? "default" : "outline"}
                  onClick={handleLogin}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="gradient-bg rounded-3xl p-12 glow">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Deploy Your AI Assistant?
            </h2>
            <p className="text-white/80 mb-8 max-w-xl mx-auto">
              Join thousands of users running their own AI agents on Zero Gravity Chain.
              Start in under 1 minute.
            </p>
            <Button 
              size="lg" 
              variant="secondary" 
              className="text-lg px-8 py-6"
              onClick={handleLogin}
            >
              Deploy Now - It&apos;s Free to Start
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Bot className="h-6 w-6 text-primary" />
              <span className="font-bold">GravityClaw</span>
            </div>
            <p className="text-muted-foreground text-sm">
              &copy; {new Date().getFullYear()} GravityClaw. Powered by Zero Gravity Chain.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Docs</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
