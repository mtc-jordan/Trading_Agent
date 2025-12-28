/**
 * Advanced Order Form Component
 * Complete order placement UI with broker-specific options
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Calculator,
  ArrowRight,
  Info
} from 'lucide-react';
import { OrderTypeSelector, type OrderFormData } from './OrderTypeSelector';
import { useBroker } from '@/contexts/BrokerContext';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface AdvancedOrderFormProps {
  symbol: string;
  currentPrice?: number;
  onOrderPlaced?: (order: any) => void;
  className?: string;
}

interface OrderPreview {
  estimatedCost: number;
  estimatedFees: number;
  estimatedTotal: number;
  marginRequired?: number;
  buyingPower?: number;
  riskAmount?: number;
  riskPercent?: number;
}

export function AdvancedOrderForm({
  symbol,
  currentPrice = 0,
  onOrderPlaced,
  className = '',
}: AdvancedOrderFormProps) {
  const { activeBroker, connectedBrokers, getBrokerName } = useBroker();
  
  // State
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderData, setOrderData] = useState<OrderFormData | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderPreview, setOrderPreview] = useState<OrderPreview | null>(null);
  const [dollarAmount, setDollarAmount] = useState<string>('');
  const [useDollarAmount, setUseDollarAmount] = useState(false);
  
  // Active connection is the activeBroker itself
  const activeConnection = activeBroker;
  
  // Get broker type for order form
  const brokerType = useMemo(() => {
    if (!activeConnection) return 'alpaca';
    return activeConnection.brokerType;
  }, [activeConnection]);
  
  // Get account balance
  const { data: balance } = trpc.broker.getBalance.useQuery(
    { connectionId: activeBroker?.id || '' },
    { enabled: !!activeBroker?.id }
  );
  
  // Place order mutation
  const placeOrderMutation = trpc.broker.placeOrder.useMutation({
    onSuccess: (result) => {
      toast.success('Order placed successfully!', {
        description: `Order ID: ${result.orderId}`,
      });
      setShowConfirmDialog(false);
      onOrderPlaced?.(result);
    },
    onError: (error) => {
      toast.error('Failed to place order', {
        description: error.message,
      });
    },
  });
  
  // Calculate order preview
  useEffect(() => {
    if (!orderData || !currentPrice) {
      setOrderPreview(null);
      return;
    }
    
    const quantity = orderData.quantity || 0;
    const price = orderData.limitPrice || currentPrice;
    const estimatedCost = quantity * price;
    const estimatedFees = estimatedCost * 0.001; // 0.1% estimated fees
    const estimatedTotal = side === 'buy' 
      ? estimatedCost + estimatedFees 
      : estimatedCost - estimatedFees;
    
    // Calculate risk for bracket orders
    let riskAmount: number | undefined;
    let riskPercent: number | undefined;
    
    if (orderData.orderType === 'bracket' && orderData.stopLossPrice) {
      const entryPrice = orderData.limitPrice || currentPrice;
      const stopLoss = orderData.stopLossPrice;
      riskAmount = Math.abs(entryPrice - stopLoss) * quantity;
      riskPercent = (riskAmount / estimatedCost) * 100;
    }
    
    setOrderPreview({
      estimatedCost,
      estimatedFees,
      estimatedTotal,
      buyingPower: balance?.buyingPower,
      marginRequired: estimatedCost * 0.5, // 50% margin requirement
      riskAmount,
      riskPercent,
    });
  }, [orderData, currentPrice, side, balance]);
  
  // Calculate quantity from dollar amount
  useEffect(() => {
    if (useDollarAmount && dollarAmount && currentPrice) {
      const amount = parseFloat(dollarAmount);
      if (!isNaN(amount) && amount > 0) {
        const calculatedQuantity = Math.floor((amount / currentPrice) * 10000) / 10000;
        setOrderData(prev => prev ? { ...prev, quantity: calculatedQuantity } : null);
      }
    }
  }, [dollarAmount, currentPrice, useDollarAmount]);
  
  // Handle order change from OrderTypeSelector
  const handleOrderChange = (order: OrderFormData) => {
    setOrderData(order);
  };
  
  // Handle order submission
  const handleSubmit = (order: OrderFormData) => {
    setOrderData(order);
    setShowConfirmDialog(true);
  };
  
  // Confirm and place order
  const confirmOrder = async () => {
    if (!orderData || !activeBroker?.id) return;
    
    setIsSubmitting(true);
    
    try {
      await placeOrderMutation.mutateAsync({
        connectionId: activeBroker.id,
        symbol,
        side: orderData.side,
        orderType: orderData.orderType as any,
        quantity: orderData.quantity || 0,
        price: orderData.limitPrice,
        stopPrice: orderData.stopPrice,
        trailPercent: orderData.trailPercent,
        timeInForce: orderData.timeInForce as any,
        extendedHours: orderData.extendedHours,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!activeBroker?.id) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Broker Connected</h3>
            <p className="text-muted-foreground mb-4">
              Connect a broker to place orders
            </p>
            <Button variant="outline" onClick={() => window.location.href = '/settings/brokers'}>
              Connect Broker
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Side Toggle */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Button
              variant={side === 'buy' ? 'default' : 'outline'}
              className={`flex-1 ${side === 'buy' ? 'bg-green-600 hover:bg-green-700' : ''}`}
              onClick={() => setSide('buy')}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Buy
            </Button>
            <Button
              variant={side === 'sell' ? 'default' : 'outline'}
              className={`flex-1 ${side === 'sell' ? 'bg-red-600 hover:bg-red-700' : ''}`}
              onClick={() => setSide('sell')}
            >
              <TrendingDown className="h-4 w-4 mr-2" />
              Sell
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Dollar Amount Toggle */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="dollar-mode">Order by Dollar Amount</Label>
            </div>
            <Switch
              id="dollar-mode"
              checked={useDollarAmount}
              onCheckedChange={setUseDollarAmount}
            />
          </div>
          
          {useDollarAmount && (
            <div className="mt-3">
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={dollarAmount}
                  onChange={(e) => setDollarAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="pl-9"
                />
              </div>
              {dollarAmount && currentPrice && (
                <p className="text-xs text-muted-foreground mt-1">
                  ≈ {(parseFloat(dollarAmount) / currentPrice).toFixed(4)} shares at ${currentPrice.toFixed(2)}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Order Type Selector */}
      <OrderTypeSelector
        brokerType={brokerType}
        side={side}
        symbol={symbol}
        currentPrice={currentPrice}
        onOrderChange={handleOrderChange}
        onSubmit={handleSubmit}
      />
      
      {/* Order Preview */}
      {orderPreview && orderData?.quantity && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Order Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Estimated Cost</span>
              <span>${orderPreview.estimatedCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Estimated Fees</span>
              <span>${orderPreview.estimatedFees.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Estimated Total</span>
              <span className={side === 'buy' ? 'text-red-500' : 'text-green-500'}>
                {side === 'buy' ? '-' : '+'}${orderPreview.estimatedTotal.toFixed(2)}
              </span>
            </div>
            
            {orderPreview.buyingPower !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Buying Power</span>
                <span>${orderPreview.buyingPower.toFixed(2)}</span>
              </div>
            )}
            
            {orderPreview.riskAmount !== undefined && (
              <>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Risk Amount</span>
                  <span className="text-yellow-500">${orderPreview.riskAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Risk %</span>
                  <span className="text-yellow-500">{orderPreview.riskPercent?.toFixed(2)}%</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Order</DialogTitle>
            <DialogDescription>
              Please review your order details before submitting.
            </DialogDescription>
          </DialogHeader>
          
          {orderData && (
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Order Summary</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Action:</span>
                      <Badge variant={side === 'buy' ? 'default' : 'destructive'}>
                        {side.toUpperCase()} {symbol}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Order Type:</span>
                      <span className="capitalize">{orderData.orderType.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quantity:</span>
                      <span>{orderData.quantity}</span>
                    </div>
                    {orderData.limitPrice && (
                      <div className="flex justify-between">
                        <span>Limit Price:</span>
                        <span>${orderData.limitPrice.toFixed(2)}</span>
                      </div>
                    )}
                    {orderData.stopPrice && (
                      <div className="flex justify-between">
                        <span>Stop Price:</span>
                        <span>${orderData.stopPrice.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Time in Force:</span>
                      <span className="uppercase">{orderData.timeInForce}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Broker:</span>
                      <span>{getBrokerName(brokerType)}</span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
              
              {activeConnection?.isPaper && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Paper Trading</AlertTitle>
                  <AlertDescription>
                    This order will be placed in paper trading mode. No real money will be used.
                  </AlertDescription>
                </Alert>
              )}
              
              {!activeConnection?.isPaper && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Live Trading</AlertTitle>
                  <AlertDescription>
                    This order will be placed with real money. Please confirm you want to proceed.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              onClick={confirmOrder} 
              disabled={isSubmitting}
              variant={side === 'buy' ? 'default' : 'destructive'}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Placing Order...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm {side === 'buy' ? 'Buy' : 'Sell'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdvancedOrderForm;
