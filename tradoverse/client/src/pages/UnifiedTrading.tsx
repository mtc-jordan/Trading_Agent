/**
 * Unified Trading Interface
 * 
 * Multi-broker trading interface supporting:
 * - Order placement (market, limit, stop, etc.)
 * - Position management
 * - Portfolio overview
 */

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  AlertTriangle,
  Loader2,
  RefreshCw,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Wallet,
  Activity,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import SmartOrderRouter from '@/components/SmartOrderRouter';

type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop';
type TimeInForce = 'day' | 'gtc' | 'ioc' | 'fok';

export default function UnifiedTrading() {
  // Order form state
  const [symbol, setSymbol] = useState('');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [quantity, setQuantity] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [trailPercent, setTrailPercent] = useState('');
  const [timeInForce, setTimeInForce] = useState<TimeInForce>('day');
  const [extendedHours, setExtendedHours] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [selectedBrokerType, setSelectedBrokerType] = useState<string>('');
  const [useSmartRouting, setUseSmartRouting] = useState(true);
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState<string | null>(null);
  
  // Fetch data
  const { data: connections } = trpc.broker.getConnections.useQuery();
  const { data: positions, refetch: refetchPositions } = trpc.broker.getPositions.useQuery(
    { connectionId: selectedConnection },
    { enabled: !!selectedConnection }
  );
  const { data: orders, refetch: refetchOrders } = trpc.broker.getOrders.useQuery(
    { connectionId: selectedConnection },
    { enabled: !!selectedConnection }
  );
  
  // Mutations
  const placeOrderMutation = trpc.broker.placeOrder.useMutation({
    onSuccess: () => {
      toast.success('Order placed successfully!');
      refetchOrders();
      refetchPositions();
      // Reset form
      setQuantity('');
      setLimitPrice('');
      setStopPrice('');
    },
    onError: (error: any) => {
      toast.error(`Order failed: ${error.message}`);
    },
  });
  
  const cancelOrderMutation = trpc.broker.cancelOrder.useMutation({
    onSuccess: () => {
      toast.success('Order cancelled');
      refetchOrders();
      setShowCancelDialog(null);
    },
    onError: (error: any) => {
      toast.error(`Cancel failed: ${error.message}`);
    },
  });

  // Set default connection (only if smart routing is disabled)
  useEffect(() => {
    if (connections && connections.length > 0 && !selectedConnection && !useSmartRouting) {
      const defaultConn = connections.find((c: any) => c.isActive) || connections[0];
      setSelectedConnection(defaultConn.id);
    }
  }, [connections, selectedConnection, useSmartRouting]);

  // Handle smart routing broker selection
  const handleSmartRouterSelect = (connectionId: string, brokerType: string) => {
    setSelectedConnection(connectionId);
    setSelectedBrokerType(brokerType);
  };

  const handlePlaceOrder = async () => {
    if (!symbol || !quantity || !selectedConnection) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await placeOrderMutation.mutateAsync({
        connectionId: selectedConnection,
        symbol: symbol.toUpperCase(),
        side,
        orderType,
        quantity: parseFloat(quantity),
        price: limitPrice ? parseFloat(limitPrice) : undefined,
        stopPrice: stopPrice ? parseFloat(stopPrice) : undefined,
        trailPercent: trailPercent ? parseFloat(trailPercent) : undefined,
        timeInForce,
        extendedHours,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    await cancelOrderMutation.mutateAsync({
      connectionId: selectedConnection,
      orderId,
    });
  };

  // Calculate portfolio totals
  const portfolioValue = positions?.reduce((sum: number, p: any) => sum + (p.marketValue || 0), 0) || 0;
  const totalPL = positions?.reduce((sum: number, p: any) => sum + (p.unrealizedPL || 0), 0) || 0;
  const totalPLPercent = portfolioValue > 0 ? (totalPL / portfolioValue) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Trading</h1>
            <p className="text-muted-foreground mt-1">
              Smart order routing automatically selects the best broker
            </p>
          </div>
          
          {/* Current Broker Badge */}
          {selectedConnection && selectedBrokerType && (
            <Badge variant="outline" className="gap-2 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              {selectedBrokerType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              {connections?.find((c: any) => c.id === selectedConnection)?.isPaper && ' (Paper)'}
            </Badge>
          )}
        </div>

        {!connections || connections.length === 0 ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please connect a broker first to start trading. Go to the Brokers page to connect.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Form */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Place Order
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Symbol */}
                <div className="space-y-2">
                  <Label>Symbol</Label>
                  <Input
                    placeholder="AAPL, BTC, ETH..."
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  />
                </div>

                {/* Smart Order Router */}
                {connections && connections.length > 0 && (
                  <SmartOrderRouter
                    symbol={symbol}
                    connections={connections.map((c: any) => ({
                      id: c.id,
                      brokerType: c.brokerType,
                      isPaper: c.isPaper,
                      isActive: c.isActive,
                    }))}
                    onBrokerSelected={handleSmartRouterSelect}
                    selectedConnectionId={selectedConnection}
                    showDetails={true}
                  />
                )}

                {/* Side */}
                <div className="space-y-2">
                  <Label>Side</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={side === 'buy' ? 'default' : 'outline'}
                      className={side === 'buy' ? 'bg-green-600 hover:bg-green-700' : ''}
                      onClick={() => setSide('buy')}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Buy
                    </Button>
                    <Button
                      variant={side === 'sell' ? 'default' : 'outline'}
                      className={side === 'sell' ? 'bg-red-600 hover:bg-red-700' : ''}
                      onClick={() => setSide('sell')}
                    >
                      <TrendingDown className="h-4 w-4 mr-2" />
                      Sell
                    </Button>
                  </div>
                </div>

                {/* Order Type */}
                <div className="space-y-2">
                  <Label>Order Type</Label>
                  <Select value={orderType} onValueChange={(v) => setOrderType(v as OrderType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="market">Market</SelectItem>
                      <SelectItem value="limit">Limit</SelectItem>
                      <SelectItem value="stop">Stop</SelectItem>
                      <SelectItem value="stop_limit">Stop Limit</SelectItem>
                      <SelectItem value="trailing_stop">Trailing Stop</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Quantity */}
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>

                {/* Limit Price */}
                {(orderType === 'limit' || orderType === 'stop_limit') && (
                  <div className="space-y-2">
                    <Label>Limit Price</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                    />
                  </div>
                )}

                {/* Stop Price */}
                {(orderType === 'stop' || orderType === 'stop_limit') && (
                  <div className="space-y-2">
                    <Label>Stop Price</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={stopPrice}
                      onChange={(e) => setStopPrice(e.target.value)}
                    />
                  </div>
                )}

                {/* Trail Percent */}
                {orderType === 'trailing_stop' && (
                  <div className="space-y-2">
                    <Label>Trail Percent (%)</Label>
                    <Input
                      type="number"
                      placeholder="1.0"
                      value={trailPercent}
                      onChange={(e) => setTrailPercent(e.target.value)}
                    />
                  </div>
                )}

                {/* Time in Force */}
                <div className="space-y-2">
                  <Label>Time in Force</Label>
                  <Select value={timeInForce} onValueChange={(v) => setTimeInForce(v as TimeInForce)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="gtc">Good Till Cancelled</SelectItem>
                      <SelectItem value="ioc">Immediate or Cancel</SelectItem>
                      <SelectItem value="fok">Fill or Kill</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Extended Hours */}
                <div className="flex items-center justify-between">
                  <Label>Extended Hours</Label>
                  <Switch
                    checked={extendedHours}
                    onCheckedChange={setExtendedHours}
                  />
                </div>

                <Separator />

                {/* Submit Button */}
                <Button
                  className={`w-full ${side === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting || !symbol || !quantity}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {side === 'buy' ? 'Buy' : 'Sell'} {symbol || 'Symbol'}
                </Button>
              </CardContent>
            </Card>

            {/* Portfolio & Orders */}
            <div className="lg:col-span-2 space-y-6">
              {/* Portfolio Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Wallet className="h-4 w-4" />
                      <span className="text-sm">Portfolio Value</span>
                    </div>
                    <p className="text-2xl font-bold">${portfolioValue.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-sm">Total P&L</span>
                    </div>
                    <p className={`text-2xl font-bold ${totalPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {totalPL >= 0 ? '+' : ''}{totalPL.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <BarChart3 className="h-4 w-4" />
                      <span className="text-sm">P&L %</span>
                    </div>
                    <p className={`text-2xl font-bold ${totalPLPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {totalPLPercent >= 0 ? '+' : ''}{totalPLPercent.toFixed(2)}%
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="positions">
                <TabsList>
                  <TabsTrigger value="positions">Positions ({positions?.length || 0})</TabsTrigger>
                  <TabsTrigger value="orders">Orders ({orders?.length || 0})</TabsTrigger>
                </TabsList>

                {/* Positions */}
                <TabsContent value="positions" className="space-y-4">
                  {positions && positions.length > 0 ? (
                    <div className="space-y-2">
                      {positions.map((position: any, index: number) => (
                        <Card key={index}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div>
                                  <h4 className="font-semibold">{position.symbol}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {position.quantity} shares @ ${position.avgEntryPrice?.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">${position.marketValue?.toLocaleString()}</p>
                                <p className={`text-sm ${position.unrealizedPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {position.unrealizedPL >= 0 ? '+' : ''}${position.unrealizedPL?.toFixed(2)}
                                  ({position.unrealizedPLPercent?.toFixed(2)}%)
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No open positions
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Orders */}
                <TabsContent value="orders" className="space-y-4">
                  {orders && orders.length > 0 ? (
                    <div className="space-y-2">
                      {orders.map((order: any) => (
                        <Card key={order.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <Badge variant={order.side === 'buy' ? 'default' : 'destructive'}>
                                  {order.side.toUpperCase()}
                                </Badge>
                                <div>
                                  <h4 className="font-semibold">{order.symbol}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {order.quantity} shares • {order.orderType}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <Badge variant="outline">{order.status}</Badge>
                                {order.status === 'open' && (
                                  <Dialog open={showCancelDialog === order.id} onOpenChange={(open) => setShowCancelDialog(open ? order.id : null)}>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <XCircle className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Cancel Order</DialogTitle>
                                        <DialogDescription>
                                          Are you sure you want to cancel this order?
                                        </DialogDescription>
                                      </DialogHeader>
                                      <DialogFooter>
                                        <Button variant="outline" onClick={() => setShowCancelDialog(null)}>
                                          Keep Order
                                        </Button>
                                        <Button 
                                          variant="destructive" 
                                          onClick={() => handleCancelOrder(order.id)}
                                          disabled={cancelOrderMutation.isPending}
                                        >
                                          {cancelOrderMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                          ) : null}
                                          Cancel Order
                                        </Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No orders
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
