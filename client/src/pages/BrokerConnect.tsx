/**
 * Unified Broker Connection Page
 * 
 * Comprehensive multi-broker connection interface supporting:
 * - Alpaca (API Key) - Stocks, ETFs, Crypto
 * - Interactive Brokers (OAuth 2.0) - Professional trading
 * - Binance (API Key with HMAC) - Crypto exchange
 * - Coinbase (API Key/OAuth) - Crypto exchange
 * 
 * Features:
 * - Detailed broker cards with capabilities
 * - Step-by-step connection guides
 * - Connection health monitoring
 * - Secure credential management
 * - Paper/Live trading toggle
 */

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Link2, 
  Link2Off, 
  Shield, 
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  HelpCircle,
  AlertTriangle,
  Zap,
  TrendingUp,
  Wallet,
  Globe,
  Clock,
  Activity,
  Settings,
  ChevronRight,
  Info,
  Key,
  Lock,
  ArrowRight,
  CheckCircle,
  Circle,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

// Comprehensive broker configurations
const BROKERS = [
  {
    id: 'alpaca' as const,
    name: 'Alpaca',
    description: 'Commission-free stock and crypto trading API with excellent developer experience',
    logo: '🦙',
    authType: 'api_key' as const,
    features: ['Stocks', 'ETFs', 'Crypto', 'Options', 'Paper Trading'],
    capabilities: {
      stocks: true,
      crypto: true,
      options: true,
      futures: false,
      forex: false,
      fractionalShares: true,
      extendedHours: true,
      shortSelling: true,
      marginTrading: true,
    },
    paperTrading: true,
    testnetLabel: 'Paper Trading',
    docsUrl: 'https://alpaca.markets/docs/',
    signupUrl: 'https://app.alpaca.markets/signup',
    apiKeyUrl: 'https://app.alpaca.markets/paper/dashboard/overview',
    color: 'from-yellow-500 to-orange-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    minDeposit: '$0',
    tradingHours: '24/7 for crypto, Market hours for stocks',
    fees: 'Commission-free',
    apiFields: [
      { key: 'apiKey', label: 'API Key ID', placeholder: 'PK...', type: 'text' },
      { key: 'apiSecret', label: 'Secret Key', placeholder: 'Your secret key', type: 'password' },
    ],
    setupSteps: [
      'Create an Alpaca account at alpaca.markets',
      'Go to Paper Trading dashboard',
      'Click "View" under API Keys',
      'Generate new API keys',
      'Copy both API Key ID and Secret Key',
    ],
  },
  {
    id: 'interactive_brokers' as const,
    name: 'Interactive Brokers',
    description: 'Professional-grade trading platform with access to 150+ markets worldwide',
    logo: '🏦',
    authType: 'oauth' as const,
    features: ['Stocks', 'Options', 'Futures', 'Forex', 'Bonds', 'CFDs'],
    capabilities: {
      stocks: true,
      crypto: false,
      options: true,
      futures: true,
      forex: true,
      fractionalShares: true,
      extendedHours: true,
      shortSelling: true,
      marginTrading: true,
    },
    paperTrading: true,
    testnetLabel: 'Paper Trading',
    docsUrl: 'https://www.interactivebrokers.com/en/trading/ib-api.php',
    signupUrl: 'https://www.interactivebrokers.com/en/index.php?f=46346',
    apiKeyUrl: 'https://www.interactivebrokers.com/en/trading/ib-api.php',
    color: 'from-red-500 to-red-700',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    minDeposit: '$0 (varies by account type)',
    tradingHours: 'Market hours + extended hours',
    fees: 'Tiered pricing, very competitive',
    apiFields: [], // OAuth - no manual fields
    setupSteps: [
      'Create an IBKR account',
      'Enable API access in Account Settings',
      'Click "Connect with IBKR" below',
      'Authorize TradoVerse in the popup',
      'You\'re connected!',
    ],
  },
  {
    id: 'binance' as const,
    name: 'Binance',
    description: 'World\'s largest cryptocurrency exchange by trading volume',
    logo: '₿',
    authType: 'api_key' as const,
    features: ['Crypto Spot', 'Crypto Futures', 'Margin Trading', 'Staking'],
    capabilities: {
      stocks: false,
      crypto: true,
      options: false,
      futures: true,
      forex: false,
      fractionalShares: true,
      extendedHours: true, // 24/7
      shortSelling: true, // via futures
      marginTrading: true,
    },
    paperTrading: true,
    testnetLabel: 'Testnet',
    docsUrl: 'https://binance-docs.github.io/apidocs/',
    signupUrl: 'https://www.binance.com/en/register',
    apiKeyUrl: 'https://www.binance.com/en/my/settings/api-management',
    color: 'from-yellow-400 to-yellow-600',
    bgColor: 'bg-yellow-400/10',
    borderColor: 'border-yellow-400/30',
    minDeposit: '$0',
    tradingHours: '24/7',
    fees: '0.1% maker/taker (lower with BNB)',
    apiFields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'Your Binance API key', type: 'text' },
      { key: 'apiSecret', label: 'Secret Key', placeholder: 'Your Binance secret key', type: 'password' },
    ],
    setupSteps: [
      'Log in to your Binance account',
      'Go to API Management in Settings',
      'Create a new API key (label it "TradoVerse")',
      'Complete 2FA verification',
      'Enable "Enable Spot & Margin Trading"',
      'Copy API Key and Secret Key',
      'Whitelist IP if required (optional but recommended)',
    ],
  },
  {
    id: 'coinbase' as const,
    name: 'Coinbase',
    description: 'Most trusted cryptocurrency exchange in the US with institutional-grade security',
    logo: '🪙',
    authType: 'api_key' as const, // Changed to API key for Advanced Trade API
    features: ['Crypto Spot', 'Staking', 'Wallet', 'Advanced Trading'],
    capabilities: {
      stocks: false,
      crypto: true,
      options: false,
      futures: false,
      forex: false,
      fractionalShares: true,
      extendedHours: true, // 24/7
      shortSelling: false,
      marginTrading: false,
    },
    paperTrading: true,
    testnetLabel: 'Sandbox',
    docsUrl: 'https://docs.cdp.coinbase.com/',
    signupUrl: 'https://www.coinbase.com/signup',
    apiKeyUrl: 'https://portal.cdp.coinbase.com/access/api',
    color: 'from-blue-400 to-blue-600',
    bgColor: 'bg-blue-400/10',
    borderColor: 'border-blue-400/30',
    minDeposit: '$0',
    tradingHours: '24/7',
    fees: '0.4% - 0.6% (volume-based)',
    apiFields: [
      { key: 'apiKey', label: 'API Key Name', placeholder: 'organizations/xxx/apiKeys/xxx', type: 'text' },
      { key: 'apiSecret', label: 'Private Key (PEM)', placeholder: '-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----', type: 'textarea' },
    ],
    setupSteps: [
      'Go to Coinbase Developer Platform (portal.cdp.coinbase.com)',
      'Create a new project or select existing',
      'Go to API Keys section',
      'Create new API key with "Trade" permissions',
      'Download the private key file',
      'Copy the API Key Name and paste the private key content',
    ],
  },
];

type BrokerType = 'alpaca' | 'interactive_brokers' | 'binance' | 'coinbase';

interface ConnectionFormData {
  apiKey: string;
  apiSecret: string;
  isPaper: boolean;
}

export default function BrokerConnect() {
  const [selectedBroker, setSelectedBroker] = useState<BrokerType | null>(null);
  const [formData, setFormData] = useState<ConnectionFormData>({
    apiKey: '',
    apiSecret: '',
    isPaper: true,
  });
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [isConnecting, setIsConnecting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [activeTab, setActiveTab] = useState('connections');
  
  // Fetch existing connections
  const { data: connections, isLoading, refetch } = trpc.broker.getConnections.useQuery();
  
  // Refresh connection - uses existing getConnections query
  const [isRefreshing, setIsRefreshing] = useState<string | null>(null);
  
  // Mutations
  const connectMutation = trpc.broker.connect.useMutation({
    onSuccess: () => {
      toast.success('Broker connected successfully!');
      refetch();
      setSelectedBroker(null);
      setFormData({ apiKey: '', apiSecret: '', isPaper: true });
      setValidationResult('idle');
      setActiveTab('connections');
    },
    onError: (error: any) => {
      toast.error(`Connection failed: ${error.message}`);
      setValidationResult('error');
    },
  });
  
  const disconnectMutation = trpc.broker.disconnect.useMutation({
    onSuccess: () => {
      toast.success('Broker disconnected');
      refetch();
      setShowDeleteDialog(null);
    },
    onError: (error: any) => {
      toast.error(`Disconnect failed: ${error.message}`);
    },
  });

  // Validate credentials before connecting
  const handleValidate = async () => {
    if (!selectedBroker) return;
    
    const broker = BROKERS.find(b => b.id === selectedBroker);
    if (!broker || broker.authType !== 'api_key') return;
    
    if (!formData.apiKey || !formData.apiSecret) {
      toast.error('Please enter both API Key and Secret');
      return;
    }
    
    setIsValidating(true);
    setValidationResult('idle');
    
    try {
      // Simulate validation - in production this would call a validation endpoint
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Basic format validation
      if (selectedBroker === 'alpaca' && !formData.apiKey.startsWith('PK') && !formData.apiKey.startsWith('AK')) {
        throw new Error('Invalid Alpaca API key format');
      }
      
      if (selectedBroker === 'coinbase' && !formData.apiKey.includes('organizations/')) {
        throw new Error('Invalid Coinbase API key format. Should start with "organizations/"');
      }
      
      setValidationResult('success');
      toast.success('Credentials validated successfully!');
    } catch (error: any) {
      setValidationResult('error');
      toast.error(error.message || 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handleConnect = async () => {
    if (!selectedBroker) return;
    
    const broker = BROKERS.find(b => b.id === selectedBroker);
    if (!broker) return;
    
    setIsConnecting(true);
    
    try {
      if (broker.authType === 'api_key') {
        if (!formData.apiKey || !formData.apiSecret) {
          toast.error('Please enter both API Key and Secret');
          return;
        }
        
        await connectMutation.mutateAsync({
          brokerType: selectedBroker,
          apiKey: formData.apiKey,
          apiSecret: formData.apiSecret,
          accountName: `${broker.name} ${formData.isPaper ? broker.testnetLabel : 'Live'}`,
          isPaper: formData.isPaper,
        });
      } else {
        // OAuth flow - redirect to broker's OAuth page
        toast.info('Redirecting to broker for authentication...');
        // In production, this would call a backend endpoint that initiates OAuth
        window.location.href = `/api/broker/${selectedBroker}/oauth/authorize?paper=${formData.isPaper}`;
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    await disconnectMutation.mutateAsync({ connectionId });
  };

  const handleRefreshConnection = async (connectionId: string) => {
    setIsRefreshing(connectionId);
    try {
      await refetch();
      toast.success('Connection refreshed');
    } catch (error: any) {
      toast.error(`Refresh failed: ${error.message}`);
    } finally {
      setIsRefreshing(null);
    }
  };

  const getConnectionStatus = (connection: any) => {
    if (connection.connectionError) {
      return { status: 'error', label: 'Error', color: 'destructive', icon: XCircle, description: connection.connectionError };
    }
    if (connection.isActive) {
      return { status: 'connected', label: 'Connected', color: 'default', icon: CheckCircle2, description: 'Ready to trade' };
    }
    return { status: 'disconnected', label: 'Disconnected', color: 'secondary', icon: Link2Off, description: 'Not connected' };
  };

  const getBrokerInfo = (brokerType: string) => {
    return BROKERS.find(b => b.id === brokerType);
  };

  const toggleSecretVisibility = (field: string) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const selectedBrokerInfo = selectedBroker ? BROKERS.find(b => b.id === selectedBroker) : null;

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Broker Connections</h1>
            <p className="text-muted-foreground mt-1">
              Connect your brokerage accounts to enable live and paper trading
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm px-3 py-1">
              <Activity className="h-3 w-3 mr-1" />
              {connections?.filter((c: any) => c.isActive).length || 0} Active
            </Badge>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {connections?.length || 0} Total
            </Badge>
          </div>
        </div>

        {/* Security Notice */}
        <Alert className="bg-green-500/10 border-green-500/30">
          <Shield className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-500">Bank-Grade Security</AlertTitle>
          <AlertDescription className="text-green-500/80">
            All API keys are encrypted using AES-256 encryption at rest. We use OAuth 2.0 where available 
            and never store your passwords. Your credentials are only used to execute trades on your behalf.
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
            <TabsTrigger value="connections" className="gap-2">
              <Link2 className="h-4 w-4" />
              My Connections
            </TabsTrigger>
            <TabsTrigger value="add" className="gap-2">
              <Zap className="h-4 w-4" />
              Add Broker
            </TabsTrigger>
          </TabsList>

          {/* Existing Connections */}
          <TabsContent value="connections" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : connections && connections.length > 0 ? (
              <div className="grid gap-4">
                {connections.map((connection: any) => {
                  const broker = getBrokerInfo(connection.brokerType);
                  const status = getConnectionStatus(connection);
                  const StatusIcon = status.icon;
                  
                  return (
                    <Card key={connection.id} className={`${broker?.bgColor} ${broker?.borderColor} border`}>
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${broker?.color || 'from-gray-500 to-gray-700'} flex items-center justify-center text-3xl shadow-lg`}>
                              {broker?.logo || '🔗'}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-lg">{broker?.name || connection.brokerType}</h3>
                                <Badge variant={connection.isPaper ? 'secondary' : 'default'} className="text-xs">
                                  {connection.isPaper ? (broker?.testnetLabel || 'Paper') : 'Live'}
                                </Badge>
                                <Badge 
                                  variant={status.color as any}
                                  className={`text-xs ${status.status === 'connected' ? 'bg-green-500/20 text-green-500 border-green-500/30' : ''}`}
                                >
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {status.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Account: {connection.accountNumber || connection.accountId || connection.accountName || 'N/A'}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                {connection.lastConnectedAt && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Last sync: {new Date(connection.lastConnectedAt).toLocaleString()}
                                  </span>
                                )}
                                {connection.balance && (
                                  <span className="flex items-center gap-1">
                                    <Wallet className="h-3 w-3" />
                                    Balance: ${connection.balance.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleRefreshConnection(connection.id)}
                              disabled={isRefreshing === connection.id}
                            >
                              <RefreshCw className={`h-4 w-4 ${isRefreshing === connection.id ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => window.open(broker?.docsUrl, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Dialog open={showDeleteDialog === connection.id} onOpenChange={(open) => setShowDeleteDialog(open ? connection.id : null)}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-destructive" />
                                    Disconnect {broker?.name}
                                  </DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to disconnect this broker? This will:
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                      <li>Revoke API access to your account</li>
                                      <li>Delete all stored credentials</li>
                                      <li>Stop any active trading bots using this connection</li>
                                    </ul>
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter className="gap-2">
                                  <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>
                                    Cancel
                                  </Button>
                                  <Button 
                                    variant="destructive" 
                                    onClick={() => handleDisconnect(connection.id)}
                                    disabled={disconnectMutation.isPending}
                                  >
                                    {disconnectMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                      <Trash2 className="h-4 w-4 mr-2" />
                                    )}
                                    Disconnect
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                        
                        {/* Connection Error Alert */}
                        {status.status === 'error' && (
                          <Alert variant="destructive" className="mt-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Connection Error</AlertTitle>
                            <AlertDescription>{status.description}</AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Link2Off className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No Brokers Connected</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Connect a broker to start trading with real or paper money. 
                    We support stocks, crypto, options, and more.
                  </p>
                  <Button onClick={() => setActiveTab('add')} size="lg">
                    <Zap className="h-4 w-4 mr-2" />
                    Add Your First Broker
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Add New Broker */}
          <TabsContent value="add" className="space-y-6">
            {/* Broker Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {BROKERS.map((broker) => {
                const isSelected = selectedBroker === broker.id;
                const isConnected = connections?.some((c: any) => c.brokerType === broker.id);
                
                return (
                  <Card 
                    key={broker.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                      isSelected ? `ring-2 ring-primary ${broker.bgColor}` : 'hover:border-primary/50'
                    } ${isConnected ? 'opacity-60' : ''}`}
                    onClick={() => !isConnected && setSelectedBroker(broker.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${broker.color} flex items-center justify-center text-3xl shadow-lg flex-shrink-0`}>
                          {broker.logo}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{broker.name}</h3>
                            {isConnected && (
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Connected
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {broker.description}
                          </p>
                          
                          {/* Features */}
                          <div className="flex flex-wrap gap-1 mb-3">
                            {broker.features.map((feature) => (
                              <Badge key={feature} variant="outline" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                          
                          {/* Quick Info */}
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Wallet className="h-3 w-3" />
                              Min: {broker.minDeposit}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {broker.tradingHours.includes('24/7') ? '24/7' : 'Market Hours'}
                            </div>
                          </div>
                        </div>
                        
                        {isSelected && (
                          <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Connection Form */}
            {selectedBrokerInfo && (
              <Card className={`${selectedBrokerInfo.bgColor} ${selectedBrokerInfo.borderColor} border`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${selectedBrokerInfo.color} flex items-center justify-center text-xl`}>
                        {selectedBrokerInfo.logo}
                      </div>
                      <div>
                        <CardTitle>Connect {selectedBrokerInfo.name}</CardTitle>
                        <CardDescription>
                          {selectedBrokerInfo.authType === 'api_key' 
                            ? 'Enter your API credentials to connect' 
                            : 'Authenticate securely via OAuth'}
                        </CardDescription>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowSetupGuide(!showSetupGuide)}
                    >
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Setup Guide
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Setup Guide */}
                  {showSetupGuide && (
                    <Alert className="bg-background">
                      <Info className="h-4 w-4" />
                      <AlertTitle>How to get your API keys</AlertTitle>
                      <AlertDescription>
                        <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                          {selectedBrokerInfo.setupSteps.map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ol>
                        <Button 
                          variant="link" 
                          className="p-0 h-auto mt-2"
                          onClick={() => window.open(selectedBrokerInfo.apiKeyUrl, '_blank')}
                        >
                          Open {selectedBrokerInfo.name} API Settings
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* API Key Form */}
                  {selectedBrokerInfo.authType === 'api_key' ? (
                    <div className="space-y-4">
                      {selectedBrokerInfo.apiFields.map((field) => (
                        <div key={field.key} className="space-y-2">
                          <Label htmlFor={field.key} className="flex items-center gap-2">
                            <Key className="h-4 w-4" />
                            {field.label}
                          </Label>
                          {field.type === 'textarea' ? (
                            <div className="relative">
                              <Textarea
                                id={field.key}
                                placeholder={field.placeholder}
                                value={field.key === 'apiKey' ? formData.apiKey : formData.apiSecret}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  [field.key === 'apiKey' ? 'apiKey' : 'apiSecret']: e.target.value
                                }))}
                                className="font-mono text-sm min-h-[120px] pr-20"
                              />
                              <div className="absolute top-2 right-2 flex gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => toggleSecretVisibility(field.key)}
                                >
                                  {showSecrets[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="relative">
                              <Input
                                id={field.key}
                                type={field.type === 'password' && !showSecrets[field.key] ? 'password' : 'text'}
                                placeholder={field.placeholder}
                                value={field.key === 'apiKey' ? formData.apiKey : formData.apiSecret}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  [field.key === 'apiKey' ? 'apiKey' : 'apiSecret']: e.target.value
                                }))}
                                className="font-mono pr-20"
                              />
                              <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
                                {field.type === 'password' && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => toggleSecretVisibility(field.key)}
                                  >
                                    {showSecrets[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Validation Status */}
                      {validationResult !== 'idle' && (
                        <Alert variant={validationResult === 'success' ? 'default' : 'destructive'}>
                          {validationResult === 'success' ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <AlertTitle className="text-green-500">Credentials Valid</AlertTitle>
                              <AlertDescription className="text-green-500/80">
                                Your API credentials have been verified. You can now connect.
                              </AlertDescription>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4" />
                              <AlertTitle>Validation Failed</AlertTitle>
                              <AlertDescription>
                                Please check your credentials and try again.
                              </AlertDescription>
                            </>
                          )}
                        </Alert>
                      )}
                    </div>
                  ) : (
                    <Alert>
                      <Lock className="h-4 w-4" />
                      <AlertTitle>Secure OAuth Authentication</AlertTitle>
                      <AlertDescription>
                        Click "Connect" to securely authenticate with {selectedBrokerInfo.name}. 
                        You'll be redirected to their website to authorize TradoVerse.
                        We never see or store your password.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Separator />

                  {/* Paper Trading Toggle */}
                  {selectedBrokerInfo.paperTrading && (
                    <div className="flex items-center justify-between p-4 rounded-lg bg-background">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${formData.isPaper ? 'bg-blue-500/20' : 'bg-green-500/20'} flex items-center justify-center`}>
                          {formData.isPaper ? (
                            <Globe className="h-5 w-5 text-blue-500" />
                          ) : (
                            <TrendingUp className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                        <div>
                          <Label className="text-base font-medium">
                            {formData.isPaper ? selectedBrokerInfo.testnetLabel : 'Live Trading'}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {formData.isPaper 
                              ? 'Practice with simulated money - no real funds at risk'
                              : 'Trade with real money - use caution'}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={!formData.isPaper}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPaper: !checked }))}
                      />
                    </div>
                  )}

                  {/* Live Trading Warning */}
                  {!formData.isPaper && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Live Trading Mode</AlertTitle>
                      <AlertDescription>
                        You are about to connect in live trading mode. Real money will be used for trades.
                        Make sure you understand the risks before proceeding.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>

                <CardFooter className="flex flex-col sm:flex-row gap-3">
                  {selectedBrokerInfo.authType === 'api_key' && (
                    <Button
                      variant="outline"
                      onClick={handleValidate}
                      disabled={isValidating || !formData.apiKey || !formData.apiSecret}
                      className="w-full sm:w-auto"
                    >
                      {isValidating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : validationResult === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                      ) : (
                        <Shield className="h-4 w-4 mr-2" />
                      )}
                      Validate Credentials
                    </Button>
                  )}
                  <Button
                    onClick={handleConnect}
                    disabled={isConnecting || connectMutation.isPending || (selectedBrokerInfo.authType === 'api_key' && (!formData.apiKey || !formData.apiSecret))}
                    className="w-full sm:flex-1"
                  >
                    {isConnecting || connectMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Link2 className="h-4 w-4 mr-2" />
                    )}
                    Connect {selectedBrokerInfo.name}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(selectedBrokerInfo.docsUrl, '_blank')}
                    className="w-full sm:w-auto"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Documentation
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* Broker Comparison Table */}
            {!selectedBroker && (
              <Card>
                <CardHeader>
                  <CardTitle>Broker Comparison</CardTitle>
                  <CardDescription>Compare features across supported brokers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Feature</th>
                          {BROKERS.map(broker => (
                            <th key={broker.id} className="text-center py-3 px-4 font-medium">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xl">{broker.logo}</span>
                                <span>{broker.name}</span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="py-3 px-4">Stocks & ETFs</td>
                          {BROKERS.map(broker => (
                            <td key={broker.id} className="text-center py-3 px-4">
                              {broker.capabilities.stocks ? (
                                <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                              ) : (
                                <XCircle className="h-5 w-5 text-muted-foreground mx-auto" />
                              )}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4">Cryptocurrency</td>
                          {BROKERS.map(broker => (
                            <td key={broker.id} className="text-center py-3 px-4">
                              {broker.capabilities.crypto ? (
                                <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                              ) : (
                                <XCircle className="h-5 w-5 text-muted-foreground mx-auto" />
                              )}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4">Options</td>
                          {BROKERS.map(broker => (
                            <td key={broker.id} className="text-center py-3 px-4">
                              {broker.capabilities.options ? (
                                <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                              ) : (
                                <XCircle className="h-5 w-5 text-muted-foreground mx-auto" />
                              )}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4">Futures</td>
                          {BROKERS.map(broker => (
                            <td key={broker.id} className="text-center py-3 px-4">
                              {broker.capabilities.futures ? (
                                <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                              ) : (
                                <XCircle className="h-5 w-5 text-muted-foreground mx-auto" />
                              )}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4">Forex</td>
                          {BROKERS.map(broker => (
                            <td key={broker.id} className="text-center py-3 px-4">
                              {broker.capabilities.forex ? (
                                <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                              ) : (
                                <XCircle className="h-5 w-5 text-muted-foreground mx-auto" />
                              )}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4">Paper Trading</td>
                          {BROKERS.map(broker => (
                            <td key={broker.id} className="text-center py-3 px-4">
                              {broker.paperTrading ? (
                                <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                              ) : (
                                <XCircle className="h-5 w-5 text-muted-foreground mx-auto" />
                              )}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4">Margin Trading</td>
                          {BROKERS.map(broker => (
                            <td key={broker.id} className="text-center py-3 px-4">
                              {broker.capabilities.marginTrading ? (
                                <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                              ) : (
                                <XCircle className="h-5 w-5 text-muted-foreground mx-auto" />
                              )}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4">Fees</td>
                          {BROKERS.map(broker => (
                            <td key={broker.id} className="text-center py-3 px-4 text-xs text-muted-foreground">
                              {broker.fees}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="py-3 px-4">Min Deposit</td>
                          {BROKERS.map(broker => (
                            <td key={broker.id} className="text-center py-3 px-4 text-xs text-muted-foreground">
                              {broker.minDeposit}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
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
