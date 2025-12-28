/**
 * Broker Connection Wizard
 * Multi-step onboarding flow for connecting broker accounts
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Building2, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  X, 
  Loader2, 
  Key, 
  Shield, 
  Zap,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Info,
  Sparkles
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

// Broker configuration data
const BROKER_CONFIGS = {
  alpaca: {
    name: 'Alpaca',
    description: 'Commission-free stock and crypto trading API',
    logo: '/brokers/alpaca.svg',
    features: ['Commission-free trading', 'Paper trading available', 'Real-time market data', 'Fractional shares'],
    apiKeyLabel: 'API Key ID',
    apiSecretLabel: 'API Secret Key',
    paperAvailable: true,
    docsUrl: 'https://alpaca.markets/docs/api-documentation/',
    apiKeyFormat: /^[A-Z0-9]{20}$/,
    apiSecretFormat: /^[A-Za-z0-9]{40}$/,
    setupInstructions: [
      'Log in to your Alpaca account at alpaca.markets',
      'Navigate to Paper Trading or Live Trading section',
      'Click on "API Keys" in the sidebar',
      'Generate a new API key pair',
      'Copy both the API Key ID and Secret Key'
    ],
    orderTypes: ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop', 'bracket'],
  },
  interactive_brokers: {
    name: 'Interactive Brokers',
    description: 'Professional trading platform with global market access',
    logo: '/brokers/ib.svg',
    features: ['Global market access', 'Advanced order types', 'Algorithmic trading', 'Low commissions'],
    apiKeyLabel: 'Client ID',
    apiSecretLabel: 'Client Secret',
    paperAvailable: true,
    docsUrl: 'https://www.interactivebrokers.com/en/trading/ib-api.php',
    apiKeyFormat: /^[A-Za-z0-9_-]{10,50}$/,
    apiSecretFormat: /^[A-Za-z0-9_-]{20,100}$/,
    setupInstructions: [
      'Log in to Client Portal at portal.interactivebrokers.com',
      'Go to Settings > API Settings',
      'Enable API access for your account',
      'Generate API credentials',
      'Note: You may need TWS or IB Gateway running'
    ],
    orderTypes: ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop', 'bracket', 'adaptive', 'twap', 'vwap'],
  },
  binance: {
    name: 'Binance',
    description: '24/7 cryptocurrency trading with deep liquidity',
    logo: '/brokers/binance.svg',
    features: ['24/7 crypto trading', 'Spot & futures', 'Deep liquidity', 'Low fees'],
    apiKeyLabel: 'API Key',
    apiSecretLabel: 'Secret Key',
    paperAvailable: false,
    docsUrl: 'https://binance-docs.github.io/apidocs/',
    apiKeyFormat: /^[A-Za-z0-9]{64}$/,
    apiSecretFormat: /^[A-Za-z0-9]{64}$/,
    setupInstructions: [
      'Log in to your Binance account',
      'Go to API Management in your profile',
      'Create a new API key',
      'Enable Spot & Margin Trading permissions',
      'Whitelist your IP address for security'
    ],
    orderTypes: ['market', 'limit', 'stop_loss', 'stop_loss_limit', 'take_profit', 'take_profit_limit', 'oco'],
  },
  coinbase: {
    name: 'Coinbase',
    description: 'Secure cryptocurrency trading platform',
    logo: '/brokers/coinbase.svg',
    features: ['Secure platform', 'Easy to use', 'Wide crypto selection', 'Regulated exchange'],
    apiKeyLabel: 'API Key',
    apiSecretLabel: 'API Secret',
    paperAvailable: false,
    docsUrl: 'https://docs.cloud.coinbase.com/',
    apiKeyFormat: /^[a-z0-9-]{36}$/,
    apiSecretFormat: /^[A-Za-z0-9+/=]{88}$/,
    setupInstructions: [
      'Log in to Coinbase Pro at pro.coinbase.com',
      'Go to API settings',
      'Create a new API key',
      'Select appropriate permissions (View, Trade)',
      'Save your API key, secret, and passphrase'
    ],
    orderTypes: ['market', 'limit', 'stop'],
  },
};

type BrokerType = keyof typeof BROKER_CONFIGS;

interface BrokerConnectionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialBroker?: BrokerType;
}

type WizardStep = 'select' | 'credentials' | 'verify' | 'configure' | 'complete';

export function BrokerConnectionWizard({ 
  open, 
  onOpenChange, 
  onSuccess,
  initialBroker 
}: BrokerConnectionWizardProps) {
  // Wizard state
  const [step, setStep] = useState<WizardStep>('select');
  const [selectedBroker, setSelectedBroker] = useState<BrokerType | null>(initialBroker || null);
  
  // Credentials state
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  
  // Verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    accountInfo?: {
      accountId: string;
      accountName: string;
      balance: number;
      currency: string;
      isPaper: boolean;
    };
    error?: string;
  } | null>(null);
  
  // Configuration state
  const [accountMode, setAccountMode] = useState<'paper' | 'live'>('paper');
  const [accountName, setAccountName] = useState('');
  const [enableAutoSync, setEnableAutoSync] = useState(true);
  const [syncInterval, setSyncInterval] = useState(5); // minutes
  
  // Connection state
  const [isConnecting, setIsConnecting] = useState(false);
  
  // tRPC mutations
  const verifyCredentialsMutation = trpc.broker.verifyCredentials.useMutation();
  const connectBrokerMutation = trpc.broker.connect.useMutation();
  
  // Reset wizard when closed
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('select');
        setSelectedBroker(initialBroker || null);
        setApiKey('');
        setApiSecret('');
        setVerificationResult(null);
        setAccountMode('paper');
        setAccountName('');
      }, 300);
    }
  }, [open, initialBroker]);
  
  // Get current broker config
  const brokerConfig = selectedBroker ? BROKER_CONFIGS[selectedBroker] : null;
  
  // Calculate progress
  const getProgress = () => {
    switch (step) {
      case 'select': return 20;
      case 'credentials': return 40;
      case 'verify': return 60;
      case 'configure': return 80;
      case 'complete': return 100;
      default: return 0;
    }
  };
  
  // Validate credentials format
  const validateCredentials = () => {
    if (!brokerConfig) return { valid: false, errors: [] };
    
    const errors: string[] = [];
    
    if (!apiKey.trim()) {
      errors.push(`${brokerConfig.apiKeyLabel} is required`);
    } else if (!brokerConfig.apiKeyFormat.test(apiKey)) {
      errors.push(`${brokerConfig.apiKeyLabel} format is invalid`);
    }
    
    if (!apiSecret.trim()) {
      errors.push(`${brokerConfig.apiSecretLabel} is required`);
    } else if (!brokerConfig.apiSecretFormat.test(apiSecret)) {
      errors.push(`${brokerConfig.apiSecretLabel} format is invalid`);
    }
    
    return { valid: errors.length === 0, errors };
  };
  
  // Handle broker selection
  const handleSelectBroker = (broker: BrokerType) => {
    setSelectedBroker(broker);
    setApiKey('');
    setApiSecret('');
    setVerificationResult(null);
  };
  
  // Handle credentials verification
  const handleVerifyCredentials = async () => {
    if (!selectedBroker) return;
    
    const validation = validateCredentials();
    if (!validation.valid) {
      toast.error(validation.errors[0]);
      return;
    }
    
    setIsVerifying(true);
    setVerificationResult(null);
    
    try {
      const result = await verifyCredentialsMutation.mutateAsync({
        brokerType: selectedBroker,
        apiKey,
        apiSecret,
      });
      
      setVerificationResult({
        success: true,
        accountInfo: result.accountInfo,
      });
      
      // Auto-fill account name
      if (result.accountInfo?.accountName) {
        setAccountName(result.accountInfo.accountName);
      }
      
      // Auto-select paper mode if available
      if (result.accountInfo?.isPaper !== undefined) {
        setAccountMode(result.accountInfo.isPaper ? 'paper' : 'live');
      }
      
      toast.success('Credentials verified successfully!');
    } catch (error: any) {
      setVerificationResult({
        success: false,
        error: error.message || 'Failed to verify credentials',
      });
      toast.error(error.message || 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };
  
  // Handle final connection
  const handleConnect = async () => {
    if (!selectedBroker || !verificationResult?.success) return;
    
    setIsConnecting(true);
    
    try {
      await connectBrokerMutation.mutateAsync({
        brokerType: selectedBroker,
        apiKey,
        apiSecret,
        accountName: accountName || `${brokerConfig?.name} Account`,
        isPaper: accountMode === 'paper',
        enableAutoSync,
        syncIntervalMinutes: syncInterval,
      });
      
      setStep('complete');
      toast.success('Broker connected successfully!');
      
      // Callback after short delay
      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect broker');
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Navigation handlers
  const handleNext = () => {
    switch (step) {
      case 'select':
        if (selectedBroker) setStep('credentials');
        break;
      case 'credentials':
        handleVerifyCredentials();
        break;
      case 'verify':
        if (verificationResult?.success) setStep('configure');
        break;
      case 'configure':
        handleConnect();
        break;
    }
  };
  
  const handleBack = () => {
    switch (step) {
      case 'credentials':
        setStep('select');
        break;
      case 'verify':
        setStep('credentials');
        break;
      case 'configure':
        setStep('verify');
        break;
    }
  };
  
  // After verification success, auto-advance
  useEffect(() => {
    if (verificationResult?.success && step === 'credentials') {
      setStep('verify');
    }
  }, [verificationResult, step]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Connect Broker Account
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && 'Choose a broker to connect to your TradoVerse account'}
            {step === 'credentials' && `Enter your ${brokerConfig?.name} API credentials`}
            {step === 'verify' && 'Verify your account connection'}
            {step === 'configure' && 'Configure your connection settings'}
            {step === 'complete' && 'Your broker is now connected!'}
          </DialogDescription>
        </DialogHeader>
        
        {/* Progress bar */}
        <div className="space-y-2">
          <Progress value={getProgress()} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Select Broker</span>
            <span>Credentials</span>
            <span>Verify</span>
            <span>Configure</span>
            <span>Complete</span>
          </div>
        </div>
        
        {/* Step content */}
        <div className="min-h-[300px] py-4">
          {/* Step 1: Broker Selection */}
          {step === 'select' && (
            <div className="grid grid-cols-2 gap-4">
              {(Object.entries(BROKER_CONFIGS) as [BrokerType, typeof BROKER_CONFIGS[BrokerType]][]).map(([key, config]) => (
                <Card 
                  key={key}
                  className={`cursor-pointer transition-all hover:border-primary/50 ${
                    selectedBroker === key ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => handleSelectBroker(key)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{config.name}</h3>
                          {config.paperAvailable && (
                            <Badge variant="secondary" className="text-xs">Paper</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {config.description}
                        </p>
                      </div>
                      {selectedBroker === key && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {config.features.slice(0, 2).map((feature, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {/* Step 2: Credentials Input */}
          {step === 'credentials' && brokerConfig && (
            <div className="space-y-6">
              {/* Setup instructions */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>How to get your API credentials</AlertTitle>
                <AlertDescription>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                    {brokerConfig.setupInstructions.map((instruction, i) => (
                      <li key={i}>{instruction}</li>
                    ))}
                  </ol>
                  <a 
                    href={brokerConfig.docsUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-primary hover:underline text-sm"
                  >
                    View documentation <ExternalLink className="h-3 w-3" />
                  </a>
                </AlertDescription>
              </Alert>
              
              {/* API Key input */}
              <div className="space-y-2">
                <Label htmlFor="apiKey">{brokerConfig.apiKeyLabel}</Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={`Enter your ${brokerConfig.apiKeyLabel}`}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              {/* API Secret input */}
              <div className="space-y-2">
                <Label htmlFor="apiSecret">{brokerConfig.apiSecretLabel}</Label>
                <div className="relative">
                  <Input
                    id="apiSecret"
                    type={showApiSecret ? 'text' : 'password'}
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder={`Enter your ${brokerConfig.apiSecretLabel}`}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowApiSecret(!showApiSecret)}
                  >
                    {showApiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              {/* Security note */}
              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Your API credentials are encrypted and stored securely. We never share your credentials with third parties.
                </p>
              </div>
            </div>
          )}
          
          {/* Step 3: Verification */}
          {step === 'verify' && (
            <div className="space-y-6">
              {isVerifying ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                  <p className="text-lg font-medium">Verifying credentials...</p>
                  <p className="text-sm text-muted-foreground">
                    Connecting to {brokerConfig?.name}
                  </p>
                </div>
              ) : verificationResult?.success ? (
                <div className="space-y-4">
                  <Alert className="border-green-500/50 bg-green-500/10">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertTitle className="text-green-500">Connection Verified</AlertTitle>
                    <AlertDescription>
                      Successfully connected to your {brokerConfig?.name} account
                    </AlertDescription>
                  </Alert>
                  
                  {verificationResult.accountInfo && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Account Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Account ID</p>
                            <p className="font-medium">{verificationResult.accountInfo.accountId}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Account Name</p>
                            <p className="font-medium">{verificationResult.accountInfo.accountName}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Balance</p>
                            <p className="font-medium">
                              {verificationResult.accountInfo.currency} {verificationResult.accountInfo.balance.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Account Type</p>
                            <Badge variant={verificationResult.accountInfo.isPaper ? 'secondary' : 'default'}>
                              {verificationResult.accountInfo.isPaper ? 'Paper Trading' : 'Live Trading'}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : verificationResult?.error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Verification Failed</AlertTitle>
                  <AlertDescription>
                    {verificationResult.error}
                    <Button 
                      variant="link" 
                      className="p-0 h-auto ml-2"
                      onClick={() => setStep('credentials')}
                    >
                      Try again
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>
          )}
          
          {/* Step 4: Configuration */}
          {step === 'configure' && brokerConfig && (
            <div className="space-y-6">
              {/* Account name */}
              <div className="space-y-2">
                <Label htmlFor="accountName">Account Name</Label>
                <Input
                  id="accountName"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder={`My ${brokerConfig.name} Account`}
                />
                <p className="text-xs text-muted-foreground">
                  A friendly name to identify this account
                </p>
              </div>
              
              {/* Account mode selection */}
              {brokerConfig.paperAvailable && (
                <div className="space-y-3">
                  <Label>Trading Mode</Label>
                  <RadioGroup value={accountMode} onValueChange={(v) => setAccountMode(v as 'paper' | 'live')}>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="paper" id="paper" />
                      <Label htmlFor="paper" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Paper Trading</span>
                          <Badge variant="secondary">Recommended</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Practice trading with virtual money. No real funds at risk.
                        </p>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="live" id="live" />
                      <Label htmlFor="live" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Live Trading</span>
                          <Badge variant="destructive">Real Money</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Trade with real funds. Profits and losses are real.
                        </p>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}
              
              {/* Auto-sync settings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-sync Positions</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically sync positions and balances
                    </p>
                  </div>
                  <Checkbox 
                    checked={enableAutoSync}
                    onCheckedChange={(checked) => setEnableAutoSync(!!checked)}
                  />
                </div>
                
                {enableAutoSync && (
                  <div className="space-y-2 pl-4 border-l-2 border-muted">
                    <Label htmlFor="syncInterval">Sync Interval (minutes)</Label>
                    <Input
                      id="syncInterval"
                      type="number"
                      min={1}
                      max={60}
                      value={syncInterval}
                      onChange={(e) => setSyncInterval(parseInt(e.target.value) || 5)}
                      className="w-24"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Step 5: Complete */}
          {step === 'complete' && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
                <Sparkles className="h-10 w-10 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Connection Successful!</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Your {brokerConfig?.name} account is now connected to TradoVerse. 
                You can start trading immediately.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  onOpenChange(false);
                  onSuccess?.();
                }}>
                  Start Trading
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* Navigation buttons */}
        {step !== 'complete' && (
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 'select'}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={
                (step === 'select' && !selectedBroker) ||
                (step === 'credentials' && (!apiKey || !apiSecret)) ||
                (step === 'verify' && !verificationResult?.success) ||
                isVerifying ||
                isConnecting
              }
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Verifying...
                </>
              ) : isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Connecting...
                </>
              ) : step === 'configure' ? (
                <>
                  Connect Broker
                  <Check className="h-4 w-4 ml-1" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default BrokerConnectionWizard;
