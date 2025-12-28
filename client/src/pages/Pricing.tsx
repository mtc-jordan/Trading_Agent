import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { 
  Check, 
  X, 
  TrendingUp, 
  ArrowRight,
  Sparkles,
  Zap
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

const plans = [
  {
    name: "Free",
    price: 0,
    description: "Perfect for learning and paper trading",
    features: [
      { name: "Paper trading only", included: true },
      { name: "2 AI agents", included: true },
      { name: "1 trading bot", included: true },
      { name: "1 trading account", included: true },
      { name: "3-month backtest history", included: true },
      { name: "Live trading", included: false },
      { name: "API access", included: false },
      { name: "Priority support", included: false },
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Starter",
    price: 29,
    description: "For serious traders getting started",
    features: [
      { name: "Paper & live trading", included: true },
      { name: "4 AI agents", included: true },
      { name: "3 trading bots", included: true },
      { name: "2 trading accounts", included: true },
      { name: "1-year backtest history", included: true },
      { name: "Live trading", included: true },
      { name: "API access", included: false },
      { name: "Priority support", included: false },
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Pro",
    price: 79,
    description: "Full power for active traders",
    features: [
      { name: "Paper & live trading", included: true },
      { name: "All 7 AI agents", included: true },
      { name: "10 trading bots", included: true },
      { name: "5 trading accounts", included: true },
      { name: "5-year backtest history", included: true },
      { name: "Live trading", included: true },
      { name: "API access", included: true },
      { name: "Priority support", included: false },
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Elite",
    price: 199,
    description: "Maximum power for professionals",
    features: [
      { name: "Paper & live trading", included: true },
      { name: "All 7 AI agents", included: true },
      { name: "Unlimited trading bots", included: true },
      { name: "Unlimited accounts", included: true },
      { name: "Full backtest history (2010+)", included: true },
      { name: "Live trading", included: true },
      { name: "API access", included: true },
      { name: "Priority support", included: true },
    ],
    cta: "Start Free Trial",
    popular: false,
  },
];

export default function Pricing() {
  const { user, isAuthenticated } = useAuth();

  const handleSubscribe = (planName: string) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    toast.info(`Stripe integration coming soon! Selected: ${planName} plan`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">TradoVerse</span>
          </Link>
          
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button className="gradient-primary text-primary-foreground">
                  Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            ) : (
              <>
                <a href={getLoginUrl()}>
                  <Button variant="ghost" className="text-foreground">
                    Sign In
                  </Button>
                </a>
                <a href={getLoginUrl()}>
                  <Button className="gradient-primary text-primary-foreground">
                    Get Started
                  </Button>
                </a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary">Simple, transparent pricing</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Choose Your Trading Power
            </h1>
            <p className="text-lg text-muted-foreground">
              Start free with paper trading, upgrade when you're ready for live markets. 
              All plans include our AI-powered analysis.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <Card 
                key={plan.name} 
                className={`bg-card border-border relative ${
                  plan.popular ? "border-primary ring-2 ring-primary/20" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full text-xs font-medium gradient-primary text-primary-foreground">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl text-foreground">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <span className="text-4xl font-bold text-foreground">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                        {feature.included ? (
                          <Check className="w-5 h-5 text-primary flex-shrink-0" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className={feature.included ? "text-foreground" : "text-muted-foreground"}>
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    onClick={() => handleSubscribe(plan.name)}
                    className={`w-full ${
                      plan.popular 
                        ? "gradient-primary text-primary-foreground" 
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {plan.cta}
                    {plan.price > 0 && <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-card/50">
        <div className="container">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="max-w-3xl mx-auto space-y-6">
            {[
              {
                q: "Can I switch plans anytime?",
                a: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate your billing."
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards through Stripe, including Visa, Mastercard, and American Express."
              },
              {
                q: "Is there a free trial?",
                a: "Yes! All paid plans come with a 14-day free trial. No credit card required to start."
              },
              {
                q: "What's the difference between paper and live trading?",
                a: "Paper trading uses virtual money to simulate trades—perfect for testing strategies. Live trading connects to real brokers for actual market execution."
              },
              {
                q: "How do AI agents work?",
                a: "Our AI agents analyze markets from different perspectives (technical, fundamental, sentiment, etc.) and vote on trade decisions. More agents = more comprehensive analysis."
              },
            ].map((faq, i) => (
              <div key={i} className="p-6 rounded-lg bg-card border border-border">
                <h3 className="font-medium text-foreground mb-2">{faq.q}</h3>
                <p className="text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-6">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Ready to Trade Smarter?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join thousands of traders using AI-powered analysis. Start free today.
            </p>
            <a href={isAuthenticated ? "/dashboard" : getLoginUrl()}>
              <Button size="lg" className="gradient-primary text-primary-foreground px-8 glow-primary">
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">TradoVerse</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 TradoVerse. AI-Powered Trading Platform.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
