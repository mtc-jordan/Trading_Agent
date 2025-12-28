import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { 
  ArrowRight, 
  Bot, 
  Brain, 
  ChartLine, 
  CheckCircle2, 
  LineChart, 
  Shield, 
  Sparkles, 
  TrendingUp, 
  Users,
  Zap
} from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user, isAuthenticated } = useAuth();

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
          
          <div className="hidden md:flex items-center gap-8">
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#agents" className="text-muted-foreground hover:text-foreground transition-colors">
              AI Agents
            </a>
          </div>

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
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 gradient-dark" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        
        <div className="container relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary">AI-Powered Trading Platform</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
              Trade Smarter with
              <span className="block text-primary">7-Agent AI Consensus</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              TradoVerse combines 7 specialized AI agents that analyze markets from every angle, 
              debate strategies, and reach consensus—just like a professional hedge fund team.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href={isAuthenticated ? "/dashboard" : getLoginUrl()}>
                <Button size="lg" className="gradient-primary text-primary-foreground px-8 glow-primary">
                  Start Trading Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </a>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="border-border text-foreground px-8">
                  View Pricing
                </Button>
              </Link>
            </div>

            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: "Active Traders", value: "10K+" },
                { label: "Trades Executed", value: "1M+" },
                { label: "AI Accuracy", value: "87%" },
                { label: "Avg. Return", value: "+24%" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-card/50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Everything You Need to Trade Like a Pro
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From AI-powered analysis to automated trading bots, TradoVerse provides 
              institutional-grade tools for retail traders.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: "7-Agent AI System",
                description: "Technical, Fundamental, Sentiment, Risk, Microstructure, Macro, and Quant agents work together."
              },
              {
                icon: Bot,
                title: "Automated Trading Bots",
                description: "Create and deploy trading bots that execute strategies 24/7 without emotions."
              },
              {
                icon: LineChart,
                title: "Advanced Backtesting",
                description: "Test strategies against historical data from 2010 with comprehensive metrics."
              },
              {
                icon: ChartLine,
                title: "Portfolio Analytics",
                description: "Track Sharpe ratio, drawdown, win rate, and profit factor in real-time."
              },
              {
                icon: Users,
                title: "Bot Marketplace",
                description: "Share your strategies or copy successful traders from the leaderboard."
              },
              {
                icon: Shield,
                title: "Risk Management",
                description: "Built-in risk controls with stop-loss, take-profit, and position sizing."
              },
            ].map((feature) => (
              <Card key={feature.title} className="bg-card border-border hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-foreground">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* AI Agents Section */}
      <section id="agents" className="py-20">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Meet Your AI Trading Team
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Seven specialized AI agents analyze every trade opportunity from different perspectives, 
              then vote to reach consensus—just like a professional hedge fund.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: "Technical", color: "bg-blue-500/20 text-blue-400", desc: "Chart patterns & indicators" },
              { name: "Fundamental", color: "bg-green-500/20 text-green-400", desc: "Financial metrics & valuation" },
              { name: "Sentiment", color: "bg-purple-500/20 text-purple-400", desc: "News & social analysis" },
              { name: "Risk", color: "bg-red-500/20 text-red-400", desc: "Volatility & exposure" },
              { name: "Microstructure", color: "bg-yellow-500/20 text-yellow-400", desc: "Order flow & liquidity" },
              { name: "Macro", color: "bg-cyan-500/20 text-cyan-400", desc: "Economic conditions" },
              { name: "Quant", color: "bg-pink-500/20 text-pink-400", desc: "Statistical models" },
            ].map((agent) => (
              <div key={agent.name} className="p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors">
                <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${agent.color} mb-2`}>
                  {agent.name}
                </div>
                <p className="text-sm text-muted-foreground">{agent.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 p-8 rounded-2xl bg-card border border-border">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  How Consensus Works
                </h3>
                <ul className="space-y-3">
                  {[
                    "Each agent analyzes the market independently",
                    "Agents provide scores from -1 (bearish) to +1 (bullish)",
                    "Confidence-weighted voting determines final signal",
                    "Risk agent has veto power for dangerous trades",
                    "Full transparency—see every agent's reasoning"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 flex justify-center">
                <div className="relative w-64 h-64">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center animate-pulse-glow">
                      <Zap className="w-12 h-12 text-primary-foreground" />
                    </div>
                  </div>
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="absolute w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center"
                      style={{
                        top: `${50 + 40 * Math.sin((i * 2 * Math.PI) / 7)}%`,
                        left: `${50 + 40 * Math.cos((i * 2 * Math.PI) / 7)}%`,
                        transform: "translate(-50%, -50%)"
                      }}
                    >
                      <Brain className="w-5 h-5 text-primary" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-card/50">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Ready to Trade Smarter?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join thousands of traders using AI-powered analysis to make better decisions. 
              Start with paper trading—no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href={isAuthenticated ? "/dashboard" : getLoginUrl()}>
                <Button size="lg" className="gradient-primary text-primary-foreground px-8 glow-primary">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </a>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="border-border text-foreground px-8">
                  Compare Plans
                </Button>
              </Link>
            </div>
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
