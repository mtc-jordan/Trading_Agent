import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Star, 
  Award, 
  Copy, 
  Settings, 
  Play, 
  Pause, 
  XCircle,
  Search,
  Filter,
  BarChart3,
  Target,
  Shield,
  DollarSign,
  Percent,
  Clock,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

export default function CopyTrading() {
  const [sortBy, setSortBy] = useState<'return' | 'winRate' | 'followers' | 'sharpe'>('return');
  const [selectedTrader, setSelectedTrader] = useState<string | null>(null);
  const [showFollowDialog, setShowFollowDialog] = useState(false);
  const [followSettings, setFollowSettings] = useState({
    allocationMode: 'fixed' as 'fixed' | 'percentage' | 'proportional',
    allocationAmount: 1000,
    maxPositionSize: 10000,
    maxDailyLoss: 500,
    copyStopLoss: true,
    copyTakeProfit: true,
  });

  // Queries
  const { data: topTraders, isLoading: loadingTraders } = trpc.copyTrading.getTopTraders.useQuery({
    sortBy,
    limit: 20,
  });

  const { data: followedTraders, isLoading: loadingFollowed } = trpc.copyTrading.getFollowed.useQuery();
  const { data: copyHistory } = trpc.copyTrading.getHistory.useQuery({ limit: 50 });
  const { data: copyStats } = trpc.copyTrading.getStats.useQuery();

  // Mutations
  const followMutation = trpc.copyTrading.follow.useMutation({
    onSuccess: () => {
      toast.success("Successfully started copy trading!");
      setShowFollowDialog(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const unfollowMutation = trpc.copyTrading.unfollow.useMutation({
    onSuccess: () => {
      toast.success("Stopped copy trading");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const pauseMutation = trpc.copyTrading.pause.useMutation({
    onSuccess: () => {
      toast.success("Copy trading paused");
    },
  });

  const resumeMutation = trpc.copyTrading.resume.useMutation({
    onSuccess: () => {
      toast.success("Copy trading resumed");
    },
  });

  const handleFollow = () => {
    if (!selectedTrader) return;
    followMutation.mutate({
      traderId: selectedTrader,
      settings: followSettings,
    });
  };

  const getRiskColor = (score: number) => {
    if (score <= 3) return "text-green-500";
    if (score <= 6) return "text-yellow-500";
    return "text-red-500";
  };

  const getTradingStyleBadge = (style: string) => {
    const styles: Record<string, { color: string; label: string }> = {
      day_trader: { color: "bg-blue-500", label: "Day Trader" },
      swing_trader: { color: "bg-purple-500", label: "Swing Trader" },
      position_trader: { color: "bg-green-500", label: "Position Trader" },
      scalper: { color: "bg-orange-500", label: "Scalper" },
    };
    const s = styles[style] || { color: "bg-gray-500", label: style };
    return <Badge className={s.color}>{s.label}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Copy Trading</h1>
            <p className="text-muted-foreground">
              Follow top traders and automatically copy their trades
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        {copyStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Trades</p>
                    <p className="text-2xl font-bold">{copyStats.totalCopiedTrades}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Copy className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Successful</p>
                    <p className="text-2xl font-bold">{copyStats.successfulTrades}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${copyStats.totalPnL >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    {copyStats.totalPnL >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total P&L</p>
                    <p className={`text-2xl font-bold ${copyStats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ${copyStats.totalPnL.toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Target className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Win Rate</p>
                    <p className="text-2xl font-bold">{copyStats.winRate.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue="discover" className="space-y-4">
          <TabsList>
            <TabsTrigger value="discover">
              <Search className="h-4 w-4 mr-2" />
              Discover Traders
            </TabsTrigger>
            <TabsTrigger value="following">
              <Users className="h-4 w-4 mr-2" />
              Following ({followedTraders?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="history">
              <Clock className="h-4 w-4 mr-2" />
              Trade History
            </TabsTrigger>
          </TabsList>

          {/* Discover Traders Tab */}
          <TabsContent value="discover" className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input placeholder="Search traders..." className="max-w-sm" />
              </div>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="return">Total Return</SelectItem>
                  <SelectItem value="winRate">Win Rate</SelectItem>
                  <SelectItem value="followers">Followers</SelectItem>
                  <SelectItem value="sharpe">Sharpe Ratio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loadingTraders ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="pt-6 h-48" />
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topTraders?.map((trader) => (
                  <Card key={trader.id} className="hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                            <span className="text-lg font-bold">{trader.name.charAt(0)}</span>
                          </div>
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              {trader.name}
                              {trader.isVerified && (
                                <CheckCircle className="h-4 w-4 text-blue-500" />
                              )}
                            </CardTitle>
                            {getTradingStyleBadge(trader.tradingStyle)}
                          </div>
                        </div>
                        <div className={`flex items-center gap-1 ${getRiskColor(trader.riskScore)}`}>
                          <Shield className="h-4 w-4" />
                          <span className="text-sm font-medium">{trader.riskScore}/10</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">

                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Return</p>
                          <p className={`text-lg font-bold ${Number(trader.totalReturn) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {Number(trader.totalReturn) >= 0 ? '+' : ''}{Number(trader.totalReturn).toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Win Rate</p>
                          <p className="text-lg font-bold">{Number(trader.winRate).toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Sharpe Ratio</p>
                          <p className="text-lg font-bold">{Number(trader.sharpeRatio).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Followers</p>
                          <p className="text-lg font-bold">{trader.followers}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="text-sm text-muted-foreground">
                          {trader.totalTrades} trades
                        </div>
                        <Dialog open={showFollowDialog && selectedTrader === trader.id} onOpenChange={(open) => {
                          setShowFollowDialog(open);
                          if (open) setSelectedTrader(trader.id);
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm">
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Trader
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Copy {trader.name}</DialogTitle>
                              <DialogDescription>
                                Configure your copy trading settings
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Allocation Mode</Label>
                                <Select 
                                  value={followSettings.allocationMode}
                                  onValueChange={(v) => setFollowSettings(s => ({ ...s, allocationMode: v as typeof s.allocationMode }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                                    <SelectItem value="percentage">Percentage of Portfolio</SelectItem>
                                    <SelectItem value="proportional">Proportional to Trader</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>Allocation Amount ($)</Label>
                                <Input
                                  type="number"
                                  value={followSettings.allocationAmount}
                                  onChange={(e) => setFollowSettings(s => ({ ...s, allocationAmount: Number(e.target.value) }))}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Max Position Size ($)</Label>
                                <Input
                                  type="number"
                                  value={followSettings.maxPositionSize}
                                  onChange={(e) => setFollowSettings(s => ({ ...s, maxPositionSize: Number(e.target.value) }))}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Max Daily Loss ($)</Label>
                                <Input
                                  type="number"
                                  value={followSettings.maxDailyLoss}
                                  onChange={(e) => setFollowSettings(s => ({ ...s, maxDailyLoss: Number(e.target.value) }))}
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <Label>Copy Stop Loss</Label>
                                <Switch
                                  checked={followSettings.copyStopLoss}
                                  onCheckedChange={(v) => setFollowSettings(s => ({ ...s, copyStopLoss: v }))}
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <Label>Copy Take Profit</Label>
                                <Switch
                                  checked={followSettings.copyTakeProfit}
                                  onCheckedChange={(v) => setFollowSettings(s => ({ ...s, copyTakeProfit: v }))}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setShowFollowDialog(false)}>
                                Cancel
                              </Button>
                              <Button onClick={handleFollow} disabled={followMutation.isPending}>
                                {followMutation.isPending ? "Starting..." : "Start Copying"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Following Tab */}
          <TabsContent value="following" className="space-y-4">
            {loadingFollowed ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="pt-6 h-32" />
                  </Card>
                ))}
              </div>
            ) : followedTraders?.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Not following anyone yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Discover top traders and start copy trading
                  </p>
                  <Button onClick={() => document.querySelector('[value="discover"]')?.dispatchEvent(new Event('click'))}>
                    Discover Traders
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {followedTraders?.map((settings) => (
                  <Card key={settings.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                            <span className="text-lg font-bold">T</span>
                          </div>
                          <div>
                            <h3 className="font-semibold">Trader {settings.traderId.slice(0, 8)}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant={settings.status === 'active' ? 'default' : settings.status === 'paused' ? 'secondary' : 'destructive'}>
                                {settings.status}
                              </Badge>
                              <span>•</span>
                              <span>${settings.allocationAmount} allocation</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {settings.status === 'active' ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => pauseMutation.mutate({ copySettingsId: settings.id })}
                            >
                              <Pause className="h-4 w-4 mr-2" />
                              Pause
                            </Button>
                          ) : settings.status === 'paused' ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => resumeMutation.mutate({ copySettingsId: settings.id })}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Resume
                            </Button>
                          ) : null}
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => unfollowMutation.mutate({ copySettingsId: settings.id })}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Stop
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            {!copyHistory?.length ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No copy trades yet</h3>
                  <p className="text-muted-foreground">
                    Your copied trades will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Copied Trades</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {copyHistory.map((trade) => (
                      <div key={trade.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${trade.side === 'buy' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            {trade.side === 'buy' ? (
                              <TrendingUp className="h-5 w-5 text-green-500" />
                            ) : (
                              <TrendingDown className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold">{trade.symbol}</p>
                            <p className="text-sm text-muted-foreground">
                              {trade.side.toUpperCase()} • {Number(trade.copiedQuantity).toFixed(4)} @ ${Number(trade.copiedPrice).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={trade.status === 'executed' ? 'default' : trade.status === 'pending' ? 'secondary' : 'destructive'}>
                            {trade.status}
                          </Badge>
                          {trade.pnl !== null && (
                            <p className={`text-sm font-medium ${Number(trade.pnl) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {Number(trade.pnl) >= 0 ? '+' : ''}${Number(trade.pnl).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
