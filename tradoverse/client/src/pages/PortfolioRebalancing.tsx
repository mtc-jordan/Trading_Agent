import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { 
  Plus, Trash2, RefreshCw, Play, AlertTriangle, CheckCircle,
  PieChart, Settings, History, ArrowUpRight, ArrowDownRight,
  Target, Percent, DollarSign, Calendar
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useBroker, BrokerConnection } from '@/contexts/BrokerContext';
import { toast } from 'sonner';

interface TargetAllocation {
  symbol: string;
  targetPercent: number;
}

export default function PortfolioRebalancing() {
  const { connectedBrokers, getBrokerName } = useBroker();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedAllocationId, setSelectedAllocationId] = useState<string | null>(null);
  
  // Form state for creating allocation
  const [newAllocation, setNewAllocation] = useState({
    name: '',
    description: '',
    targetAllocations: [] as TargetAllocation[],
    rebalanceThreshold: 5,
    rebalanceFrequency: 'manual' as const,
    preferredBrokers: [] as string[],
  });
  const [newSymbol, setNewSymbol] = useState('');
  const [newPercent, setNewPercent] = useState(0);

  // Fetch user allocations
  const { data: allocations, isLoading: allocationsLoading, refetch: refetchAllocations } = trpc.broker.getUserAllocations.useQuery();

  // Fetch rebalancing suggestions for selected allocation
  const { data: suggestions, isLoading: suggestionsLoading, refetch: refetchSuggestions } = trpc.broker.getRebalanceSuggestions.useQuery(
    { allocationId: selectedAllocationId || '' },
    { enabled: !!selectedAllocationId }
  );

  // Fetch rebalancing history
  const { data: history } = trpc.broker.getRebalancingHistory.useQuery({ limit: 20 });

  // Mutations
  const createAllocation = trpc.broker.createAllocation.useMutation({
    onSuccess: () => {
      toast.success('Allocation created successfully');
      setIsCreateDialogOpen(false);
      refetchAllocations();
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteAllocation = trpc.broker.deleteAllocation.useMutation({
    onSuccess: () => {
      toast.success('Allocation deleted');
      refetchAllocations();
      if (selectedAllocationId) setSelectedAllocationId(null);
    },
  });

  const executeRebalancing = trpc.broker.executeRebalancing.useMutation({
    onSuccess: () => {
      toast.success('Rebalancing executed successfully');
      refetchSuggestions();
      refetchAllocations();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const resetForm = () => {
    setNewAllocation({
      name: '',
      description: '',
      targetAllocations: [],
      rebalanceThreshold: 5,
      rebalanceFrequency: 'manual',
      preferredBrokers: [],
    });
    setNewSymbol('');
    setNewPercent(0);
  };

  const addTargetAllocation = () => {
    if (!newSymbol || newPercent <= 0) return;
    
    const existing = newAllocation.targetAllocations.find(a => a.symbol === newSymbol.toUpperCase());
    if (existing) {
      toast.error('Symbol already added');
      return;
    }
    
    setNewAllocation(prev => ({
      ...prev,
      targetAllocations: [...prev.targetAllocations, { symbol: newSymbol.toUpperCase(), targetPercent: newPercent }],
    }));
    setNewSymbol('');
    setNewPercent(0);
  };

  const removeTargetAllocation = (symbol: string) => {
    setNewAllocation(prev => ({
      ...prev,
      targetAllocations: prev.targetAllocations.filter(a => a.symbol !== symbol),
    }));
  };

  const totalAllocation = newAllocation.targetAllocations.reduce((sum, a) => sum + a.targetPercent, 0);

  const handleCreateAllocation = () => {
    if (Math.abs(totalAllocation - 100) > 0.01) {
      toast.error('Target allocations must sum to 100%');
      return;
    }
    
    createAllocation.mutate(newAllocation);
  };

  const selectedAllocation = allocations?.find(a => a.id === selectedAllocationId);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Portfolio Rebalancing</h1>
            <p className="text-muted-foreground">
              Create target allocations and rebalance across multiple brokers
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Allocation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Target Allocation</DialogTitle>
                <DialogDescription>
                  Define your target portfolio allocation and rebalancing rules
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      placeholder="e.g., Growth Portfolio"
                      value={newAllocation.name}
                      onChange={(e) => setNewAllocation(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rebalance Frequency</Label>
                    <Select 
                      value={newAllocation.rebalanceFrequency} 
                      onValueChange={(v) => setNewAllocation(prev => ({ ...prev, rebalanceFrequency: v as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Input
                    placeholder="Describe your allocation strategy"
                    value={newAllocation.description}
                    onChange={(e) => setNewAllocation(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Rebalance Threshold: {newAllocation.rebalanceThreshold}%</Label>
                  <Slider
                    value={[newAllocation.rebalanceThreshold]}
                    onValueChange={([v]) => setNewAllocation(prev => ({ ...prev, rebalanceThreshold: v }))}
                    min={1}
                    max={20}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Rebalancing will be suggested when any asset drifts more than {newAllocation.rebalanceThreshold}% from target
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Target Allocations</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Symbol (e.g., AAPL)"
                      value={newSymbol}
                      onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                      className="w-32"
                    />
                    <Input
                      type="number"
                      placeholder="%"
                      value={newPercent || ''}
                      onChange={(e) => setNewPercent(Number(e.target.value))}
                      className="w-24"
                      min={0}
                      max={100}
                    />
                    <Button type="button" onClick={addTargetAllocation} disabled={!newSymbol || newPercent <= 0}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {newAllocation.targetAllocations.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {newAllocation.targetAllocations.map((alloc) => (
                        <div key={alloc.symbol} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{alloc.symbol}</span>
                            <Badge variant="secondary">{alloc.targetPercent}%</Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTargetAllocation(alloc.symbol)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 border-t">
                        <span className="font-medium">Total</span>
                        <Badge variant={Math.abs(totalAllocation - 100) < 0.01 ? 'default' : 'destructive'}>
                          {totalAllocation.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateAllocation}
                  disabled={createAllocation.isPending || !newAllocation.name || newAllocation.targetAllocations.length === 0}
                >
                  {createAllocation.isPending ? 'Creating...' : 'Create Allocation'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Allocations List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Your Allocations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allocationsLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !allocations || allocations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No allocations created yet</p>
                  <p className="text-sm">Create your first target allocation</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {allocations.map((alloc) => (
                    <div
                      key={alloc.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedAllocationId === alloc.id 
                          ? 'bg-primary/10 border border-primary' 
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                      onClick={() => setSelectedAllocationId(alloc.id)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{alloc.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {alloc.rebalanceFrequency}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {alloc.targetAllocations.length} assets • {alloc.rebalanceThreshold}% threshold
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Allocation Details & Rebalancing */}
          <Card className="lg:col-span-2">
            {!selectedAllocationId ? (
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select an Allocation</h3>
                <p className="text-muted-foreground text-center">
                  Choose an allocation from the list to view details and rebalancing suggestions
                </p>
              </CardContent>
            ) : (
              <>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedAllocation?.name}</CardTitle>
                      <CardDescription>{selectedAllocation?.description || 'No description'}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => refetchSuggestions()}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this allocation?')) {
                            deleteAllocation.mutate({ allocationId: selectedAllocationId });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="current">
                    <TabsList>
                      <TabsTrigger value="current">Current vs Target</TabsTrigger>
                      <TabsTrigger value="trades">Suggested Trades</TabsTrigger>
                    </TabsList>

                    <TabsContent value="current" className="mt-4">
                      {suggestionsLoading ? (
                        <div className="flex justify-center py-8">
                          <RefreshCw className="h-6 w-6 animate-spin" />
                        </div>
                      ) : !suggestions ? (
                        <div className="text-center py-8 text-muted-foreground">
                          Unable to calculate suggestions
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="text-center p-4 bg-muted rounded-lg">
                              <p className="text-sm text-muted-foreground">Portfolio Value</p>
                              <p className="text-2xl font-bold">{formatCurrency(suggestions.totalPortfolioValue)}</p>
                            </div>
                            <div className="text-center p-4 bg-muted rounded-lg">
                              <p className="text-sm text-muted-foreground">Est. Fees</p>
                              <p className="text-2xl font-bold">{formatCurrency(suggestions.estimatedFees)}</p>
                            </div>
                            <div className="text-center p-4 bg-muted rounded-lg">
                              <p className="text-sm text-muted-foreground">Est. Tax Impact</p>
                              <p className="text-2xl font-bold">{formatCurrency(suggestions.estimatedTaxImpact)}</p>
                            </div>
                          </div>

                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Symbol</TableHead>
                                <TableHead className="text-right">Current</TableHead>
                                <TableHead className="text-right">Target</TableHead>
                                <TableHead className="text-right">Drift</TableHead>
                                <TableHead className="text-right">Value</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {suggestions.currentAllocations.map((alloc) => (
                                <TableRow key={alloc.symbol}>
                                  <TableCell className="font-medium">{alloc.symbol}</TableCell>
                                  <TableCell className="text-right">{alloc.currentPercent.toFixed(1)}%</TableCell>
                                  <TableCell className="text-right">{alloc.targetPercent.toFixed(1)}%</TableCell>
                                  <TableCell className="text-right">
                                    <Badge 
                                      variant={Math.abs(alloc.drift) > (selectedAllocation?.rebalanceThreshold || 5) ? 'destructive' : 'secondary'}
                                    >
                                      {formatPercent(alloc.drift)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {formatCurrency(alloc.currentValue)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="trades" className="mt-4">
                      {suggestions?.suggestedTrades.length === 0 ? (
                        <div className="text-center py-8">
                          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Portfolio is Balanced</h3>
                          <p className="text-muted-foreground">
                            No rebalancing trades needed at this time
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            <p className="text-sm">
                              {suggestions?.suggestedTrades.length} trades suggested to rebalance your portfolio
                            </p>
                          </div>

                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Symbol</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead className="text-right">Est. Value</TableHead>
                                <TableHead>Broker</TableHead>
                                <TableHead>Reason</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {suggestions?.suggestedTrades.map((trade, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">{trade.symbol}</TableCell>
                                  <TableCell>
                                    <Badge variant={trade.side === 'buy' ? 'default' : 'secondary'}>
                                      {trade.side === 'buy' ? (
                                        <ArrowUpRight className="mr-1 h-3 w-3" />
                                      ) : (
                                        <ArrowDownRight className="mr-1 h-3 w-3" />
                                      )}
                                      {trade.side.toUpperCase()}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {trade.quantity.toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {formatCurrency(trade.estimatedValue)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{getBrokerName(trade.brokerType as any)}</Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {trade.reason}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
                {suggestions && suggestions.suggestedTrades.length > 0 && (
                  <CardFooter className="border-t pt-4">
                    <Button 
                      className="w-full"
                      onClick={() => executeRebalancing.mutate({ allocationId: selectedAllocationId })}
                      disabled={executeRebalancing.isPending}
                    >
                      {executeRebalancing.isPending ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="mr-2 h-4 w-4" />
                      )}
                      Execute All Trades
                    </Button>
                  </CardFooter>
                )}
              </>
            )}
          </Card>
        </div>

        {/* Rebalancing History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Rebalancing History
            </CardTitle>
            <CardDescription>Past rebalancing executions</CardDescription>
          </CardHeader>
          <CardContent>
            {!history || history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No rebalancing history yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Allocation</TableHead>
                    <TableHead>Trades</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead className="text-right">Fees</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Triggered By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {allocations?.find(a => a.id === item.allocationId)?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>{item.tradesCount}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.totalTradingVolume)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.totalFees)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'completed' ? 'default' : item.status === 'failed' ? 'destructive' : 'secondary'}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.triggeredBy}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
