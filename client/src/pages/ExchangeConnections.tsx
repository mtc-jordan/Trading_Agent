import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { 
  Link2, 
  Plus, 
  Settings, 
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Key,
  Shield,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  Copy,
  Wallet
} from "lucide-react";
import { toast } from "sonner";

const EXCHANGES = [
  { 
    id: 'binance', 
    name: 'Binance', 
    logo: '🟡',
    description: 'World\'s largest crypto exchange',
    type: 'crypto',
    features: ['Spot', 'Futures', 'Margin'],
    docsUrl: 'https://binance-docs.github.io/apidocs/'
  },
  { 
    id: 'coinbase', 
    name: 'Coinbase', 
    logo: '🔵',
    description: 'US-regulated crypto exchange',
    type: 'crypto',
    features: ['Spot', 'Advanced Trade'],
    docsUrl: 'https://docs.cloud.coinbase.com/'
  },
  { 
    id: 'alpaca', 
    name: 'Alpaca', 
    logo: '🦙',
    description: 'Commission-free stock trading API',
    type: 'stocks',
    features: ['Stocks', 'ETFs', 'Paper Trading'],
    docsUrl: 'https://alpaca.markets/docs/'
  },
  { 
    id: 'interactive_brokers', 
    name: 'Interactive Brokers', 
    logo: '🔴',
    description: 'Professional trading platform',
    type: 'stocks',
    features: ['Stocks', 'Options', 'Futures', 'Forex'],
    docsUrl: 'https://interactivebrokers.github.io/'
  },
] as const;

type ExchangeId = typeof EXCHANGES[number]['id'];

export default function ExchangeConnections() {
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState<ExchangeId | null>(null);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [credentials, setCredentials] = useState({
    apiKey: '',
    apiSecret: '',
    passphrase: '',
    isPaper: true,
  });

  // Queries
  const { data: connections, isLoading: loadingConnections, refetch } = trpc.exchange.getConnections.useQuery();
  // Balances will be fetched per connection
  const balances: { asset: string; free: string; locked: string }[] = [];
  // Orders will be fetched from exchange directly
  const orders: { id: string; symbol: string; side: string; type: string; quantity: string; price: string | null; status: string; exchange: string }[] = [];

  // Mutations
  const connectMutation = trpc.exchange.connect.useMutation({
    onSuccess: () => {
      toast.success("Exchange connected successfully!");
      setShowConnectDialog(false);
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const disconnectMutation = trpc.exchange.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Exchange disconnected");
      refetch();
    },
  });

  const testConnectionMutation = trpc.exchange.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Connection test successful!");
    },
    onError: (error) => {
      toast.error(`Connection test failed: ${error.message}`);
    },
  });

  const syncMutation = trpc.exchange.sync.useMutation({
    onSuccess: () => {
      toast.success("Balances synced");
      refetch();
    },
  });

  const resetForm = () => {
    setCredentials({
      apiKey: '',
      apiSecret: '',
      passphrase: '',
      isPaper: true,
    });
    setSelectedExchange(null);
  };

  const handleConnect = () => {
    if (!selectedExchange) return;
    connectMutation.mutate({
      exchange: selectedExchange,
      credentials: {
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret,
        passphrase: credentials.passphrase || undefined,
      },

    });
  };

  const getExchangeInfo = (id: string) => {
    return EXCHANGES.find(e => e.id === id);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'disconnected':
        return <Badge variant="secondary">Disconnected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const toggleShowApiKey = (id: string) => {
    setShowApiKey(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Exchange Connections</h1>
            <p className="text-muted-foreground">
              Connect your trading accounts for live execution
            </p>
          </div>
          <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Connect Exchange
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Connect Exchange</DialogTitle>
                <DialogDescription>
                  Add your exchange API credentials to enable live trading
                </DialogDescription>
              </DialogHeader>
              
              {!selectedExchange ? (
                <div className="grid grid-cols-2 gap-4 py-4">
                  {EXCHANGES.map((exchange) => (
                    <Card 
                      key={exchange.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => setSelectedExchange(exchange.id)}
                    >
                      <CardContent className="pt-6 text-center">
                        <div className="text-4xl mb-2">{exchange.logo}</div>
                        <h3 className="font-semibold">{exchange.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{exchange.description}</p>
                        <div className="flex flex-wrap gap-1 justify-center mt-2">
                          {exchange.features.map(f => (
                            <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <span className="text-2xl">{getExchangeInfo(selectedExchange)?.logo}</span>
                    <div>
                      <h4 className="font-semibold">{getExchangeInfo(selectedExchange)?.name}</h4>
                      <a 
                        href={getExchangeInfo(selectedExchange)?.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        API Documentation <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="ml-auto"
                      onClick={() => setSelectedExchange(null)}
                    >
                      Change
                    </Button>
                  </div>

                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertTitle>Security Notice</AlertTitle>
                    <AlertDescription>
                      Your API keys are encrypted and stored securely. We recommend using API keys with trading permissions only (no withdrawal access).
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="text"
                      placeholder="Enter your API key"
                      value={credentials.apiKey}
                      onChange={(e) => setCredentials(c => ({ ...c, apiKey: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>API Secret</Label>
                    <Input
                      type="password"
                      placeholder="Enter your API secret"
                      value={credentials.apiSecret}
                      onChange={(e) => setCredentials(c => ({ ...c, apiSecret: e.target.value }))}
                    />
                  </div>

                  {selectedExchange === 'coinbase' && (
                    <div className="space-y-2">
                      <Label>Passphrase (Coinbase Pro)</Label>
                      <Input
                        type="password"
                        placeholder="Enter your passphrase"
                        value={credentials.passphrase}
                        onChange={(e) => setCredentials(c => ({ ...c, passphrase: e.target.value }))}
                      />
                    </div>
                  )}

                  {(selectedExchange === 'alpaca' || selectedExchange === 'interactive_brokers') && (
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Paper Trading Mode</Label>
                        <p className="text-xs text-muted-foreground">Use simulated trading environment</p>
                      </div>
                      <Switch
                        checked={credentials.isPaper}
                        onCheckedChange={(v) => setCredentials(c => ({ ...c, isPaper: v }))}
                      />
                    </div>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setShowConnectDialog(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
                {selectedExchange && (
                  <Button 
                    onClick={handleConnect} 
                    disabled={connectMutation.isPending || !credentials.apiKey || !credentials.apiSecret}
                  >
                    {connectMutation.isPending ? "Connecting..." : "Connect Exchange"}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Connected Exchanges */}
        <Tabs defaultValue="connections" className="space-y-4">
          <TabsList>
            <TabsTrigger value="connections">
              <Link2 className="h-4 w-4 mr-2" />
              Connections ({connections?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="balances">
              <Wallet className="h-4 w-4 mr-2" />
              Balances
            </TabsTrigger>
            <TabsTrigger value="orders">
              <Clock className="h-4 w-4 mr-2" />
              Orders
            </TabsTrigger>
          </TabsList>

          {/* Connections Tab */}
          <TabsContent value="connections" className="space-y-4">
            {loadingConnections ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="pt-6 h-32" />
                  </Card>
                ))}
              </div>
            ) : !connections?.length ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No exchanges connected</h3>
                  <p className="text-muted-foreground mb-4">
                    Connect your trading accounts to enable live execution
                  </p>
                  <Button onClick={() => setShowConnectDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Connect Exchange
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {connections.map((conn) => {
                  const exchangeInfo = getExchangeInfo(conn.exchange);
                  return (
                    <Card key={conn.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="text-4xl">{exchangeInfo?.logo || '🔗'}</div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg">{exchangeInfo?.name || conn.exchange}</h3>
                                {getStatusBadge(conn.status)}

                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Key className="h-3 w-3 text-muted-foreground" />
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {showApiKey[conn.id] 
                                    ? `${conn.id.slice(0, 20)}...` 
                                    : `${conn.id.slice(0, 8)}${'•'.repeat(12)}`
                                  }
                                </code>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 w-6 p-0"
                                  onClick={() => toggleShowApiKey(conn.id)}
                                >
                                  {showApiKey[conn.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 w-6 p-0"
                                  onClick={() => copyToClipboard(conn.id)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              {conn.lastSyncAt && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Last synced: {new Date(conn.lastSyncAt).toLocaleString()}
                                </p>
                              )}
                              {conn.error && (
                                <p className="text-xs text-red-500 mt-1">
                                  Error: {conn.error}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => toast.info('Testing connection...')}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Test
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => syncMutation.mutate({ connectionId: conn.id })}
                              disabled={syncMutation.isPending}
                            >
                              <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                              Sync
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => disconnectMutation.mutate({ connectionId: conn.id })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Balances Tab */}
          <TabsContent value="balances" className="space-y-4">
            {!balances?.length ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No balance data</h3>
                  <p className="text-muted-foreground">
                    Connect an exchange and sync to view balances
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {balances.map((balance, i) => (
                  <Card key={i}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{balance.asset}</p>
                            <p className="text-xs text-muted-foreground">Exchange</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{Number(balance.free).toFixed(4)}</p>
                          {Number(balance.locked) > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Locked: {Number(balance.locked).toFixed(4)}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            {!orders?.length ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No orders</h3>
                  <p className="text-muted-foreground">
                    Your exchange orders will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orders.map((order: { id: string; symbol: string; side: string; type: string; quantity: string; price: string | null; status: string; exchange: string }) => (
                      <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${order.side === 'buy' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            {order.side === 'buy' ? (
                              <TrendingUp className="h-5 w-5 text-green-500" />
                            ) : (
                              <TrendingDown className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold">{order.symbol}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.side.toUpperCase()} {order.type} • {Number(order.quantity)} @ ${Number(order.price || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={
                            order.status === 'filled' ? 'default' : 
                            order.status === 'pending' ? 'secondary' : 
                            order.status === 'cancelled' ? 'outline' : 'destructive'
                          }>
                            {order.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {order.exchange}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
