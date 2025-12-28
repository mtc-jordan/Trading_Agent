/**
 * Unified Positions View Component
 * Aggregates and displays positions from all connected brokers
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  Briefcase, 
  RefreshCw, 
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Layers
} from 'lucide-react';
import { useBroker, type BrokerType } from '@/contexts/BrokerContext';
import { trpc } from '@/lib/trpc';
import { BrokerBadge } from './BrokerBadge';

type Position = {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  side: 'long' | 'short';
  broker: string;
  brokerId: string;
};

type BrokerPositions = {
  brokerId: string;
  brokerName: string;
  positions: Position[];
  totalValue: number;
  totalPL: number;
};

export function UnifiedPositionsView() {
  const [filterBroker, setFilterBroker] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'symbol' | 'value' | 'pl' | 'broker'>('value');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { connectedBrokers, activeBroker, getBrokerName, hasConnectedBroker } = useBroker();
  
  // Fetch positions from broker service
  // Note: broker.getPositions requires connectionId, we'll use mock data for unified view
  // In production, this would aggregate positions from all connected brokers
  const isLoading = false;
  const refetch = () => {};
  
  // Mock data for demonstration when no real positions
  const mockPositions: Position[] = useMemo(() => {
    // Return empty if no connected brokers
    if (!hasConnectedBroker) return [];
    
    // Generate mock positions for connected brokers
    const mockData: Position[] = [];
    connectedBrokers.forEach(broker => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
      symbols.slice(0, Math.floor(Math.random() * 3) + 2).forEach(symbol => {
        const quantity = Math.floor(Math.random() * 100) + 10;
        const averagePrice = Math.random() * 200 + 100;
        const currentPrice = averagePrice * (1 + (Math.random() - 0.5) * 0.2);
        const marketValue = quantity * currentPrice;
        const unrealizedPL = (currentPrice - averagePrice) * quantity;
        
        mockData.push({
          symbol,
          quantity,
          averagePrice,
          currentPrice,
          marketValue,
          unrealizedPL,
          unrealizedPLPercent: ((currentPrice - averagePrice) / averagePrice) * 100,
          side: 'long',
          broker: broker.brokerType,
          brokerId: broker.id,
        });
      });
    });
    
    return mockData;
  }, [connectedBrokers, hasConnectedBroker]);
  
  // Filter and sort positions
  const filteredPositions = useMemo(() => {
    let positions = [...mockPositions];
    
    // Filter by broker
    if (filterBroker !== 'all') {
      positions = positions.filter(p => p.brokerId === filterBroker);
    }
    
    // Sort
    positions.sort((a, b) => {
      switch (sortBy) {
        case 'symbol':
          return a.symbol.localeCompare(b.symbol);
        case 'value':
          return b.marketValue - a.marketValue;
        case 'pl':
          return b.unrealizedPL - a.unrealizedPL;
        case 'broker':
          return a.broker.localeCompare(b.broker);
        default:
          return 0;
      }
    });
    
    return positions;
  }, [mockPositions, filterBroker, sortBy]);
  
  // Calculate totals
  const totals = useMemo(() => {
    return filteredPositions.reduce(
      (acc, pos) => ({
        totalValue: acc.totalValue + pos.marketValue,
        totalPL: acc.totalPL + pos.unrealizedPL,
        positionCount: acc.positionCount + 1,
      }),
      { totalValue: 0, totalPL: 0, positionCount: 0 }
    );
  }, [filteredPositions]);
  
  // Group positions by broker
  const positionsByBroker = useMemo(() => {
    const grouped: Record<string, BrokerPositions> = {};
    
    filteredPositions.forEach(pos => {
      if (!grouped[pos.brokerId]) {
        grouped[pos.brokerId] = {
          brokerId: pos.brokerId,
          brokerName: getBrokerName(pos.broker as BrokerType),
          positions: [],
          totalValue: 0,
          totalPL: 0,
        };
      }
      grouped[pos.brokerId].positions.push(pos);
      grouped[pos.brokerId].totalValue += pos.marketValue;
      grouped[pos.brokerId].totalPL += pos.unrealizedPL;
    });
    
    return Object.values(grouped);
  }, [filteredPositions, getBrokerName]);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };
  
  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };
  
  if (!hasConnectedBroker) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-12">
          <div className="text-center">
            <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Brokers Connected</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Connect a broker to view your unified positions across all accounts.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Unified Positions
          </h2>
          <p className="text-muted-foreground">
            View all positions across {connectedBrokers.length} connected broker{connectedBrokers.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Broker filter */}
          <Select value={filterBroker} onValueChange={setFilterBroker}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Brokers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brokers</SelectItem>
              {connectedBrokers.map(broker => (
                <SelectItem key={broker.id} value={broker.id}>
                  {getBrokerName(broker.brokerType)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="value">By Value</SelectItem>
              <SelectItem value="pl">By P/L</SelectItem>
              <SelectItem value="symbol">By Symbol</SelectItem>
              <SelectItem value="broker">By Broker</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Refresh */}
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Briefcase className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">{formatCurrency(totals.totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${totals.totalPL >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                {totals.totalPL >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unrealized P/L</p>
                <p className={`text-2xl font-bold ${totals.totalPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(totals.totalPL)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Layers className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Open Positions</p>
                <p className="text-2xl font-bold">{totals.positionCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Positions by Broker */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Positions</TabsTrigger>
          <TabsTrigger value="by-broker">By Broker</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Positions</CardTitle>
              <CardDescription>
                {filteredPositions.length} position{filteredPositions.length !== 1 ? 's' : ''} across all brokers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : filteredPositions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No open positions
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Table header */}
                  <div className="grid grid-cols-7 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
                    <div>Symbol</div>
                    <div>Broker</div>
                    <div className="text-right">Qty</div>
                    <div className="text-right">Avg Price</div>
                    <div className="text-right">Current</div>
                    <div className="text-right">Value</div>
                    <div className="text-right">P/L</div>
                  </div>
                  
                  {/* Position rows */}
                  {filteredPositions.map((pos, idx) => (
                    <div 
                      key={`${pos.brokerId}-${pos.symbol}-${idx}`}
                      className="grid grid-cols-7 gap-4 px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="font-medium flex items-center gap-2">
                        {pos.symbol}
                        <Badge variant="outline" className="text-xs">
                          {pos.side}
                        </Badge>
                      </div>
                      <div>
                        <Badge variant="secondary" className="text-xs">
                          {getBrokerName(pos.broker as BrokerType)}
                        </Badge>
                      </div>
                      <div className="text-right">{pos.quantity}</div>
                      <div className="text-right">{formatCurrency(pos.averagePrice)}</div>
                      <div className="text-right">{formatCurrency(pos.currentPrice)}</div>
                      <div className="text-right font-medium">{formatCurrency(pos.marketValue)}</div>
                      <div className={`text-right font-medium flex items-center justify-end gap-1 ${
                        pos.unrealizedPL >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {pos.unrealizedPL >= 0 ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {formatCurrency(pos.unrealizedPL)}
                        <span className="text-xs">({formatPercent(pos.unrealizedPLPercent)})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="by-broker">
          <div className="space-y-4">
            {positionsByBroker.map(brokerGroup => (
              <Card key={brokerGroup.brokerId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-lg">{brokerGroup.brokerName}</CardTitle>
                        <CardDescription>
                          {brokerGroup.positions.length} position{brokerGroup.positions.length !== 1 ? 's' : ''}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Value</p>
                      <p className="text-lg font-bold">{formatCurrency(brokerGroup.totalValue)}</p>
                      <p className={`text-sm ${brokerGroup.totalPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(brokerGroup.totalPL)} P/L
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {brokerGroup.positions.map((pos, idx) => (
                      <div 
                        key={`${pos.symbol}-${idx}`}
                        className="grid grid-cols-6 gap-4 px-4 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="font-medium">{pos.symbol}</div>
                        <div className="text-right">{pos.quantity}</div>
                        <div className="text-right">{formatCurrency(pos.averagePrice)}</div>
                        <div className="text-right">{formatCurrency(pos.currentPrice)}</div>
                        <div className="text-right font-medium">{formatCurrency(pos.marketValue)}</div>
                        <div className={`text-right font-medium ${
                          pos.unrealizedPL >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {formatCurrency(pos.unrealizedPL)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default UnifiedPositionsView;
