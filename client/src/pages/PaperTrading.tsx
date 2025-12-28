/**
 * Paper Trading Simulator Page
 * Virtual trading environment to test strategies with simulated money
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign,
  BarChart3,
  History,
  Target,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Percent
} from 'lucide-react';
import { toast } from 'sonner';
import { useBroker } from '@/contexts/BrokerContext';
import { BrokerBadge } from '@/components/BrokerBadge';
import { BrokerSelectField } from '@/components/BrokerSelector';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Building2 } from 'lucide-react';

const POPULAR_STOCKS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META', 'AMD', 'NFLX', 'DIS'];

export default function PaperTrading() {
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop_loss' | 'stop_limit'>('market');
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('10');
  const [limitPrice, setLimitPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [useLiveBroker, setUseLiveBroker] = useState(false);
  const [selectedBrokerId, setSelectedBrokerId] = useState('');
  
  // Broker context
  const { activeBroker, connectedBrokers, isPaperMode, getBrokerName, hasConnectedBroker } = useBroker();

  // Get user's accounts first
  const accountsQuery = trpc.paperTrading.listAccounts.useQuery();
  const accounts = accountsQuery.data || [];
  
  // Auto-select first account
  const accountId = selectedAccountId || accounts[0]?.id || '';

  // Queries (only run when we have an account)
  const accountQuery = trpc.paperTrading.getAccount.useQuery(
    { accountId },
    { enabled: !!accountId }
  );
  const positionsQuery = trpc.paperTrading.getPositions.useQuery(
    { accountId },
    { enabled: !!accountId }
  );
  const ordersQuery = trpc.paperTrading.getOrders.useQuery(
    { accountId, status: 'all' },
    { enabled: !!accountId }
  );
  const tradesQuery = trpc.paperTrading.getTradeHistory.useQuery(
    { accountId },
    { enabled: !!accountId }
  );
  const performanceQuery = trpc.paperTrading.getPerformance.useQuery(
    { accountId },
    { enabled: !!accountId }
  );

  // Mutations
  const createAccountMutation = trpc.paperTrading.createAccount.useMutation({
    onSuccess: (newAccount) => {
      toast.success('Account created successfully');
      accountsQuery.refetch();
      setSelectedAccountId(newAccount.id);
    },
    onError: (error) => {
      toast.error(`Failed to create account: ${error.message}`);
    }
  });

  const placeOrderMutation = trpc.paperTrading.placeOrder.useMutation({
    onSuccess: () => {
      toast.success('Order placed successfully');
      accountQuery.refetch();
      positionsQuery.refetch();
      ordersQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Order failed: ${error.message}`);
    }
  });

  const cancelOrderMutation = trpc.paperTrading.cancelOrder.useMutation({
    onSuccess: () => {
      toast.success('Order cancelled');
      ordersQuery.refetch();
    }
  });

  const resetAccountMutation = trpc.paperTrading.resetAccount.useMutation({
    onSuccess: () => {
      toast.success('Account reset to $100,000');
      accountQuery.refetch();
      positionsQuery.refetch();
      ordersQuery.refetch();
      tradesQuery.refetch();
    }
  });

  const account = accountQuery.data;
  const positions = positionsQuery.data || [];
  const orders = ordersQuery.data || [];
  const trades = tradesQuery.data || [];
  const performance = performanceQuery.data;

  const handlePlaceOrder = () => {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (!accountId) {
      toast.error('Please create an account first');
      return;
    }
    placeOrderMutation.mutate({
      accountId,
      symbol: selectedSymbol,
      assetType: 'stock' as const,
      side: orderSide,
      type: orderType,
      quantity: qty,
      price: limitPrice ? parseFloat(limitPrice) : undefined,
      stopPrice: stopPrice ? parseFloat(stopPrice) : undefined
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Wallet className="h-8 w-8 text-green-500" />
              Paper Trading Simulator
            </h1>
            <p className="text-muted-foreground mt-1">
              Practice trading with virtual money - no risk involved
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Show active broker */}
            {hasConnectedBroker && activeBroker && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-card border rounded-lg">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Broker:</span>
                <BrokerBadge size="sm" showStatus={true} showMode={true} />
              </div>
            )}
            <Badge variant="outline" className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              {isPaperMode ? 'Paper Mode' : 'Live Mode'}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => accountId && resetAccountMutation.mutate({ accountId })}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Reset Account
            </Button>
          </div>
        </div>

        {/* Account Summary */}
        {account && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Cash Balance</p>
                    <p className="text-2xl font-bold">{formatCurrency(account.currentBalance)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Initial Balance</p>
                    <p className="text-2xl font-bold">{formatCurrency(account.initialBalance)}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Equity</p>
                    <p className="text-2xl font-bold">{formatCurrency(account.totalEquity)}</p>
                  </div>
                  <Wallet className="h-8 w-8 text-purple-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total P&L</p>
                    <p className={`text-2xl font-bold ${account.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(account.totalPnL)}
                    </p>
                  </div>
                  {account.totalPnL >= 0 ? (
                    <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
                  ) : (
                    <TrendingDown className="h-8 w-8 text-red-500 opacity-50" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="trade" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trade">Place Order</TabsTrigger>
            <TabsTrigger value="positions">Positions ({positions.length})</TabsTrigger>
            <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
            <TabsTrigger value="history">Trade History</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* Place Order Tab */}
          <TabsContent value="trade" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    New Order
                  </CardTitle>
                  <CardDescription>
                    Place a simulated trade order
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Symbol Selection */}
                  <div className="space-y-2">
                    <Label>Symbol</Label>
                    <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {POPULAR_STOCKS.map(symbol => (
                          <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Order Side */}
                  <div className="space-y-2">
                    <Label>Side</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={orderSide === 'buy' ? 'default' : 'outline'}
                        onClick={() => setOrderSide('buy')}
                        className={orderSide === 'buy' ? 'bg-green-600 hover:bg-green-700' : ''}
                      >
                        <ArrowUpRight className="h-4 w-4 mr-1" />
                        Buy
                      </Button>
                      <Button
                        variant={orderSide === 'sell' ? 'default' : 'outline'}
                        onClick={() => setOrderSide('sell')}
                        className={orderSide === 'sell' ? 'bg-red-600 hover:bg-red-700' : ''}
                      >
                        <ArrowDownRight className="h-4 w-4 mr-1" />
                        Sell
                      </Button>
                    </div>
                  </div>

                  {/* Order Type */}
                  <div className="space-y-2">
                    <Label>Order Type</Label>
                    <Select value={orderType} onValueChange={(v) => setOrderType(v as typeof orderType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="market">Market</SelectItem>
                        <SelectItem value="limit">Limit</SelectItem>
                        <SelectItem value="stop">Stop</SelectItem>
                        <SelectItem value="stop_limit">Stop Limit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quantity */}
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      min="1"
                    />
                  </div>

                  {/* Limit Price */}
                  {(orderType === 'limit' || orderType === 'stop_limit') && (
                    <div className="space-y-2">
                      <Label>Limit Price</Label>
                      <Input
                        type="number"
                        value={limitPrice}
                        onChange={(e) => setLimitPrice(e.target.value)}
                        placeholder="Enter limit price"
                        step="0.01"
                      />
                    </div>
                  )}

                  {/* Stop Price */}
                  {(orderType === 'stop_loss' || orderType === 'stop_limit') && (
                    <div className="space-y-2">
                      <Label>Stop Price</Label>
                      <Input
                        type="number"
                        value={stopPrice}
                        onChange={(e) => setStopPrice(e.target.value)}
                        placeholder="Enter stop price"
                        step="0.01"
                      />
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button 
                    onClick={handlePlaceOrder}
                    disabled={placeOrderMutation.isPending}
                    className={`w-full ${orderSide === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                  >
                    {placeOrderMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Placing Order...
                      </>
                    ) : (
                      <>
                        {orderSide === 'buy' ? 'Buy' : 'Sell'} {quantity} {selectedSymbol}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {performance && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="text-sm text-muted-foreground">Total Trades</div>
                          <div className="text-xl font-bold">{performance.totalTrades}</div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="text-sm text-muted-foreground">Win Rate</div>
                          <div className="text-xl font-bold text-green-500">
                            {(performance.winRate * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="text-sm text-muted-foreground">Avg Win</div>
                          <div className="text-xl font-bold text-green-500">
                            {formatCurrency(performance.averageWin)}
                          </div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="text-sm text-muted-foreground">Avg Loss</div>
                          <div className="text-xl font-bold text-red-500">
                            {formatCurrency(performance.averageLoss)}
                          </div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="text-sm text-muted-foreground">Profit Factor</div>
                          <div className="text-xl font-bold">
                            {performance.profitFactor.toFixed(2)}
                          </div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="text-sm text-muted-foreground">Max Drawdown</div>
                          <div className="text-xl font-bold text-red-500">
                            {formatPercent(performance.maxDrawdown * 100)}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="text-sm text-muted-foreground mb-2">Sharpe Ratio</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${
                                performance.sharpeRatio > 1 ? 'bg-green-500' :
                                performance.sharpeRatio > 0 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(Math.max(performance.sharpeRatio * 33, 0), 100)}%` }}
                            />
                          </div>
                          <span className="font-bold">{performance.sharpeRatio.toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Positions Tab */}
          <TabsContent value="positions">
            <Card>
              <CardHeader>
                <CardTitle>Open Positions</CardTitle>
                <CardDescription>Your current holdings</CardDescription>
              </CardHeader>
              <CardContent>
                {positions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wallet className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No open positions</p>
                    <p className="text-sm">Place an order to start trading</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Symbol</th>
                          <th className="text-right p-2">Quantity</th>
                          <th className="text-right p-2">Avg Price</th>
                          <th className="text-right p-2">Current Price</th>
                          <th className="text-right p-2">Market Value</th>
                          <th className="text-right p-2">P&L</th>
                          <th className="text-right p-2">P&L %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {positions.map((position) => (
                          <tr key={position.symbol} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{position.symbol}</td>
                            <td className="p-2 text-right">{position.quantity}</td>
                            <td className="p-2 text-right">{formatCurrency(position.averagePrice)}</td>
                            <td className="p-2 text-right">{formatCurrency(position.currentPrice)}</td>
                            <td className="p-2 text-right">{formatCurrency(position.marketValue)}</td>
                            <td className={`p-2 text-right ${position.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {formatCurrency(position.unrealizedPnL)}
                            </td>
                            <td className={`p-2 text-right ${position.unrealizedPnLPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {formatPercent(position.unrealizedPnLPercent)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Orders</CardTitle>
                <CardDescription>Pending and completed orders</CardDescription>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No orders yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Time</th>
                          <th className="text-left p-2">Symbol</th>
                          <th className="text-left p-2">Side</th>
                          <th className="text-left p-2">Type</th>
                          <th className="text-right p-2">Qty</th>
                          <th className="text-right p-2">Price</th>
                          <th className="text-center p-2">Status</th>
                          <th className="text-center p-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr key={order.id} className="border-b hover:bg-muted/50">
                            <td className="p-2 text-sm">{formatDate(order.createdAt)}</td>
                            <td className="p-2 font-medium">{order.symbol}</td>
                            <td className="p-2">
                              <Badge variant={order.side === 'buy' ? 'default' : 'destructive'}>
                                {order.side.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="p-2 capitalize">{order.type.replace('_', ' ')}</td>
                            <td className="p-2 text-right">{order.quantity}</td>
                            <td className="p-2 text-right">
                              {order.filledPrice ? formatCurrency(order.filledPrice) : 
                               order.price ? formatCurrency(order.price) : 'Market'}
                            </td>
                            <td className="p-2 text-center">
                              <Badge variant={
                                order.status === 'filled' ? 'default' :
                                order.status === 'cancelled' ? 'secondary' :
                                order.status === 'rejected' ? 'destructive' : 'outline'
                              }>
                                {order.status === 'filled' && <CheckCircle className="h-3 w-3 mr-1" />}
                                {order.status === 'cancelled' && <XCircle className="h-3 w-3 mr-1" />}
                                {order.status === 'rejected' && <AlertCircle className="h-3 w-3 mr-1" />}
                                {order.status.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="p-2 text-center">
                              {order.status === 'pending' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => cancelOrderMutation.mutate({ orderId: order.id })}
                                >
                                  Cancel
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trade History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Trade History</CardTitle>
                <CardDescription>Completed trades</CardDescription>
              </CardHeader>
              <CardContent>
                {trades.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No trades yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Time</th>
                          <th className="text-left p-2">Symbol</th>
                          <th className="text-left p-2">Side</th>
                          <th className="text-right p-2">Qty</th>
                          <th className="text-right p-2">Price</th>
                          <th className="text-right p-2">Total</th>
                          <th className="text-right p-2">P&L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trades.map((trade, idx) => (
                          <tr key={trade.orderId + idx} className="border-b hover:bg-muted/50">
                            <td className="p-2 text-sm">{formatDate(trade.timestamp)}</td>
                            <td className="p-2 font-medium">{trade.symbol}</td>
                            <td className="p-2">
                              <Badge variant={trade.side === 'buy' ? 'default' : 'destructive'}>
                                {trade.side.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="p-2 text-right">{trade.quantity}</td>
                            <td className="p-2 text-right">{formatCurrency(trade.price)}</td>
                            <td className="p-2 text-right">{formatCurrency(trade.quantity * trade.price)}</td>
                            <td className={`p-2 text-right ${
                              trade.pnl !== undefined && trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {trade.pnl !== undefined ? formatCurrency(trade.pnl) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Analytics
                </CardTitle>
                <CardDescription>Detailed trading performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {performance ? (
                  <div className="space-y-6">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <div className="text-sm text-muted-foreground">Total Return</div>
                        <div className={`text-2xl font-bold ${performance.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatPercent(performance.totalReturn * 100)}
                        </div>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <div className="text-sm text-muted-foreground">Total Trades</div>
                        <div className="text-2xl font-bold">{performance.totalTrades}</div>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <div className="text-sm text-muted-foreground">Trading Days</div>
                        <div className="text-2xl font-bold">{performance.tradingDays}</div>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <div className="text-sm text-muted-foreground">Largest Win</div>
                        <div className="text-2xl font-bold text-green-500">
                          {formatCurrency(performance.largestWin)}
                        </div>
                      </div>
                    </div>

                    {/* Equity Curve Placeholder */}
                    <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center border border-dashed">
                      <div className="text-center text-muted-foreground">
                        <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Equity curve visualization</p>
                        <p className="text-sm">Track your portfolio growth over time</p>
                      </div>
                    </div>

                    {/* Risk Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-medium mb-3">Risk Metrics</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Sharpe Ratio</span>
                            <span className="font-medium">{performance.sharpeRatio.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Max Drawdown</span>
                            <span className="font-medium text-red-500">{formatPercent(performance.maxDrawdownPercent)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Largest Loss</span>
                            <span className="font-medium text-red-500">{formatCurrency(performance.largestLoss)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Avg Holding Period</span>
                            <span className="font-medium">{performance.averageHoldingPeriod.toFixed(1)} days</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-medium mb-3">Trade Statistics</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Win Rate</span>
                            <span className="font-medium">{(performance.winRate * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Profit Factor</span>
                            <span className="font-medium">{performance.profitFactor.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Avg Win/Loss Ratio</span>
                            <span className="font-medium">
                              {performance.averageLoss !== 0 
                                ? (performance.averageWin / Math.abs(performance.averageLoss)).toFixed(2)
                                : 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Expectancy</span>
                            <span className={`font-medium ${
                              (performance.winRate * performance.averageWin - (1 - performance.winRate) * Math.abs(performance.averageLoss)) >= 0
                                ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {formatCurrency(
                                performance.winRate * performance.averageWin - 
                                (1 - performance.winRate) * Math.abs(performance.averageLoss)
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No performance data yet</p>
                    <p className="text-sm">Start trading to see your performance metrics</p>
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
