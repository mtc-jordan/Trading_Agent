import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/lib/trpc';
import { 
  Bell, BellRing, Plus, Trash2, Edit, Check, X, AlertTriangle,
  TrendingUp, TrendingDown, Activity, Target, Clock, Mail, Smartphone
} from 'lucide-react';

type AlertType = 'entry_signal' | 'exit_signal' | 'price_target' | 'stop_loss' | 'indicator_crossover' | 'volume_spike' | 'volatility_alert' | 'custom';
type AlertPriority = 'low' | 'medium' | 'high' | 'critical';
type AlertStatus = 'active' | 'triggered' | 'expired' | 'cancelled';

interface Alert {
  id: string;
  symbol: string;
  type: AlertType;
  priority: AlertPriority;
  status: AlertStatus;
  message: string;
  conditions: Array<{
    type: string;
    indicator?: string;
    operator: string;
    value: number | [number, number];
  }>;
  triggerCount: number;
  lastTriggeredAt?: number;
  createdAt: number;
}

interface AlertTemplate {
  id: string;
  name: string;
  description: string;
  type: AlertType;
  category: string;
}

export default function StrategyAlerts() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [symbol, setSymbol] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [priority, setPriority] = useState<AlertPriority>('medium');
  const [enableEmail, setEnableEmail] = useState(true);
  const [enablePush, setEnablePush] = useState(true);

  // Fetch alerts
  const { data: alertsData } = trpc.broker.getAlerts.useQuery();
  const { data: templatesData } = trpc.broker.getAlertTemplates.useQuery();
  const { data: summaryData } = trpc.broker.getAlertSummary.useQuery();
  const { data: triggersData } = trpc.broker.getRecentTriggers.useQuery({ limit: 10 });

  // Mutations
  const createAlertMutation = trpc.broker.createAlertFromTemplate.useMutation({
    onSuccess: () => {
      setIsCreateDialogOpen(false);
      setSymbol('');
      setSelectedTemplate('');
    },
  });

  const cancelAlertMutation = trpc.broker.cancelAlert.useMutation();
  const deleteAlertMutation = trpc.broker.deleteAlert.useMutation();
  const acknowledgeTriggerMutation = trpc.broker.acknowledgeTrigger.useMutation();

  const alerts = alertsData || [];
  const templates = templatesData || [];
  const summary = summaryData;
  const triggers = triggersData || [];

  const handleCreateAlert = () => {
    if (!selectedTemplate || !symbol) return;
    
    const channels: string[] = [];
    if (enableEmail) channels.push('email');
    if (enablePush) channels.push('push');
    channels.push('in_app');

    createAlertMutation.mutate({
      templateId: selectedTemplate,
      symbol: symbol.toUpperCase(),
      strategyId: 'manual',
      strategyName: 'Manual Alert',
      priority,
      notificationChannels: channels,
    });
  };

  const getTypeIcon = (type: AlertType) => {
    switch (type) {
      case 'entry_signal': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'exit_signal': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'stop_loss': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'price_target': return <Target className="h-4 w-4 text-blue-500" />;
      case 'indicator_crossover': return <Activity className="h-4 w-4 text-purple-500" />;
      case 'volume_spike': return <Activity className="h-4 w-4 text-orange-500" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: AlertPriority) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: AlertStatus) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500/20 text-green-500">Active</Badge>;
      case 'triggered': return <Badge className="bg-blue-500/20 text-blue-500">Triggered</Badge>;
      case 'expired': return <Badge className="bg-gray-500/20 text-gray-500">Expired</Badge>;
      case 'cancelled': return <Badge className="bg-red-500/20 text-red-500">Cancelled</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Strategy Alerts</h1>
            <p className="text-muted-foreground">
              Get notified when market conditions match your strategy rules
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Alert
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Alert</DialogTitle>
                <DialogDescription>
                  Set up a new alert based on a template or custom conditions
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Alert Template</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template: AlertTemplate) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(template.type)}
                            <span>{template.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTemplate && (
                    <p className="text-sm text-muted-foreground">
                      {templates.find((t: AlertTemplate) => t.id === selectedTemplate)?.description}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Symbol</Label>
                  <Input
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="AAPL, BTC, ETH..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as AlertPriority)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Notification Channels</Label>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>Email</span>
                    </div>
                    <Switch checked={enableEmail} onCheckedChange={setEnableEmail} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      <span>Push Notification</span>
                    </div>
                    <Switch checked={enablePush} onCheckedChange={setEnablePush} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAlert} disabled={!selectedTemplate || !symbol}>
                  Create Alert
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Alerts</p>
                    <p className="text-2xl font-bold">{summary.activeAlerts}</p>
                  </div>
                  <Bell className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Triggered Today</p>
                    <p className="text-2xl font-bold">{summary.triggeredToday}</p>
                  </div>
                  <BellRing className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">This Week</p>
                    <p className="text-2xl font-bold">{summary.triggeredThisWeek}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Alerts</p>
                    <p className="text-2xl font-bold">{summary.totalAlerts}</p>
                  </div>
                  <Activity className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Active Alerts</TabsTrigger>
            <TabsTrigger value="triggers">Recent Triggers</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          {/* Active Alerts Tab */}
          <TabsContent value="active" className="space-y-4">
            {alerts.filter((a: Alert) => a.status === 'active').length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Alerts</h3>
                  <p className="text-muted-foreground text-center max-w-md mb-4">
                    Create alerts to get notified when market conditions match your trading criteria.
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Alert
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {alerts.filter((a: Alert) => a.status === 'active').map((alert: Alert) => (
                  <Card key={alert.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`w-2 h-2 rounded-full mt-2 ${getPriorityColor(alert.priority)}`} />
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {getTypeIcon(alert.type)}
                              <span className="font-semibold">{alert.symbol}</span>
                              {getStatusBadge(alert.status)}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Triggered {alert.triggerCount} times</span>
                              {alert.lastTriggeredAt && (
                                <span>Last: {new Date(alert.lastTriggeredAt).toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => cancelAlertMutation.mutate({ alertId: alert.id })}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteAlertMutation.mutate({ alertId: alert.id })}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Recent Triggers Tab */}
          <TabsContent value="triggers" className="space-y-4">
            {triggers.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BellRing className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Recent Triggers</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    When your alerts are triggered, they will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {triggers.map((trigger: any) => (
                  <Card key={trigger.id} className={trigger.acknowledged ? 'opacity-60' : ''}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <BellRing className="h-5 w-5 text-yellow-500 mt-0.5" />
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{trigger.alert?.symbol}</span>
                              <Badge variant="outline">{trigger.alert?.type}</Badge>
                              {trigger.acknowledged && (
                                <Badge className="bg-green-500/20 text-green-500">
                                  <Check className="h-3 w-3 mr-1" />
                                  Acknowledged
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              Price: ${trigger.price?.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(trigger.triggeredAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {!trigger.acknowledged && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => acknowledgeTriggerMutation.mutate({ triggerId: trigger.id })}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template: AlertTemplate) => (
                <Card key={template.id} className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(template.type)}
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </div>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{template.category}</Badge>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedTemplate(template.id);
                          setIsCreateDialogOpen(true);
                        }}
                      >
                        Use Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
