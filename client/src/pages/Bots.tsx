import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { 
  Bot, 
  Plus, 
  Play, 
  Pause, 
  Square,
  Settings,
  Trash2,
  TrendingUp,
  Activity
} from "lucide-react";
import { toast } from "sonner";
import { useBroker } from '@/contexts/BrokerContext';
import { BrokerBadge } from '@/components/BrokerBadge';
import { Building2 } from 'lucide-react';

export default function Bots() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  // Broker context
  const { activeBroker, hasConnectedBroker, isPaperMode, getBrokerName } = useBroker();
  
  const [newBot, setNewBot] = useState({
    name: "",
    description: "",
    accountId: "",
    strategyType: "momentum" as const,
    symbols: "",
    maxPositionSize: "10000",
    stopLoss: "5",
    takeProfit: "10",
  });

  const { data: bots, isLoading, refetch } = trpc.bot.list.useQuery();
  const { data: accounts } = trpc.account.list.useQuery();
  
  const createBotMutation = trpc.bot.create.useMutation({
    onSuccess: () => {
      toast.success("Bot created successfully");
      setIsCreateOpen(false);
      refetch();
      setNewBot({
        name: "",
        description: "",
        accountId: "",
        strategyType: "momentum",
        symbols: "",
        maxPositionSize: "10000",
        stopLoss: "5",
        takeProfit: "10",
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create bot");
    },
  });

  const updateBotMutation = trpc.bot.update.useMutation({
    onSuccess: () => {
      toast.success("Bot updated");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update bot");
    },
  });

  const handleCreateBot = () => {
    if (!newBot.name || !newBot.accountId || !newBot.symbols) {
      toast.error("Please fill in all required fields");
      return;
    }

    createBotMutation.mutate({
      accountId: parseInt(newBot.accountId),
      name: newBot.name,
      description: newBot.description,
      strategy: {
        type: newBot.strategyType,
        parameters: {
          shortPeriod: 10,
          longPeriod: 20,
        },
        entryConditions: [],
        exitConditions: [],
        positionSizing: "fixed",
        maxPositionSize: parseFloat(newBot.maxPositionSize),
        stopLoss: parseFloat(newBot.stopLoss) / 100,
        takeProfit: parseFloat(newBot.takeProfit) / 100,
      },
      symbols: newBot.symbols.split(",").map(s => s.trim().toUpperCase()),
      riskSettings: {
        maxDrawdown: 0.2,
        maxPositionSize: parseFloat(newBot.maxPositionSize),
        maxDailyLoss: 0.05,
      },
    });
  };

  const handleStatusChange = (botId: number, status: "active" | "paused" | "stopped") => {
    updateBotMutation.mutate({ id: botId, status });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Trading Bots</h1>
            <p className="text-muted-foreground">
              Create and manage your automated trading strategies
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Broker indicator */}
            {hasConnectedBroker && activeBroker && (
              <div className="flex items-center gap-2 px-3 py-2 bg-card border rounded-lg">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Execute via:</span>
                <BrokerBadge size="sm" showStatus={true} showMode={true} />
              </div>
            )}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Create Bot
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-foreground">Create Trading Bot</DialogTitle>
                <DialogDescription>
                  Set up a new automated trading bot with your preferred strategy
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground">Bot Name</Label>
                  <Input
                    id="name"
                    placeholder="My Trading Bot"
                    value={newBot.name}
                    onChange={(e) => setNewBot({ ...newBot, name: e.target.value })}
                    className="bg-input border-border text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-foreground">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your bot's strategy..."
                    value={newBot.description}
                    onChange={(e) => setNewBot({ ...newBot, description: e.target.value })}
                    className="bg-input border-border text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account" className="text-foreground">Trading Account</Label>
                  <Select value={newBot.accountId} onValueChange={(v) => setNewBot({ ...newBot, accountId: v })}>
                    <SelectTrigger className="bg-input border-border text-foreground">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {accounts?.map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name} ({account.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="strategy" className="text-foreground">Strategy Type</Label>
                  <Select value={newBot.strategyType} onValueChange={(v: any) => setNewBot({ ...newBot, strategyType: v })}>
                    <SelectTrigger className="bg-input border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="momentum">Momentum</SelectItem>
                      <SelectItem value="mean_reversion">Mean Reversion</SelectItem>
                      <SelectItem value="trend_following">Trend Following</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="symbols" className="text-foreground">Symbols (comma-separated)</Label>
                  <Input
                    id="symbols"
                    placeholder="AAPL, MSFT, GOOGL"
                    value={newBot.symbols}
                    onChange={(e) => setNewBot({ ...newBot, symbols: e.target.value })}
                    className="bg-input border-border text-foreground"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="position" className="text-foreground">Max Position ($)</Label>
                    <Input
                      id="position"
                      type="number"
                      value={newBot.maxPositionSize}
                      onChange={(e) => setNewBot({ ...newBot, maxPositionSize: e.target.value })}
                      className="bg-input border-border text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stopLoss" className="text-foreground">Stop Loss (%)</Label>
                    <Input
                      id="stopLoss"
                      type="number"
                      value={newBot.stopLoss}
                      onChange={(e) => setNewBot({ ...newBot, stopLoss: e.target.value })}
                      className="bg-input border-border text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="takeProfit" className="text-foreground">Take Profit (%)</Label>
                    <Input
                      id="takeProfit"
                      type="number"
                      value={newBot.takeProfit}
                      onChange={(e) => setNewBot({ ...newBot, takeProfit: e.target.value })}
                      className="bg-input border-border text-foreground"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="border-border">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateBot}
                    disabled={createBotMutation.isPending}
                    className="gradient-primary text-primary-foreground"
                  >
                    {createBotMutation.isPending ? "Creating..." : "Create Bot"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Bots Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-card border-border">
                <CardContent className="p-6">
                  <div className="h-40 bg-muted rounded-lg animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : bots && bots.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bots.map((bot) => (
              <Card key={bot.id} className="bg-card border-border hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-foreground">{bot.name}</CardTitle>
                        <CardDescription className="capitalize">
                          {(bot.strategy as any)?.type?.replace(/_/g, " ") || "Custom"} Strategy
                        </CardDescription>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      bot.status === "active" 
                        ? "bg-green-500/20 text-green-400" 
                        : bot.status === "paused"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-red-500/20 text-red-400"
                    }`}>
                      {bot.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {bot.description || "No description provided"}
                  </p>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <p className="text-xs text-muted-foreground">Symbols</p>
                      <p className="font-medium text-foreground">
                        {(bot.symbols as string[])?.length || 0}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <p className="text-xs text-muted-foreground">Total Trades</p>
                      <p className="font-medium text-foreground">{bot.totalTrades || 0}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <p className="text-xs text-muted-foreground">Win Rate</p>
                      <p className="font-medium text-foreground">
                        {(bot as any).winRate ? `${(parseFloat((bot as any).winRate.toString()) * 100).toFixed(1)}%` : "N/A"}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <p className="text-xs text-muted-foreground">Total P&L</p>
                      <p className={`font-medium ${parseFloat(bot.totalPnl?.toString() || "0") >= 0 ? "text-profit" : "text-loss"}`}>
                        ${parseFloat(bot.totalPnl?.toString() || "0").toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {bot.status === "active" ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 border-border"
                        onClick={() => handleStatusChange(bot.id, "paused")}
                      >
                        <Pause className="w-4 h-4 mr-2" />
                        Pause
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 border-border"
                        onClick={() => handleStatusChange(bot.id, "active")}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-border"
                      onClick={() => handleStatusChange(bot.id, "stopped")}
                    >
                      <Square className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="border-border">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="py-12">
              <div className="text-center">
                <Bot className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Trading Bots Yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  Create your first trading bot to automate your strategies and trade 24/7
                </p>
                <Button 
                  onClick={() => setIsCreateOpen(true)}
                  className="gradient-primary text-primary-foreground"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Bot
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
