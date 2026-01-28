/**
 * Enhanced Routing Preferences Component
 * 
 * Features:
 * - Broker priority configuration with drag-and-drop reordering
 * - Symbol-specific routing rules
 * - Advanced routing conditions (time-based, volume-based)
 * - Fee comparison display
 * - Execution speed metrics
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { 
  ArrowUpDown, 
  TrendingUp, 
  Coins, 
  Globe, 
  BarChart3, 
  Zap,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2,
  GripVertical,
  Plus,
  Trash2,
  Clock,
  DollarSign,
  Activity,
  Settings2,
  ChevronUp,
  ChevronDown,
  Target,
  Shield,
  Gauge,
  Filter
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

// Asset class configuration
const ASSET_CLASSES = [
  {
    id: 'us_equity',
    name: 'US Stocks',
    description: 'NYSE, NASDAQ listed equities',
    icon: TrendingUp,
    defaultBrokers: ['alpaca', 'interactive_brokers'],
  },
  {
    id: 'crypto',
    name: 'Cryptocurrency',
    description: 'Bitcoin, Ethereum, and altcoins',
    icon: Coins,
    defaultBrokers: ['binance', 'coinbase', 'alpaca'],
  },
  {
    id: 'forex',
    name: 'Forex',
    description: 'Currency pairs (EUR/USD, GBP/USD)',
    icon: Globe,
    defaultBrokers: ['interactive_brokers'],
  },
  {
    id: 'options',
    name: 'Options',
    description: 'Stock and index options',
    icon: BarChart3,
    defaultBrokers: ['interactive_brokers'],
  },
] as const;

// Broker metadata with detailed info
const BROKER_INFO: Record<string, { 
  name: string; 
  icon: string; 
  color: string;
  fees: { stocks: string; crypto: string; options: string };
  executionSpeed: number; // 1-100 score
  reliability: number; // 1-100 score
  features: string[];
}> = {
  alpaca: { 
    name: 'Alpaca', 
    icon: '🦙', 
    color: 'bg-yellow-500/20 text-yellow-400',
    fees: { stocks: '$0', crypto: '0.25%', options: 'N/A' },
    executionSpeed: 85,
    reliability: 92,
    features: ['Commission-free stocks', 'API-first', 'Paper trading'],
  },
  interactive_brokers: { 
    name: 'Interactive Brokers', 
    icon: '📊', 
    color: 'bg-red-500/20 text-red-400',
    fees: { stocks: '$0.005/share', crypto: '0.18%', options: '$0.65/contract' },
    executionSpeed: 95,
    reliability: 98,
    features: ['Global markets', 'Low margin rates', 'Professional tools'],
  },
  binance: { 
    name: 'Binance', 
    icon: '🔶', 
    color: 'bg-amber-500/20 text-amber-400',
    fees: { stocks: 'N/A', crypto: '0.1%', options: 'N/A' },
    executionSpeed: 90,
    reliability: 88,
    features: ['Largest crypto exchange', 'Low fees', 'Futures trading'],
  },
  coinbase: { 
    name: 'Coinbase', 
    icon: '🔵', 
    color: 'bg-blue-500/20 text-blue-400',
    fees: { stocks: 'N/A', crypto: '0.5%', options: 'N/A' },
    executionSpeed: 80,
    reliability: 95,
    features: ['US regulated', 'Easy to use', 'Insurance coverage'],
  },
};

// Symbol routing rule interface
interface SymbolRule {
  id: string;
  symbol: string;
  broker: string;
  condition: 'always' | 'volume_above' | 'volume_below' | 'time_range';
  conditionValue?: string;
  priority: number;
  enabled: boolean;
}

// Time-based routing rule interface
interface TimeRule {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  broker: string;
  assetClass: string;
  enabled: boolean;
}

interface RoutingPreferencesProps {
  className?: string;
}

export default function RoutingPreferences({ className }: RoutingPreferencesProps) {
  // State for preferences
  const [enableSmartRouting, setEnableSmartRouting] = useState(true);
  const [prioritizeLowFees, setPrioritizeLowFees] = useState(false);
  const [prioritizeFastExecution, setPrioritizeFastExecution] = useState(true);
  const [allowFallback, setAllowFallback] = useState(true);
  const [preferredBrokers, setPreferredBrokers] = useState<Record<string, string>>({
    us_equity: 'alpaca',
    crypto: 'binance',
    forex: 'interactive_brokers',
    options: 'interactive_brokers',
  });
  
  // Broker priority state (order matters)
  const [brokerPriority, setBrokerPriority] = useState<Record<string, string[]>>({
    us_equity: ['alpaca', 'interactive_brokers'],
    crypto: ['binance', 'coinbase', 'alpaca'],
    forex: ['interactive_brokers'],
    options: ['interactive_brokers'],
  });
  
  // Symbol-specific rules
  const [symbolRules, setSymbolRules] = useState<SymbolRule[]>([]);
  const [newSymbolRule, setNewSymbolRule] = useState<Partial<SymbolRule>>({
    symbol: '',
    broker: 'alpaca',
    condition: 'always',
    enabled: true,
  });
  const [showAddRuleDialog, setShowAddRuleDialog] = useState(false);
  
  // Time-based rules
  const [timeRules, setTimeRules] = useState<TimeRule[]>([]);
  
  // Advanced settings
  const [confirmBeforeRouting, setConfirmBeforeRouting] = useState(true);
  const [showRoutingDecision, setShowRoutingDecision] = useState(true);
  const [maxSlippage, setMaxSlippage] = useState(0.5);
  
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Fetch connected brokers
  const { data: connections, isLoading: connectionsLoading } = trpc.broker.getConnections.useQuery();

  // Fetch existing preferences
  const { data: existingPrefs, isLoading: prefsLoading } = trpc.routing.getPreferences.useQuery();

  // Save preferences mutation
  const savePrefs = trpc.routing.savePreferences.useMutation({
    onSuccess: () => {
      toast.success('Routing preferences saved successfully');
      setHasChanges(false);
    },
    onError: (error) => {
      toast.error(`Failed to save preferences: ${error.message}`);
    },
  });

  // Load existing preferences when data arrives
  useEffect(() => {
    if (existingPrefs) {
      setEnableSmartRouting(existingPrefs.enableSmartRouting ?? true);
      setPrioritizeLowFees(existingPrefs.prioritizeLowFees ?? false);
      setPrioritizeFastExecution(existingPrefs.prioritizeFastExecution ?? true);
      setAllowFallback(existingPrefs.allowFallback ?? true);
      if (existingPrefs.preferredStockBroker) {
        setPreferredBrokers(prev => ({ ...prev, us_equity: existingPrefs.preferredStockBroker! }));
      }
      if (existingPrefs.preferredCryptoBroker) {
        setPreferredBrokers(prev => ({ ...prev, crypto: existingPrefs.preferredCryptoBroker! }));
      }
      if (existingPrefs.preferredForexBroker) {
        setPreferredBrokers(prev => ({ ...prev, forex: existingPrefs.preferredForexBroker! }));
      }
      if (existingPrefs.preferredOptionsBroker) {
        setPreferredBrokers(prev => ({ ...prev, options: existingPrefs.preferredOptionsBroker! }));
      }
    }
  }, [existingPrefs]);

  // Get connected broker types
  const connectedBrokers = connections?.map((c: any) => c.brokerType) || [];
  const uniqueConnectedBrokers = Array.from(new Set(connectedBrokers)) as string[];

  // Get available brokers for an asset class
  const getAvailableBrokers = (assetClass: typeof ASSET_CLASSES[number]) => {
    return assetClass.defaultBrokers.filter(broker => 
      uniqueConnectedBrokers.includes(broker)
    );
  };

  // Handle preference changes
  const handleBrokerChange = (assetClass: string, broker: string) => {
    setPreferredBrokers(prev => ({ ...prev, [assetClass]: broker }));
    setHasChanges(true);
  };

  const handleToggleChange = (setter: (value: boolean) => void, value: boolean) => {
    setter(value);
    setHasChanges(true);
  };

  // Move broker up in priority
  const moveBrokerUp = (assetClass: string, index: number) => {
    if (index === 0) return;
    setBrokerPriority(prev => {
      const newPriority = [...prev[assetClass]];
      [newPriority[index - 1], newPriority[index]] = [newPriority[index], newPriority[index - 1]];
      return { ...prev, [assetClass]: newPriority };
    });
    setHasChanges(true);
  };

  // Move broker down in priority
  const moveBrokerDown = (assetClass: string, index: number) => {
    setBrokerPriority(prev => {
      if (index >= prev[assetClass].length - 1) return prev;
      const newPriority = [...prev[assetClass]];
      [newPriority[index], newPriority[index + 1]] = [newPriority[index + 1], newPriority[index]];
      return { ...prev, [assetClass]: newPriority };
    });
    setHasChanges(true);
  };

  // Add symbol rule
  const addSymbolRule = () => {
    if (!newSymbolRule.symbol || !newSymbolRule.broker) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    const rule: SymbolRule = {
      id: `rule_${Date.now()}`,
      symbol: newSymbolRule.symbol!.toUpperCase(),
      broker: newSymbolRule.broker!,
      condition: newSymbolRule.condition || 'always',
      conditionValue: newSymbolRule.conditionValue,
      priority: symbolRules.length + 1,
      enabled: true,
    };
    
    setSymbolRules(prev => [...prev, rule]);
    setNewSymbolRule({ symbol: '', broker: 'alpaca', condition: 'always', enabled: true });
    setShowAddRuleDialog(false);
    setHasChanges(true);
    toast.success(`Rule added for ${rule.symbol}`);
  };

  // Remove symbol rule
  const removeSymbolRule = (ruleId: string) => {
    setSymbolRules(prev => prev.filter(r => r.id !== ruleId));
    setHasChanges(true);
  };

  // Toggle symbol rule
  const toggleSymbolRule = (ruleId: string) => {
    setSymbolRules(prev => prev.map(r => 
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    ));
    setHasChanges(true);
  };

  // Save preferences
  const handleSave = () => {
    savePrefs.mutate({
      smartRoutingEnabled: enableSmartRouting,
      costOptimization: prioritizeLowFees,
      speedPriority: prioritizeFastExecution,
      fallbackEnabled: allowFallback,
      preferredStockBroker: preferredBrokers.us_equity,
      preferredCryptoBroker: preferredBrokers.crypto,
      preferredForexBroker: preferredBrokers.forex,
      preferredOptionsBroker: preferredBrokers.options,
    });
  };

  // Reset to defaults
  const handleReset = () => {
    setEnableSmartRouting(true);
    setPrioritizeLowFees(false);
    setPrioritizeFastExecution(true);
    setAllowFallback(true);
    setPreferredBrokers({
      us_equity: 'alpaca',
      crypto: 'binance',
      forex: 'interactive_brokers',
      options: 'interactive_brokers',
    });
    setBrokerPriority({
      us_equity: ['alpaca', 'interactive_brokers'],
      crypto: ['binance', 'coinbase', 'alpaca'],
      forex: ['interactive_brokers'],
      options: ['interactive_brokers'],
    });
    setSymbolRules([]);
    setTimeRules([]);
    setConfirmBeforeRouting(true);
    setShowRoutingDecision(true);
    setMaxSlippage(0.5);
    setHasChanges(true);
  };

  const isLoading = connectionsLoading || prefsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="priority" className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" />
            Priority
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Rules
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Compare
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6 mt-6">
          {/* Smart Routing Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Smart Order Routing
              </CardTitle>
              <CardDescription>
                Automatically select the best broker based on asset type, fees, and execution speed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Main Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable Smart Routing</Label>
                  <p className="text-sm text-muted-foreground">
                    Let TradoVerse automatically choose the optimal broker for each trade
                  </p>
                </div>
                <Switch
                  checked={enableSmartRouting}
                  onCheckedChange={(value) => handleToggleChange(setEnableSmartRouting, value)}
                />
              </div>

              <Separator />

              {/* Routing Options */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Routing Priorities</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      Prioritize Low Fees
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Prefer brokers with lower trading fees
                    </p>
                  </div>
                  <Switch
                    checked={prioritizeLowFees}
                    onCheckedChange={(value) => handleToggleChange(setPrioritizeLowFees, value)}
                    disabled={!enableSmartRouting}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-blue-500" />
                      Prioritize Fast Execution
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Prefer brokers with faster order execution
                    </p>
                  </div>
                  <Switch
                    checked={prioritizeFastExecution}
                    onCheckedChange={(value) => handleToggleChange(setPrioritizeFastExecution, value)}
                    disabled={!enableSmartRouting}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-amber-500" />
                      Allow Fallback Routing
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Use alternative brokers if preferred broker is unavailable
                    </p>
                  </div>
                  <Switch
                    checked={allowFallback}
                    onCheckedChange={(value) => handleToggleChange(setAllowFallback, value)}
                    disabled={!enableSmartRouting}
                  />
                </div>
              </div>

              <Separator />

              {/* Advanced Settings */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Advanced Settings</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Confirm Before Routing</Label>
                    <p className="text-xs text-muted-foreground">
                      Show confirmation dialog before executing routed orders
                    </p>
                  </div>
                  <Switch
                    checked={confirmBeforeRouting}
                    onCheckedChange={(value) => handleToggleChange(setConfirmBeforeRouting, value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Routing Decision</Label>
                    <p className="text-xs text-muted-foreground">
                      Display which broker was selected and why
                    </p>
                  </div>
                  <Switch
                    checked={showRoutingDecision}
                    onCheckedChange={(value) => handleToggleChange(setShowRoutingDecision, value)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Max Slippage Tolerance</Label>
                    <span className="text-sm text-muted-foreground">{maxSlippage}%</span>
                  </div>
                  <Input
                    type="range"
                    min="0.1"
                    max="2"
                    step="0.1"
                    value={maxSlippage}
                    onChange={(e) => {
                      setMaxSlippage(parseFloat(e.target.value));
                      setHasChanges(true);
                    }}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum acceptable price slippage before order is rejected
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preferred Brokers by Asset Class */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Default Brokers by Asset Class
              </CardTitle>
              <CardDescription>
                Set your default broker for each type of asset
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {uniqueConnectedBrokers.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No brokers connected. Please connect a broker first to configure routing preferences.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {ASSET_CLASSES.map((assetClass) => {
                    const Icon = assetClass.icon;
                    const availableBrokers = getAvailableBrokers(assetClass);
                    const currentBroker = preferredBrokers[assetClass.id];
                    const isAvailable = availableBrokers.length > 0;

                    return (
                      <div key={assetClass.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isAvailable ? 'bg-primary/10' : 'bg-muted'}`}>
                              <Icon className={`h-5 w-5 ${isAvailable ? 'text-primary' : 'text-muted-foreground'}`} />
                            </div>
                            <div>
                              <Label className={!isAvailable ? 'text-muted-foreground' : ''}>
                                {assetClass.name}
                              </Label>
                              <p className="text-xs text-muted-foreground">{assetClass.description}</p>
                            </div>
                          </div>
                          
                          {isAvailable ? (
                            <Select
                              value={currentBroker}
                              onValueChange={(value) => handleBrokerChange(assetClass.id, value)}
                            >
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select broker" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableBrokers.map((broker) => {
                                  const info = BROKER_INFO[broker];
                                  return (
                                    <SelectItem key={broker} value={broker}>
                                      <div className="flex items-center gap-2">
                                        <span>{info?.icon}</span>
                                        <span>{info?.name || broker}</span>
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              No broker available
                            </Badge>
                          )}
                        </div>
                        {assetClass.id !== 'options' && <Separator className="mt-4" />}
                      </div>
                    );
                  })}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Priority Tab */}
        <TabsContent value="priority" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5 text-primary" />
                Broker Priority Order
              </CardTitle>
              <CardDescription>
                Drag brokers to set the fallback order. The first available broker will be used.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {ASSET_CLASSES.map((assetClass) => {
                const Icon = assetClass.icon;
                const availableBrokers = getAvailableBrokers(assetClass);
                const priorityList = brokerPriority[assetClass.id]?.filter(b => availableBrokers.includes(b as typeof availableBrokers[number])) || [];

                if (priorityList.length === 0) return null;

                return (
                  <div key={assetClass.id} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <Label>{assetClass.name}</Label>
                    </div>
                    <div className="space-y-2">
                      {priorityList.map((broker, index) => {
                        const info = BROKER_INFO[broker];
                        return (
                          <div
                            key={broker}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => moveBrokerUp(assetClass.id, index)}
                                  disabled={index === 0}
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => moveBrokerDown(assetClass.id, index)}
                                  disabled={index === priorityList.length - 1}
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              </div>
                              <Badge variant="outline" className="w-6 h-6 flex items-center justify-center">
                                {index + 1}
                              </Badge>
                              <span className="text-lg">{info?.icon}</span>
                              <div>
                                <p className="font-medium">{info?.name || broker}</p>
                                <p className="text-xs text-muted-foreground">
                                  {index === 0 ? 'Primary' : `Fallback ${index}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Gauge className="h-3 w-3" />
                                      {info?.executionSpeed}%
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>Execution Speed</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Shield className="h-3 w-3" />
                                      {info?.reliability}%
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>Reliability Score</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {assetClass.id !== 'options' && <Separator className="mt-4" />}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-primary" />
                    Symbol-Specific Rules
                  </CardTitle>
                  <CardDescription>
                    Create custom routing rules for specific symbols
                  </CardDescription>
                </div>
                <Dialog open={showAddRuleDialog} onOpenChange={setShowAddRuleDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Rule
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Symbol Rule</DialogTitle>
                      <DialogDescription>
                        Create a custom routing rule for a specific symbol
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Symbol</Label>
                        <Input
                          placeholder="e.g., AAPL, BTC-USD"
                          value={newSymbolRule.symbol || ''}
                          onChange={(e) => setNewSymbolRule(prev => ({ ...prev, symbol: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Route to Broker</Label>
                        <Select
                          value={newSymbolRule.broker}
                          onValueChange={(value) => setNewSymbolRule(prev => ({ ...prev, broker: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select broker" />
                          </SelectTrigger>
                          <SelectContent>
                            {uniqueConnectedBrokers.map((broker) => {
                              const info = BROKER_INFO[broker];
                              return (
                                <SelectItem key={broker} value={broker}>
                                  <div className="flex items-center gap-2">
                                    <span>{info?.icon}</span>
                                    <span>{info?.name || broker}</span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Condition</Label>
                        <Select
                          value={newSymbolRule.condition}
                          onValueChange={(value: any) => setNewSymbolRule(prev => ({ ...prev, condition: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="always">Always use this broker</SelectItem>
                            <SelectItem value="volume_above">When volume above threshold</SelectItem>
                            <SelectItem value="volume_below">When volume below threshold</SelectItem>
                            <SelectItem value="time_range">During specific time range</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {(newSymbolRule.condition === 'volume_above' || newSymbolRule.condition === 'volume_below') && (
                        <div className="space-y-2">
                          <Label>Volume Threshold</Label>
                          <Input
                            type="number"
                            placeholder="e.g., 1000000"
                            value={newSymbolRule.conditionValue || ''}
                            onChange={(e) => setNewSymbolRule(prev => ({ ...prev, conditionValue: e.target.value }))}
                          />
                        </div>
                      )}
                      {newSymbolRule.condition === 'time_range' && (
                        <div className="space-y-2">
                          <Label>Time Range (e.g., 09:30-16:00)</Label>
                          <Input
                            placeholder="09:30-16:00"
                            value={newSymbolRule.conditionValue || ''}
                            onChange={(e) => setNewSymbolRule(prev => ({ ...prev, conditionValue: e.target.value }))}
                          />
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddRuleDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={addSymbolRule}>
                        Add Rule
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {symbolRules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No symbol rules configured</p>
                  <p className="text-sm">Add rules to customize routing for specific symbols</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Broker</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {symbolRules.map((rule) => {
                      const brokerInfo = BROKER_INFO[rule.broker];
                      return (
                        <TableRow key={rule.id}>
                          <TableCell className="font-medium">{rule.symbol}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{brokerInfo?.icon}</span>
                              <span>{brokerInfo?.name || rule.broker}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {rule.condition === 'always' && 'Always'}
                              {rule.condition === 'volume_above' && `Vol > ${rule.conditionValue}`}
                              {rule.condition === 'volume_below' && `Vol < ${rule.conditionValue}`}
                              {rule.condition === 'time_range' && rule.conditionValue}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={rule.enabled}
                              onCheckedChange={() => toggleSymbolRule(rule.id)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSymbolRule(rule.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Broker Comparison
              </CardTitle>
              <CardDescription>
                Compare fees, execution speed, and reliability across your connected brokers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {uniqueConnectedBrokers.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No brokers connected. Connect brokers to see comparison data.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  {/* Comparison Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Broker</TableHead>
                        <TableHead>Stock Fees</TableHead>
                        <TableHead>Crypto Fees</TableHead>
                        <TableHead>Options Fees</TableHead>
                        <TableHead>Speed</TableHead>
                        <TableHead>Reliability</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uniqueConnectedBrokers.map((broker) => {
                        const info = BROKER_INFO[broker];
                        if (!info) return null;
                        return (
                          <TableRow key={broker}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{info.icon}</span>
                                <span className="font-medium">{info.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>{info.fees.stocks}</TableCell>
                            <TableCell>{info.fees.crypto}</TableCell>
                            <TableCell>{info.fees.options}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={info.executionSpeed} className="w-16 h-2" />
                                <span className="text-xs text-muted-foreground">{info.executionSpeed}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={info.reliability} className="w-16 h-2" />
                                <span className="text-xs text-muted-foreground">{info.reliability}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Features Comparison */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Features by Broker</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {uniqueConnectedBrokers.map((broker) => {
                        const info = BROKER_INFO[broker];
                        if (!info) return null;
                        return (
                          <Card key={broker} className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-lg">{info.icon}</span>
                              <span className="font-medium">{info.name}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {info.features.map((feature, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Connected Brokers Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Connected Brokers
          </CardTitle>
          <CardDescription>
            Brokers currently connected to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {uniqueConnectedBrokers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No brokers connected yet.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {uniqueConnectedBrokers.map((broker) => {
                const info = BROKER_INFO[broker];
                const connection = connections?.find((c: any) => c.brokerType === broker);
                return (
                  <div 
                    key={broker}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${info?.color || 'bg-muted'}`}
                  >
                    <span className="text-lg">{info?.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{info?.name || broker}</p>
                      <p className="text-xs opacity-70">
                        {connection?.isPaper ? 'Paper Trading' : 'Live Trading'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Smart routing analyzes each order and automatically selects the best broker based on your preferences, 
          asset type, and broker availability. You can always override the suggested broker when placing an order.
        </AlertDescription>
      </Alert>

      {/* Save/Reset Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={savePrefs.isPending}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
        
        <div className="flex items-center gap-3">
          {hasChanges && (
            <Badge variant="outline" className="text-amber-500 border-amber-500">
              Unsaved changes
            </Badge>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || savePrefs.isPending}
          >
            {savePrefs.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
}
