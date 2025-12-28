import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { 
  ArrowDown, 
  ArrowUp, 
  Bot, 
  Brain, 
  ChartLine, 
  DollarSign, 
  LineChart, 
  Plus, 
  TrendingUp,
  Activity,
  Wallet
} from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: accounts, isLoading: accountsLoading } = trpc.account.list.useQuery();
  const { data: bots, isLoading: botsLoading } = trpc.bot.list.useQuery();
  const { data: tierLimits } = trpc.user.getTierLimits.useQuery();

  // Calculate total balance across all accounts
  const totalBalance = accounts?.reduce((sum, acc) => sum + parseFloat(acc.balance?.toString() || "0"), 0) || 0;
  const initialBalance = accounts?.reduce((sum, acc) => sum + parseFloat(acc.initialBalance?.toString() || "0"), 0) || 0;
  const totalPnl = totalBalance - initialBalance;
  const pnlPercent = initialBalance > 0 ? (totalPnl / initialBalance) * 100 : 0;

  const activeBots = bots?.filter(b => b.status === "active").length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.name || "Trader"}! Here's your trading overview.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/analysis">
              <Button variant="outline" className="border-border">
                <Brain className="w-4 h-4 mr-2" />
                AI Analysis
              </Button>
            </Link>
            <Link href="/bots">
              <Button className="gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                New Bot
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle>
              <Wallet className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`flex items-center text-sm ${totalPnl >= 0 ? "text-profit" : "text-loss"}`}>
                {totalPnl >= 0 ? <ArrowUp className="w-4 h-4 mr-1" /> : <ArrowDown className="w-4 h-4 mr-1" />}
                {pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}% all time
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total P&L</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalPnl >= 0 ? "text-profit" : "text-loss"}`}>
                {totalPnl >= 0 ? "+" : ""}${totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-sm text-muted-foreground">
                Across {accounts?.length || 0} accounts
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Bots</CardTitle>
              <Bot className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{activeBots}</div>
              <p className="text-sm text-muted-foreground">
                of {bots?.length || 0} total bots
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Subscription</CardTitle>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground capitalize">
                {user?.subscriptionTier || "Free"}
              </div>
              <p className="text-sm text-muted-foreground">
                {tierLimits?.aiAgents || 2} AI agents available
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Trading Accounts */}
          <Card className="lg:col-span-2 bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-foreground">Trading Accounts</CardTitle>
                <CardDescription>Your paper and live trading accounts</CardDescription>
              </div>
              <Link href="/portfolio">
                <Button variant="outline" size="sm" className="border-border">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {accountsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : accounts && accounts.length > 0 ? (
                <div className="space-y-3">
                  {accounts.slice(0, 3).map((account) => {
                    const balance = parseFloat(account.balance?.toString() || "0");
                    const initial = parseFloat(account.initialBalance?.toString() || "0");
                    const pnl = balance - initial;
                    const pnlPct = initial > 0 ? (pnl / initial) * 100 : 0;
                    
                    return (
                      <div key={account.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            account.type === "paper" ? "bg-blue-500/20" : "bg-green-500/20"
                          }`}>
                            {account.type === "paper" ? (
                              <LineChart className="w-5 h-5 text-blue-400" />
                            ) : (
                              <TrendingUp className="w-5 h-5 text-green-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{account.name}</p>
                            <p className="text-sm text-muted-foreground capitalize">{account.type} Trading</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-foreground">
                            ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                          <p className={`text-sm ${pnl >= 0 ? "text-profit" : "text-loss"}`}>
                            {pnl >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No trading accounts yet</p>
                  <Link href="/portfolio">
                    <Button className="gradient-primary text-primary-foreground">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Account
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/analysis" className="block">
                <Button variant="outline" className="w-full justify-start border-border hover:bg-primary/10 hover:border-primary/50">
                  <Brain className="w-4 h-4 mr-3 text-primary" />
                  Run AI Analysis
                </Button>
              </Link>
              <Link href="/bots" className="block">
                <Button variant="outline" className="w-full justify-start border-border hover:bg-primary/10 hover:border-primary/50">
                  <Bot className="w-4 h-4 mr-3 text-primary" />
                  Create Trading Bot
                </Button>
              </Link>
              <Link href="/backtest" className="block">
                <Button variant="outline" className="w-full justify-start border-border hover:bg-primary/10 hover:border-primary/50">
                  <ChartLine className="w-4 h-4 mr-3 text-primary" />
                  Run Backtest
                </Button>
              </Link>
              <Link href="/marketplace" className="block">
                <Button variant="outline" className="w-full justify-start border-border hover:bg-primary/10 hover:border-primary/50">
                  <TrendingUp className="w-4 h-4 mr-3 text-primary" />
                  Browse Marketplace
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Trading Bots */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Your Trading Bots</CardTitle>
              <CardDescription>Automated trading strategies</CardDescription>
            </div>
            <Link href="/bots">
              <Button variant="outline" size="sm" className="border-border">
                Manage Bots
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {botsLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : bots && bots.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bots.slice(0, 6).map((bot) => (
                  <div key={bot.id} className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Bot className="w-5 h-5 text-primary" />
                        <span className="font-medium text-foreground">{bot.name}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        bot.status === "active" 
                          ? "bg-green-500/20 text-green-400" 
                          : bot.status === "paused"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-red-500/20 text-red-400"
                      }`}>
                        {bot.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {bot.description || "No description"}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{(bot.symbols as string[])?.length || 0} symbols</span>
                      <span>•</span>
                      <span>{bot.totalTrades || 0} trades</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No trading bots yet</p>
                <Link href="/bots">
                  <Button className="gradient-primary text-primary-foreground">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Bot
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
