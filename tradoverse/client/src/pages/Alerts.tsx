/**
 * Alert Management Page
 * Create and manage price alerts, regime change notifications, and sentiment warnings
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
import { Switch } from '@/components/ui/switch';
import { 
  Bell, 
  BellRing, 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Percent,
  BarChart3,
  MessageSquare,
  Mail,
  Smartphone
} from 'lucide-react';
import { toast } from 'sonner';

const POPULAR_SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META', 'BTC', 'ETH', 'SOL'];

export default function Alerts() {
  const [newAlertSymbol, setNewAlertSymbol] = useState('AAPL');
  const [newAlertType, setNewAlertType] = useState<'price_above' | 'price_below' | 'percent_change' | 'volume_spike'>('price_above');
  const [newAlertValue, setNewAlertValue] = useState('');
  const [newAlertAssetType, setNewAlertAssetType] = useState<'stock' | 'crypto'>('stock');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);

  // Queries
  const priceAlertsQuery = trpc.alerts.getPriceAlerts.useQuery();
  const alertHistoryQuery = trpc.alerts.getHistory.useQuery({ limit: 50 });

  // Mutations
  const createPriceAlertMutation = trpc.alerts.createPriceAlert.useMutation({
    onSuccess: () => {
      toast.success('Alert created successfully');
      priceAlertsQuery.refetch();
      setNewAlertValue('');
    },
    onError: (error) => {
      toast.error(`Failed to create alert: ${error.message}`);
    }
  });

  const deletePriceAlertMutation = trpc.alerts.deletePriceAlert.useMutation({
    onSuccess: () => {
      toast.success('Alert deleted');
      priceAlertsQuery.refetch();
    }
  });

  const markAsReadMutation = trpc.alerts.markAsRead.useMutation({
    onSuccess: () => {
      alertHistoryQuery.refetch();
    }
  });

  const priceAlerts = priceAlertsQuery.data || [];
  const alertHistory = alertHistoryQuery.data || [];

  const handleCreateAlert = () => {
    const value = parseFloat(newAlertValue);
    if (isNaN(value) || value <= 0) {
      toast.error('Please enter a valid target value');
      return;
    }

    createPriceAlertMutation.mutate({
      symbol: newAlertSymbol,
      assetType: newAlertAssetType,
      alertType: newAlertType,
      targetValue: value,
      notifyEmail,
      notifyPush
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString();
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'price_above': return 'Price Above';
      case 'price_below': return 'Price Below';
      case 'percent_change': return 'Percent Change';
      case 'volume_spike': return 'Volume Spike';
      case 'regime_change': return 'Regime Change';
      case 'sentiment_shift': return 'Sentiment Shift';
      default: return type;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'price_above': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'price_below': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'percent_change': return <Percent className="h-4 w-4 text-blue-500" />;
      case 'volume_spike': return <BarChart3 className="h-4 w-4 text-purple-500" />;
      case 'regime_change': return <Activity className="h-4 w-4 text-orange-500" />;
      case 'sentiment_shift': return <MessageSquare className="h-4 w-4 text-cyan-500" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const unreadCount = alertHistory.filter((a: { isRead: boolean }) => !a.isRead).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bell className="h-8 w-8 text-yellow-500" />
              Alert Center
            </h1>
            <p className="text-muted-foreground mt-1">
              Create and manage trading alerts for price movements, regime changes, and sentiment shifts
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <BellRing className="h-3 w-3" />
                {unreadCount} New
              </Badge>
            )}
          </div>
        </div>

        <Tabs defaultValue="create" className="space-y-4">
          <TabsList>
            <TabsTrigger value="create">Create Alert</TabsTrigger>
            <TabsTrigger value="active">Active Alerts ({priceAlerts.length})</TabsTrigger>
            <TabsTrigger value="history">Alert History ({alertHistory.length})</TabsTrigger>
          </TabsList>

          {/* Create Alert Tab */}
          <TabsContent value="create" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    New Price Alert
                  </CardTitle>
                  <CardDescription>
                    Get notified when a stock or crypto reaches your target price
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Asset Type */}
                  <div className="space-y-2">
                    <Label>Asset Type</Label>
                    <Select value={newAlertAssetType} onValueChange={(v) => setNewAlertAssetType(v as 'stock' | 'crypto')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stock">Stock</SelectItem>
                        <SelectItem value="crypto">Cryptocurrency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Symbol */}
                  <div className="space-y-2">
                    <Label>Symbol</Label>
                    <Select value={newAlertSymbol} onValueChange={setNewAlertSymbol}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {POPULAR_SYMBOLS.map(symbol => (
                          <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Alert Type */}
                  <div className="space-y-2">
                    <Label>Alert Type</Label>
                    <Select value={newAlertType} onValueChange={(v) => setNewAlertType(v as typeof newAlertType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="price_above">Price Above</SelectItem>
                        <SelectItem value="price_below">Price Below</SelectItem>
                        <SelectItem value="percent_change">Percent Change</SelectItem>
                        <SelectItem value="volume_spike">Volume Spike</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Target Value */}
                  <div className="space-y-2">
                    <Label>
                      {newAlertType === 'percent_change' ? 'Percent Change (%)' :
                       newAlertType === 'volume_spike' ? 'Volume Multiplier' :
                       'Target Price ($)'}
                    </Label>
                    <Input
                      type="number"
                      value={newAlertValue}
                      onChange={(e) => setNewAlertValue(e.target.value)}
                      placeholder={
                        newAlertType === 'percent_change' ? 'e.g., 5 for 5%' :
                        newAlertType === 'volume_spike' ? 'e.g., 2 for 2x average' :
                        'Enter target price'
                      }
                      step="0.01"
                    />
                  </div>

                  {/* Notification Options */}
                  <div className="space-y-3 pt-2">
                    <Label>Notification Methods</Label>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Email Notification</span>
                      </div>
                      <Switch checked={notifyEmail} onCheckedChange={setNotifyEmail} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Push Notification</span>
                      </div>
                      <Switch checked={notifyPush} onCheckedChange={setNotifyPush} />
                    </div>
                  </div>

                  {/* Create Button */}
                  <Button 
                    onClick={handleCreateAlert}
                    disabled={createPriceAlertMutation.isPending}
                    className="w-full"
                  >
                    {createPriceAlertMutation.isPending ? (
                      'Creating...'
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Alert
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Alert Templates */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Quick Templates
                  </CardTitle>
                  <CardDescription>
                    Common alert configurations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => {
                      setNewAlertType('price_below');
                      setNewAlertValue('');
                      toast.info('Set your stop-loss price target');
                    }}
                  >
                    <TrendingDown className="h-4 w-4 mr-2 text-red-500" />
                    Stop-Loss Alert
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => {
                      setNewAlertType('price_above');
                      setNewAlertValue('');
                      toast.info('Set your take-profit price target');
                    }}
                  >
                    <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
                    Take-Profit Alert
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => {
                      setNewAlertType('percent_change');
                      setNewAlertValue('5');
                      toast.info('Alert when price moves 5%');
                    }}
                  >
                    <Percent className="h-4 w-4 mr-2 text-blue-500" />
                    5% Movement Alert
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => {
                      setNewAlertType('volume_spike');
                      setNewAlertValue('2');
                      toast.info('Alert when volume is 2x average');
                    }}
                  >
                    <BarChart3 className="h-4 w-4 mr-2 text-purple-500" />
                    Volume Spike Alert
                  </Button>

                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-3">Alert Types Explained</h4>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p><strong>Price Above/Below:</strong> Triggers when price crosses your target</p>
                      <p><strong>Percent Change:</strong> Triggers on significant price movement</p>
                      <p><strong>Volume Spike:</strong> Triggers on unusual trading volume</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Active Alerts Tab */}
          <TabsContent value="active">
            <Card>
              <CardHeader>
                <CardTitle>Active Alerts</CardTitle>
                <CardDescription>Your currently active price alerts</CardDescription>
              </CardHeader>
              <CardContent>
                {priceAlerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No active alerts</p>
                    <p className="text-sm">Create an alert to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {priceAlerts.map((alert) => (
                      <div 
                        key={alert.id} 
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          {getAlertIcon(alert.alertType)}
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {alert.symbol}
                              <Badge variant="outline" className="text-xs">
                                {alert.assetType}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {getAlertTypeLabel(alert.alertType)}: {
                                alert.alertType === 'percent_change' ? `${alert.targetValue}%` :
                                alert.alertType === 'volume_spike' ? `${alert.targetValue}x` :
                                formatCurrency(alert.targetValue)
                              }
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            {alert.notifyEmail && <Mail className="h-4 w-4" />}
                            {alert.notifyPush && <Smartphone className="h-4 w-4" />}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deletePriceAlertMutation.mutate({ alertId: alert.id })}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alert History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Alert History</CardTitle>
                <CardDescription>Previously triggered alerts</CardDescription>
              </CardHeader>
              <CardContent>
                {alertHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No alert history</p>
                    <p className="text-sm">Triggered alerts will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {alertHistory.map((alert) => (
                      <div 
                        key={alert.id} 
                        className={`flex items-center justify-between p-4 rounded-lg ${
                          alert.isRead ? 'bg-muted/30' : 'bg-muted/50 border-l-4 border-yellow-500'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {getAlertIcon(alert.alertType)}
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {alert.symbol}
                              {!alert.isRead && (
                                <Badge variant="secondary" className="text-xs">New</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {alert.message}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {alert.createdAt ? formatDate(alert.createdAt) : 'N/A'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!alert.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsReadMutation.mutate({ alertHistoryId: String(alert.id) })}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
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
