import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, 
  DollarSign, Target, Calendar, Filter, Download, RefreshCw,
  BarChart3, PieChart, Activity
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useBroker, BrokerConnection } from '@/contexts/BrokerContext';

export default function OrderHistory() {
  const { connectedBrokers: connections } = useBroker();
  const [selectedConnection, setSelectedConnection] = useState<string>('all');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [selectedSide, setSelectedSide] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30d');
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;

  // Calculate date range
  const dateFilters = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (dateRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case 'all':
      default:
        return { startDate: undefined, endDate: undefined };
    }
    
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }, [dateRange]);

  // Fetch order history
  const { data: orderHistory, isLoading: historyLoading, refetch: refetchHistory } = trpc.broker.getOrderHistory.useQuery({
    connectionId: selectedConnection !== 'all' ? selectedConnection : undefined,
    symbol: selectedSymbol || undefined,
    side: selectedSide !== 'all' ? (selectedSide as 'buy' | 'sell') : undefined,
    startDate: dateFilters.startDate,
    endDate: dateFilters.endDate,
    limit: pageSize,
    offset: currentPage * pageSize,
  });

  // Fetch P&L summary
  const { data: pnlSummary, isLoading: pnlLoading } = trpc.broker.getPnLSummary.useQuery({
    connectionId: selectedConnection !== 'all' ? selectedConnection : undefined,
    startDate: dateFilters.startDate,
    endDate: dateFilters.endDate,
  });

  // Fetch symbol breakdown
  const { data: symbolBreakdown } = trpc.broker.getSymbolPnLBreakdown.useQuery({
    connectionId: selectedConnection !== 'all' ? selectedConnection : undefined,
    startDate: dateFilters.startDate,
    endDate: dateFilters.endDate,
  });

  // Fetch daily P&L
  const { data: dailyPnL } = trpc.broker.getDailyPnL.useQuery({
    connectionId: selectedConnection !== 'all' ? selectedConnection : undefined,
    days: dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalPages = orderHistory ? Math.ceil(orderHistory.total / pageSize) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Order History</h1>
            <p className="text-muted-foreground">
              Track your executed orders, P&L, and trading performance
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchHistory()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* P&L Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(pnlSummary?.totalRealizedPL || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {pnlLoading ? '...' : formatCurrency(pnlSummary?.totalRealizedPL || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {pnlSummary?.totalTrades || 0} closed trades
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pnlLoading ? '...' : formatPercent(pnlSummary?.winRate || 0).replace('+', '')}
              </div>
              <p className="text-xs text-muted-foreground">
                {pnlSummary?.winningTrades || 0}W / {pnlSummary?.losingTrades || 0}L
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profit Factor</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pnlLoading ? '...' : (pnlSummary?.profitFactor === Infinity ? '∞' : (pnlSummary?.profitFactor || 0).toFixed(2))}
              </div>
              <p className="text-xs text-muted-foreground">
                Avg Win: {formatCurrency(pnlSummary?.avgWin || 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Hold Time</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pnlLoading ? '...' : `${(pnlSummary?.avgHoldingPeriod || 0).toFixed(1)}d`}
              </div>
              <p className="text-xs text-muted-foreground">
                Avg Loss: {formatCurrency(pnlSummary?.avgLoss || 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div>
                <label className="text-sm font-medium mb-2 block">Broker</label>
                <Select value={selectedConnection} onValueChange={setSelectedConnection}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Brokers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brokers</SelectItem>
                    {connections.map((conn: BrokerConnection) => (
                      <SelectItem key={conn.id} value={conn.id}>
                        {conn.brokerType} - {conn.accountId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Symbol</label>
                <Input
                  placeholder="e.g., AAPL"
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value.toUpperCase())}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Side</label>
                <Select value={selectedSide} onValueChange={setSelectedSide}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Date Range</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                    <SelectItem value="1y">Last Year</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setSelectedConnection('all');
                    setSelectedSymbol('');
                    setSelectedSide('all');
                    setDateRange('30d');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="history" className="space-y-4">
          <TabsList>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Trade History
            </TabsTrigger>
            <TabsTrigger value="symbols" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              By Symbol
            </TabsTrigger>
            <TabsTrigger value="daily" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Daily P&L
            </TabsTrigger>
          </TabsList>

          {/* Trade History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Executed Orders</CardTitle>
                <CardDescription>
                  Showing {orderHistory?.executions.length || 0} of {orderHistory?.total || 0} orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : orderHistory?.executions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No orders found matching your filters
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Symbol</TableHead>
                          <TableHead>Side</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                          <TableHead className="text-right">P&L</TableHead>
                          <TableHead className="text-right">Fees</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderHistory?.executions.map((exec) => (
                          <TableRow key={exec.id}>
                            <TableCell className="font-mono text-sm">
                              {formatDate(exec.executedAt)}
                            </TableCell>
                            <TableCell className="font-medium">{exec.symbol}</TableCell>
                            <TableCell>
                              <Badge variant={exec.side === 'buy' ? 'default' : 'secondary'}>
                                {exec.side === 'buy' ? (
                                  <ArrowUpRight className="mr-1 h-3 w-3" />
                                ) : (
                                  <ArrowDownRight className="mr-1 h-3 w-3" />
                                )}
                                {exec.side.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {exec.orderType}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {exec.executedQuantity.toFixed(4)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(exec.executedPrice)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(exec.executionValue)}
                            </TableCell>
                            <TableCell className="text-right">
                              {exec.isClosingTrade && exec.realizedPL !== null ? (
                                <span className={exec.realizedPL >= 0 ? 'text-green-500' : 'text-red-500'}>
                                  {formatCurrency(exec.realizedPL)}
                                  <span className="text-xs ml-1">
                                    ({formatPercent(exec.realizedPLPercent || 0)})
                                  </span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              {formatCurrency(exec.commission + exec.fees)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                          Page {currentPage + 1} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                            disabled={currentPage === 0}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={currentPage >= totalPages - 1}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Symbol Breakdown Tab */}
          <TabsContent value="symbols">
            <Card>
              <CardHeader>
                <CardTitle>P&L by Symbol</CardTitle>
                <CardDescription>
                  Performance breakdown for each traded symbol
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!symbolBreakdown || symbolBreakdown.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No symbol data available
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Symbol</TableHead>
                        <TableHead className="text-right">Total P&L</TableHead>
                        <TableHead className="text-right">Trades</TableHead>
                        <TableHead className="text-right">Win Rate</TableHead>
                        <TableHead className="text-right">Volume</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {symbolBreakdown.map((item) => (
                        <TableRow key={item.symbol}>
                          <TableCell className="font-medium">{item.symbol}</TableCell>
                          <TableCell className={`text-right font-mono ${item.totalPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {formatCurrency(item.totalPL)}
                          </TableCell>
                          <TableCell className="text-right">{item.trades}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={item.winRate >= 50 ? 'default' : 'secondary'}>
                              {item.winRate.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {formatCurrency(item.totalVolume)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Daily P&L Tab */}
          <TabsContent value="daily">
            <Card>
              <CardHeader>
                <CardTitle>Daily P&L</CardTitle>
                <CardDescription>
                  Daily profit and loss over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!dailyPnL || dailyPnL.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No daily P&L data available
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Simple bar chart representation */}
                    <div className="h-64 flex items-end gap-1 overflow-x-auto pb-4">
                      {dailyPnL.slice(-30).map((day, idx) => {
                        const maxPnL = Math.max(...dailyPnL.map(d => Math.abs(d.pnl)));
                        const height = maxPnL > 0 ? (Math.abs(day.pnl) / maxPnL) * 100 : 0;
                        
                        return (
                          <div key={day.date} className="flex flex-col items-center min-w-[20px]">
                            <div 
                              className={`w-4 rounded-t ${day.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                              style={{ height: `${Math.max(height, 2)}%` }}
                              title={`${day.date}: ${formatCurrency(day.pnl)}`}
                            />
                            {idx % 5 === 0 && (
                              <span className="text-xs text-muted-foreground mt-1 rotate-45 origin-left">
                                {day.date.slice(5)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Summary stats */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-sm text-muted-foreground">Cumulative P&L</p>
                        <p className={`text-xl font-bold ${(dailyPnL[dailyPnL.length - 1]?.cumulativePnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatCurrency(dailyPnL[dailyPnL.length - 1]?.cumulativePnl || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Best Day</p>
                        <p className="text-xl font-bold text-green-500">
                          {formatCurrency(Math.max(...dailyPnL.map(d => d.pnl)))}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Worst Day</p>
                        <p className="text-xl font-bold text-red-500">
                          {formatCurrency(Math.min(...dailyPnL.map(d => d.pnl)))}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
