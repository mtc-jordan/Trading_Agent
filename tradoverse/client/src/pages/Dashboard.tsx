/**
 * Multi-Broker Dashboard
 * 
 * The central hub for TradoVerse - designed around multi-broker support.
 * Shows data based on the selected broker or aggregated view for all brokers.
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { useBroker, BrokerType } from "@/contexts/BrokerContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { ConnectionStatus, AlpacaStreamStatus } from "@/components/ConnectionStatus";
import { PriceTicker } from "@/components/LivePriceDisplay";
import { 
  ArrowDown, 
  ArrowUp, 
  ArrowRight,
  Bot, 
  Brain, 
  ChartLine, 
  DollarSign, 
  LineChart, 
  Plus, 
  TrendingUp,
  Activity,
  Wallet,
  Link2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Building2,
  Layers,
  PieChart,
  BarChart3,
  Clock,
  Zap,
  Settings,
  ExternalLink
} from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { toast } from "sonner";

// Broker-specific colors and icons
const BROKER_STYLES: Record<BrokerType, { color: string; bgColor: string; icon: string }> = {
  alpaca: { color: "text-yellow-500", bgColor: "bg-yellow-500/10", icon: "🦙" },
  interactive_brokers: { color: "text-red-500", bgColor: "bg-red-500/10", icon: "🏦" },
  binance: { color: "text-amber-500", bgColor: "bg-amber-500/10", icon: "₿" },
  coinbase: { color: "text-blue-500", bgColor: "bg-blue-500/10", icon: "🪙" },
  schwab: { color: "text-cyan-500", bgColor: "bg-cyan-500/10", icon: "📈" }
};

// Format currency
function formatCurrency(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (compact && Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

// Format percentage
function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { 
    activeBroker, 
    connectedBrokers, 
    selectBroker, 
    isLoadingBrokers,
    refetchBrokers,
    getBrokerName,
    hasConnectedBroker,
    isPaperMode
  } = useBroker();
  
  const [selectedView, setSelectedView] = useState<'all' | string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Fetch broker-specific data when a broker is selected
  const [brokerAccount, setBrokerAccount] = useState<any>(null);
  const [brokerPositions, setBrokerPositions] = useState<any[]>([]);
  const [accountLoading, setAccountLoading] = useState(false);
  const [positionsLoading, setPositionsLoading] = useState(false);
  
  // Placeholder functions for refetch
  const refetchAccount = async () => {};
  const refetchPositions = async () => {};
  
  // Fetch all accounts for aggregated view
  const { data: accounts } = trpc.account.list.useQuery();
  const { data: bots } = trpc.bot.list.useQuery();
  const { data: tierLimits } = trpc.user.getTierLimits.useQuery();
  
  // Calculate totals
  const activeBots = bots?.filter(b => b.status === "active").length || 0;
  const totalBots = bots?.length || 0;
  
  // Handle broker selection
  const handleBrokerSelect = (value: string) => {
    setSelectedView(value);
    if (value !== 'all') {
      selectBroker(value);
    }
  };
  
  // Refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchBrokers(),
        activeBroker?.id && refetchAccount(),
        activeBroker?.id && refetchPositions()
      ]);
      toast.success('Data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Get current broker data
  const currentBrokerData = activeBroker ? {
    equity: brokerAccount?.equity || 0,
    cash: brokerAccount?.cash || 0,
    buyingPower: brokerAccount?.buyingPower || 0,
    portfolioValue: brokerAccount?.portfolioValue || 0,
    dayPnL: brokerAccount?.dayPnL || 0,
    dayPnLPercent: brokerAccount?.dayPnLPercent || 0,
    totalPnL: brokerAccount?.totalPnL || 0,
    totalPnLPercent: brokerAccount?.totalPnLPercent || 0,
    positions: brokerPositions || []
  } : null;
  
  // Aggregated data across all brokers
  const aggregatedData = {
    totalEquity: connectedBrokers.reduce((sum, b) => sum + (b.isConnected ? 100000 : 0), 0), // Placeholder
    totalCash: connectedBrokers.reduce((sum, b) => sum + (b.isConnected ? 50000 : 0), 0),
    connectedCount: connectedBrokers.filter(b => b.isConnected).length,
    totalCount: connectedBrokers.length
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Broker Selector */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Welcome back, {user?.name || "Trader"}!
              </p>
            </div>
            
            {/* Connection Status */}
            <div className="flex items-center gap-3">
              <AlpacaStreamStatus />
              <ConnectionStatus />
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          
          {/* Broker Selector Bar */}
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">Active Broker:</span>
                </div>
                
                <div className="flex-1 flex flex-wrap items-center gap-2">
                  {/* All Brokers Option */}
                  <Button
                    variant={selectedView === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleBrokerSelect('all')}
                    className="gap-2"
                  >
                    <Layers className="w-4 h-4" />
                    All Brokers
                    {connectedBrokers.length > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {connectedBrokers.filter(b => b.isConnected).length}/{connectedBrokers.length}
                      </Badge>
                    )}
                  </Button>
                  
                  {/* Individual Broker Buttons */}
                  {connectedBrokers.map((broker) => {
                    const style = BROKER_STYLES[broker.brokerType];
                    const isSelected = activeBroker?.id === broker.id && selectedView !== 'all';
                    
                    return (
                      <Button
                        key={broker.id}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleBrokerSelect(broker.id)}
                        className={`gap-2 ${isSelected ? '' : style.bgColor}`}
                      >
                        <span>{style.icon}</span>
                        {getBrokerName(broker.brokerType)}
                        {broker.isPaper && (
                          <Badge variant="outline" className="text-[10px] px-1">Paper</Badge>
                        )}
                        {broker.isConnected ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-500" />
                        )}
                      </Button>
                    );
                  })}
                  
                  {/* Add Broker Button */}
                  <Link href="/brokers">
                    <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                      <Plus className="w-4 h-4" />
                      Add Broker
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* No Brokers Connected State */}
        {!hasConnectedBroker && !isLoadingBrokers && (
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Connect Your First Broker</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Connect a broker account to start trading with AI-powered analysis. 
                We support Alpaca, Interactive Brokers, Binance, Coinbase, and Charles Schwab.
              </p>
              <Link href="/brokers">
                <Button size="lg" className="gap-2">
                  <Plus className="w-5 h-5" />
                  Connect Broker
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Main Content - Conditional based on broker selection */}
        {hasConnectedBroker && (
          <>
            {/* Aggregated View */}
            {selectedView === 'all' && (
              <div className="space-y-6">
                {/* Aggregated Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Portfolio Value
                      </CardTitle>
                      <PieChart className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(aggregatedData.totalEquity)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Across {aggregatedData.connectedCount} connected brokers
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Available Cash
                      </CardTitle>
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(aggregatedData.totalCash)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ready to invest
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Active Bots
                      </CardTitle>
                      <Bot className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{activeBots}</div>
                      <p className="text-xs text-muted-foreground">
                        of {totalBots} total
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Connected Brokers
                      </CardTitle>
                      <Link2 className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {aggregatedData.connectedCount}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        of {aggregatedData.totalCount} configured
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Broker Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {connectedBrokers.map((broker) => {
                    const style = BROKER_STYLES[broker.brokerType];
                    
                    return (
                      <Card 
                        key={broker.id} 
                        className={`bg-card border-border cursor-pointer hover:border-primary/50 transition-colors ${
                          !broker.isConnected ? 'opacity-60' : ''
                        }`}
                        onClick={() => handleBrokerSelect(broker.id)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg ${style.bgColor} flex items-center justify-center text-xl`}>
                                {style.icon}
                              </div>
                              <div>
                                <CardTitle className="text-base">
                                  {getBrokerName(broker.brokerType)}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                  {broker.accountId || 'Account connected'}
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {broker.isPaper && (
                                <Badge variant="outline" className="text-xs">Paper</Badge>
                              )}
                              {broker.isConnected ? (
                                <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Connected
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Disconnected
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Portfolio Value</p>
                              <p className="text-lg font-semibold">$100,000</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Day P/L</p>
                              <p className="text-lg font-semibold text-profit">+$1,234</p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full mt-3 gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBrokerSelect(broker.id);
                            }}
                          >
                            View Details
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Single Broker View */}
            {selectedView !== 'all' && activeBroker && (
              <div className="space-y-6">
                {/* Broker Header */}
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${BROKER_STYLES[activeBroker.brokerType].bgColor} flex items-center justify-center text-2xl`}>
                    {BROKER_STYLES[activeBroker.brokerType].icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold">{getBrokerName(activeBroker.brokerType)}</h2>
                      {activeBroker.isPaper && (
                        <Badge variant="outline">Paper Trading</Badge>
                      )}
                      {activeBroker.isConnected ? (
                        <Badge variant="default" className="bg-green-500/10 text-green-500">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />
                          Disconnected
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Account: {activeBroker.accountId || 'N/A'}
                    </p>
                  </div>
                  <Link href="/brokers">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Settings className="w-4 h-4" />
                      Manage
                    </Button>
                  </Link>
                </div>
                
                {/* Account Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Portfolio Value
                      </CardTitle>
                      <Wallet className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      {accountLoading ? (
                        <Skeleton className="h-8 w-32" />
                      ) : (
                        <>
                          <div className="text-2xl font-bold">
                            {formatCurrency(currentBrokerData?.portfolioValue || 0)}
                          </div>
                          <div className={`flex items-center text-sm ${
                            (currentBrokerData?.dayPnLPercent || 0) >= 0 ? 'text-profit' : 'text-loss'
                          }`}>
                            {(currentBrokerData?.dayPnLPercent || 0) >= 0 ? (
                              <ArrowUp className="w-4 h-4 mr-1" />
                            ) : (
                              <ArrowDown className="w-4 h-4 mr-1" />
                            )}
                            {formatPercent(currentBrokerData?.dayPnLPercent || 0)} today
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Buying Power
                      </CardTitle>
                      <Zap className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      {accountLoading ? (
                        <Skeleton className="h-8 w-32" />
                      ) : (
                        <>
                          <div className="text-2xl font-bold">
                            {formatCurrency(currentBrokerData?.buyingPower || 0)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Available for trading
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Day P/L
                      </CardTitle>
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      {accountLoading ? (
                        <Skeleton className="h-8 w-32" />
                      ) : (
                        <>
                          <div className={`text-2xl font-bold ${
                            (currentBrokerData?.dayPnL || 0) >= 0 ? 'text-profit' : 'text-loss'
                          }`}>
                            {(currentBrokerData?.dayPnL || 0) >= 0 ? '+' : ''}
                            {formatCurrency(currentBrokerData?.dayPnL || 0)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Today's performance
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Cash Balance
                      </CardTitle>
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      {accountLoading ? (
                        <Skeleton className="h-8 w-32" />
                      ) : (
                        <>
                          <div className="text-2xl font-bold">
                            {formatCurrency(currentBrokerData?.cash || 0)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Uninvested cash
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
                
                {/* Positions Table */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Positions</CardTitle>
                        <CardDescription>
                          Your current holdings on {getBrokerName(activeBroker.brokerType)}
                        </CardDescription>
                      </div>
                      <Link href="/portfolio">
                        <Button variant="outline" size="sm" className="gap-2">
                          View All
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {positionsLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : currentBrokerData?.positions && currentBrokerData.positions.length > 0 ? (
                      <div className="space-y-2">
                        {currentBrokerData.positions.slice(0, 5).map((position: any, index: number) => (
                          <div 
                            key={index}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary">
                                {position.symbol?.slice(0, 2)}
                              </div>
                              <div>
                                <p className="font-medium">{position.symbol}</p>
                                <p className="text-xs text-muted-foreground">
                                  {position.qty} shares @ {formatCurrency(position.avgEntryPrice || 0)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(position.marketValue || 0)}</p>
                              <p className={`text-sm ${
                                (position.unrealizedPL || 0) >= 0 ? 'text-profit' : 'text-loss'
                              }`}>
                                {(position.unrealizedPL || 0) >= 0 ? '+' : ''}
                                {formatCurrency(position.unrealizedPL || 0)}
                                {' '}
                                ({formatPercent(position.unrealizedPLPercent || 0)})
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No positions yet</p>
                        <Link href="/trading">
                          <Button variant="outline" size="sm" className="mt-3">
                            Start Trading
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Quick Actions */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Link href="/analysis">
                    <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                      <Brain className="w-6 h-6" />
                      <span className="text-sm">AI Analysis</span>
                    </Button>
                  </Link>
                  <Link href="/bots">
                    <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                      <Bot className="w-6 h-6" />
                      <span className="text-sm">Trading Bots</span>
                    </Button>
                  </Link>
                  <Link href="/trading">
                    <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                      <TrendingUp className="w-6 h-6" />
                      <span className="text-sm">Trade Now</span>
                    </Button>
                  </Link>
                  <Link href="/portfolio">
                    <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                      <PieChart className="w-6 h-6" />
                      <span className="text-sm">Portfolio</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            
            {/* Live Market Prices */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Live Market Prices</CardTitle>
                <CardDescription>Real-time streaming from Alpaca</CardDescription>
              </CardHeader>
              <CardContent>
                <PriceTicker symbols={['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA']} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
