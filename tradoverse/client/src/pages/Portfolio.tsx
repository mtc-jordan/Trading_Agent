import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { 
  Wallet, 
  Plus, 
  TrendingUp, 
  TrendingDown,
  LineChart,
  DollarSign,
  ArrowUp,
  ArrowDown,
  PieChart
} from "lucide-react";
import { toast } from "sonner";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useBroker } from '@/contexts/BrokerContext';
import { BrokerBadge } from '@/components/BrokerBadge';
import { UnifiedPositionsView } from '@/components/UnifiedPositionsView';
import { AggregatedPortfolioView } from '@/components/AggregatedPortfolio';
import { PortfolioComparison } from '@/components/PortfolioComparison';
import { Building2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444", "#06b6d4"];

export default function Portfolio() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  // Broker context
  const { activeBroker, hasConnectedBroker, isPaperMode, getBrokerName } = useBroker();
  const [newAccount, setNewAccount] = useState({
    name: "",
    type: "paper" as "paper" | "live",
    initialBalance: "100000",
  });

  const { data: accounts, isLoading, refetch } = trpc.account.list.useQuery();
  
  const createAccountMutation = trpc.account.create.useMutation({
    onSuccess: () => {
      toast.success("Account created successfully");
      setIsCreateOpen(false);
      refetch();
      setNewAccount({ name: "", type: "paper", initialBalance: "100000" });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create account");
    },
  });

  const handleCreateAccount = () => {
    if (!newAccount.name) {
      toast.error("Please enter an account name");
      return;
    }

    createAccountMutation.mutate({
      name: newAccount.name,
      type: newAccount.type,
      initialBalance: parseFloat(newAccount.initialBalance),
    });
  };

  // Calculate totals
  const totalBalance = accounts?.reduce((sum, acc) => sum + parseFloat(acc.balance?.toString() || "0"), 0) || 0;
  const totalInitial = accounts?.reduce((sum, acc) => sum + parseFloat(acc.initialBalance?.toString() || "0"), 0) || 0;
  const totalPnl = totalBalance - totalInitial;
  const totalPnlPercent = totalInitial > 0 ? (totalPnl / totalInitial) * 100 : 0;

  // Prepare pie chart data
  const pieData = accounts?.map((acc, i) => ({
    name: acc.name,
    value: parseFloat(acc.balance?.toString() || "0"),
    color: COLORS[i % COLORS.length],
  })) || [];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Portfolio</h1>
            <p className="text-muted-foreground">
              Manage your trading accounts and track performance
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Broker indicator */}
            {hasConnectedBroker && activeBroker && (
              <div className="flex items-center gap-2 px-3 py-2 bg-card border rounded-lg">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Active:</span>
                <BrokerBadge size="sm" showStatus={true} showMode={true} />
              </div>
            )}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                New Account
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Create Trading Account</DialogTitle>
                <DialogDescription>
                  Set up a new paper or live trading account
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Account Name</Label>
                  <Input
                    placeholder="My Trading Account"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                    className="bg-input border-border text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Account Type</Label>
                  <Select value={newAccount.type} onValueChange={(v: "paper" | "live") => setNewAccount({ ...newAccount, type: v })}>
                    <SelectTrigger className="bg-input border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="paper">Paper Trading</SelectItem>
                      <SelectItem value="live">Live Trading</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Initial Balance ($)</Label>
                  <Input
                    type="number"
                    value={newAccount.initialBalance}
                    onChange={(e) => setNewAccount({ ...newAccount, initialBalance: e.target.value })}
                    className="bg-input border-border text-foreground"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="border-border">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateAccount}
                    disabled={createAccountMutation.isPending}
                    className="gradient-primary text-primary-foreground"
                  >
                    {createAccountMutation.isPending ? "Creating..." : "Create Account"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Tabs for Accounts and Broker Positions */}
        <Tabs defaultValue="accounts" className="space-y-6">
          <TabsList>
            <TabsTrigger value="accounts">Trading Accounts</TabsTrigger>
            <TabsTrigger value="positions">Broker Positions</TabsTrigger>
            <TabsTrigger value="multi-broker">Multi-Broker</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
          </TabsList>
          
          <TabsContent value="accounts">

        {/* Portfolio Summary */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Balance</span>
              </div>
              <p className="text-3xl font-bold text-foreground">
                ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total P&L</span>
              </div>
              <p className={`text-3xl font-bold ${totalPnl >= 0 ? "text-profit" : "text-loss"}`}>
                {totalPnl >= 0 ? "+" : ""}${totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                {totalPnlPercent >= 0 ? (
                  <ArrowUp className="w-4 h-4 text-profit" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-loss" />
                )}
                <span className="text-sm text-muted-foreground">Return</span>
              </div>
              <p className={`text-3xl font-bold ${totalPnlPercent >= 0 ? "text-profit" : "text-loss"}`}>
                {totalPnlPercent >= 0 ? "+" : ""}{totalPnlPercent.toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <PieChart className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Accounts</span>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {accounts?.length || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Accounts List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Trading Accounts</h2>
            
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i} className="bg-card border-border">
                    <CardContent className="p-6">
                      <div className="h-24 bg-muted rounded-lg animate-pulse" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : accounts && accounts.length > 0 ? (
              <div className="space-y-4">
                {accounts.map((account) => {
                  const balance = parseFloat(account.balance?.toString() || "0");
                  const initial = parseFloat(account.initialBalance?.toString() || "0");
                  const pnl = balance - initial;
                  const pnlPercent = initial > 0 ? (pnl / initial) * 100 : 0;

                  return (
                    <Card key={account.id} className="bg-card border-border hover:border-primary/50 transition-colors">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                              account.type === "paper" ? "bg-blue-500/20" : "bg-green-500/20"
                            }`}>
                              {account.type === "paper" ? (
                                <LineChart className="w-6 h-6 text-blue-400" />
                              ) : (
                                <TrendingUp className="w-6 h-6 text-green-400" />
                              )}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-foreground">{account.name}</h3>
                              <p className="text-sm text-muted-foreground capitalize">{account.type} Trading</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-foreground">
                              ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                            <div className={`flex items-center justify-end gap-1 ${pnl >= 0 ? "text-profit" : "text-loss"}`}>
                              {pnl >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                              <span className="font-medium">
                                {pnl >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%
                              </span>
                              <span className="text-sm">
                                (${pnl >= 0 ? "+" : ""}{pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-4">
                          <div className="p-3 rounded-lg bg-secondary/50">
                            <p className="text-xs text-muted-foreground">Initial Balance</p>
                            <p className="font-medium text-foreground">
                              ${initial.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-secondary/50">
                            <p className="text-xs text-muted-foreground">Total Trades</p>
                            <p className="font-medium text-foreground">{(account as any).totalTrades || 0}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-secondary/50">
                            <p className="text-xs text-muted-foreground">Status</p>
                            <p className="font-medium text-foreground capitalize">{account.isActive ? "Active" : "Inactive"}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="py-12">
                  <div className="text-center">
                    <Wallet className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No Trading Accounts</h3>
                    <p className="text-muted-foreground max-w-md mx-auto mb-6">
                      Create your first trading account to start paper trading or live trading
                    </p>
                    <Button 
                      onClick={() => setIsCreateOpen(true)}
                      className="gradient-primary text-primary-foreground"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Allocation Chart */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Portfolio Allocation</CardTitle>
              <CardDescription>Distribution across accounts</CardDescription>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "oklch(0.16 0.01 260)", 
                            border: "1px solid oklch(0.28 0.02 260)",
                            borderRadius: "8px"
                          }}
                          formatter={(value: number) => [`$${value.toLocaleString()}`, "Balance"]}
                        />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-4">
                    {pieData.map((entry, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="text-sm text-muted-foreground">{entry.name}</span>
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {totalBalance > 0 ? ((entry.value / totalBalance) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-muted-foreground">No accounts to display</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
          </TabsContent>
          
          <TabsContent value="positions">
            <UnifiedPositionsView />
          </TabsContent>
          
          <TabsContent value="multi-broker">
            <AggregatedPortfolioView showBrokerBreakdown={true} />
          </TabsContent>

          <TabsContent value="comparison">
            <PortfolioComparison 
              brokerPerformances={[
                // Mock data - in production this would come from a tRPC query
                // that aggregates performance data from all connected brokers
              ]} 
              isLoading={false}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
