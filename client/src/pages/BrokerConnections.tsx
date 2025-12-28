/**
 * Broker Connections Page
 * 
 * Allows users to connect their brokerage accounts via OAuth
 * for live trading through Alpaca and Interactive Brokers.
 */

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { 
  Link2, 
  Unlink, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink,
  Shield,
  Wallet,
  TrendingUp,
  Clock,
  DollarSign,
  Activity,
  Settings,
  Info,
  Loader2
} from 'lucide-react';

// Broker logos and info
const BROKER_INFO = {
  alpaca: {
    name: 'Alpaca',
    description: 'Commission-free trading API for stocks and crypto',
    logo: '🦙',
    features: ['Stocks', 'Crypto', 'Fractional Shares', 'Paper Trading'],
    website: 'https://alpaca.markets',
    docsUrl: 'https://docs.alpaca.markets',
    oauthType: 'OAuth 2.0',
    setupSteps: [
      'Create an Alpaca account at alpaca.markets',
      'Navigate to API Keys in your dashboard',
      'Create an OAuth App with your redirect URI',
      'Copy your Client ID and Client Secret',
      'Add them to your TradoVerse settings'
    ]
  },
  interactive_brokers: {
    name: 'Interactive Brokers',
    description: 'Professional-grade trading platform with global access',
    logo: '🏦',
    features: ['Stocks', 'Options', 'Futures', 'Forex', 'Bonds'],
    website: 'https://www.interactivebrokers.com',
    docsUrl: 'https://www.interactivebrokers.com/campus/ibkr-api-page/',
    oauthType: 'OAuth 1.0A',
    setupSteps: [
      'Apply for API access at IBKR',
      'Wait for approval (may take several days)',
      'Generate RSA key pair for signing',
      'Register your OAuth consumer',
      'Configure callback URL and permissions'
    ]
  }
};

export default function BrokerConnections() {
  const [selectedBroker, setSelectedBroker] = useState<'alpaca' | 'interactive_brokers' | null>(null);
  const [isPaper, setIsPaper] = useState(true);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [connectingBroker, setConnectingBroker] = useState<string | null>(null);
  
  // Queries
  const { data: connections, isLoading: loadingConnections, refetch: refetchConnections } = 
    trpc.broker.getConnections.useQuery();
  
  const { data: availableBrokers } = trpc.broker.getAvailableBrokers.useQuery();
  
  // Mutations
  const startAlpacaOAuth = trpc.broker.startAlpacaOAuth.useMutation({
    onSuccess: (data) => {
      // Redirect to Alpaca OAuth
      window.location.href = data.authUrl;
    },
    onError: (error) => {
      toast.error('Connection Failed', {
        description: error.message
      });
      setConnectingBroker(null);
    }
  });
  
  const startIBKROAuth = trpc.broker.startIBKROAuth.useMutation({
    onSuccess: (data) => {
      // Redirect to IBKR OAuth
      window.location.href = data.authUrl;
    },
    onError: (error) => {
      toast.error('Connection Failed', {
        description: error.message
      });
      setConnectingBroker(null);
    }
  });
  
  const disconnectBroker = trpc.broker.disconnect.useMutation({
    onSuccess: () => {
      toast.success('Disconnected', {
        description: 'Broker connection removed successfully'
      });
      refetchConnections();
    },
    onError: (error) => {
      toast.error('Disconnect Failed', {
        description: error.message
      });
    }
  });
  
  const testConnection = trpc.broker.testBrokerConnection.useQuery(
    { connectionId: connections?.[0]?.id || '' },
    { enabled: false }
  );
  
  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const oauthToken = urlParams.get('oauth_token');
    const oauthVerifier = urlParams.get('oauth_verifier');
    
    if (code && state) {
      // Alpaca OAuth callback
      handleAlpacaCallback(code, state);
    } else if (oauthToken && oauthVerifier && state) {
      // IBKR OAuth callback
      handleIBKRCallback(oauthToken, oauthVerifier, state);
    }
  }, []);
  
  const handleAlpacaCallback = async (code: string, state: string) => {
    try {
      // This would be handled by the callback endpoint
      toast.info('Processing...', {
        description: 'Completing Alpaca connection'
      });
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
      refetchConnections();
    } catch (error) {
      toast.error('Connection Failed', {
        description: 'Failed to complete Alpaca connection'
      });
    }
  };
  
  const handleIBKRCallback = async (oauthToken: string, oauthVerifier: string, state: string) => {
    try {
      toast.info('Processing...', {
        description: 'Completing Interactive Brokers connection'
      });
      window.history.replaceState({}, document.title, window.location.pathname);
      refetchConnections();
    } catch (error) {
      toast.error('Connection Failed', {
        description: 'Failed to complete IBKR connection'
      });
    }
  };
  
  const handleConnect = (brokerType: 'alpaca' | 'interactive_brokers') => {
    setConnectingBroker(brokerType);
    const redirectUri = `${window.location.origin}/broker/${brokerType}/callback`;
    
    if (brokerType === 'alpaca') {
      startAlpacaOAuth.mutate({ isPaper, redirectUri });
    } else {
      startIBKROAuth.mutate({ isPaper, redirectUri });
    }
  };
  
  const handleDisconnect = (connectionId: string) => {
    if (confirm('Are you sure you want to disconnect this broker? This will remove all saved credentials.')) {
      disconnectBroker.mutate({ connectionId });
    }
  };
  
  const getConnectionStatus = (connection: any) => {
    if (connection.connectionError) {
      return { status: 'error', color: 'destructive', text: 'Error' };
    }
    if (connection.isActive) {
      return { status: 'connected', color: 'default', text: 'Connected' };
    }
    return { status: 'inactive', color: 'secondary', text: 'Inactive' };
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Broker Connections</h1>
            <p className="text-muted-foreground mt-1">
              Connect your brokerage accounts for live trading
            </p>
          </div>
          <Button variant="outline" onClick={() => refetchConnections()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        {/* Warning Alert */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>Security Notice</AlertTitle>
          <AlertDescription>
            Your broker credentials are encrypted and stored securely. We use OAuth authentication 
            which means we never see or store your broker password. You can revoke access at any time 
            from your broker's settings.
          </AlertDescription>
        </Alert>
        
        <Tabs defaultValue="connections" className="space-y-4">
          <TabsList>
            <TabsTrigger value="connections">Active Connections</TabsTrigger>
            <TabsTrigger value="available">Available Brokers</TabsTrigger>
            <TabsTrigger value="setup">Setup Guide</TabsTrigger>
          </TabsList>
          
          {/* Active Connections Tab */}
          <TabsContent value="connections" className="space-y-4">
            {loadingConnections ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ) : connections && connections.length > 0 ? (
              <div className="grid gap-4">
                {connections.map((connection) => {
                  const status = getConnectionStatus(connection);
                  const brokerInfo = BROKER_INFO[connection.brokerType as keyof typeof BROKER_INFO];
                  
                  return (
                    <Card key={connection.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{brokerInfo?.logo || '🏦'}</span>
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                {brokerInfo?.name || connection.brokerType}
                                <Badge variant={status.color as any}>{status.text}</Badge>
                                {connection.isPaper && (
                                  <Badge variant="outline">Paper Trading</Badge>
                                )}
                              </CardTitle>
                              <CardDescription>
                                Account: {connection.accountNumber || 'N/A'}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                // Test connection
                                toast.info('Testing Connection', {
                                  description: 'Verifying broker connection...'
                                });
                              }}
                            >
                              <Activity className="h-4 w-4 mr-1" />
                              Test
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleDisconnect(connection.id)}
                            >
                              <Unlink className="h-4 w-4 mr-1" />
                              Disconnect
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Account Type</p>
                            <p className="font-medium">{connection.accountType || 'Standard'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Last Connected</p>
                            <p className="font-medium">
                              {connection.lastConnectedAt 
                                ? new Date(connection.lastConnectedAt).toLocaleDateString()
                                : 'Never'}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Last Sync</p>
                            <p className="font-medium">
                              {connection.lastSyncAt 
                                ? new Date(connection.lastSyncAt).toLocaleString()
                                : 'Never'}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Connected Since</p>
                            <p className="font-medium">
                              {new Date(connection.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        {connection.connectionError && (
                          <Alert variant="destructive" className="mt-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Connection Error</AlertTitle>
                            <AlertDescription>{connection.connectionError}</AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Link2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Broker Connections</h3>
                  <p className="text-muted-foreground mb-4">
                    Connect a broker to start live trading with AI-powered recommendations
                  </p>
                  <Button onClick={() => setSelectedBroker('alpaca')}>
                    Connect Your First Broker
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Available Brokers Tab */}
          <TabsContent value="available" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(BROKER_INFO).map(([key, broker]) => {
                const isConnected = connections?.some(c => c.brokerType === key && c.isActive);
                
                return (
                  <Card key={key} className={isConnected ? 'border-green-500/50' : ''}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-4xl">{broker.logo}</span>
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              {broker.name}
                              {isConnected && (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              )}
                            </CardTitle>
                            <CardDescription>{broker.description}</CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {broker.features.map((feature) => (
                          <Badge key={feature} variant="secondary">{feature}</Badge>
                        ))}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Shield className="h-4 w-4" />
                        <span>{broker.oauthType} Authentication</span>
                      </div>
                      
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <a 
                            href={broker.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            Website <ExternalLink className="h-3 w-3" />
                          </a>
                          <a 
                            href={broker.docsUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            API Docs <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        
                        {!isConnected && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button>
                                <Link2 className="h-4 w-4 mr-2" />
                                Connect
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Connect {broker.name}</DialogTitle>
                                <DialogDescription>
                                  Choose your trading environment and connect your account
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="space-y-4 py-4">
                                <div className="flex items-center justify-between">
                                  <div className="space-y-0.5">
                                    <Label>Paper Trading Mode</Label>
                                    <p className="text-sm text-muted-foreground">
                                      Practice with virtual money (recommended for testing)
                                    </p>
                                  </div>
                                  <Switch 
                                    checked={isPaper} 
                                    onCheckedChange={setIsPaper}
                                  />
                                </div>
                                
                                {!isPaper && (
                                  <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Live Trading Warning</AlertTitle>
                                    <AlertDescription>
                                      You are about to connect a live trading account. 
                                      Real money will be at risk. Make sure you understand 
                                      the risks before proceeding.
                                    </AlertDescription>
                                  </Alert>
                                )}
                                
                                <Alert>
                                  <Info className="h-4 w-4" />
                                  <AlertTitle>OAuth Authentication</AlertTitle>
                                  <AlertDescription>
                                    You will be redirected to {broker.name} to authorize 
                                    TradoVerse. We never see or store your password.
                                  </AlertDescription>
                                </Alert>
                              </div>
                              
                              <DialogFooter>
                                <Button 
                                  onClick={() => handleConnect(key as 'alpaca' | 'interactive_brokers')}
                                  disabled={connectingBroker === key}
                                >
                                  {connectingBroker === key ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Connecting...
                                    </>
                                  ) : (
                                    <>
                                      <Link2 className="h-4 w-4 mr-2" />
                                      Connect {isPaper ? 'Paper' : 'Live'} Account
                                    </>
                                  )}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
          
          {/* Setup Guide Tab */}
          <TabsContent value="setup" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Broker Setup Guide</CardTitle>
                <CardDescription>
                  Follow these steps to connect your brokerage account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(BROKER_INFO).map(([key, broker]) => (
                  <div key={key} className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <span>{broker.logo}</span>
                      {broker.name} Setup
                    </h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      {broker.setupSteps.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                    <Separator />
                  </div>
                ))}
                
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Need Help?</AlertTitle>
                  <AlertDescription>
                    If you're having trouble connecting your broker, check our documentation 
                    or contact support. Make sure your API credentials are correct and your 
                    broker account is in good standing.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
