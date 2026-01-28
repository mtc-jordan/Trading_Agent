/**
 * Broker Asset Class Selector
 * 
 * Shows which brokers support each asset class and allows
 * users to select the appropriate broker for trading.
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Zap, 
  Shield, 
  TrendingUp,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useBroker, BrokerType } from '@/contexts/BrokerContext';
import { useAssetClass, AssetClass } from '@/contexts/AssetClassContext';
import { cn } from '@/lib/utils';

// Broker capabilities (simplified version for frontend)
interface BrokerAssetSupport {
  brokerType: BrokerType;
  name: string;
  logo: string;
  color: string;
  supportedAssets: {
    stocks: boolean;
    crypto: boolean;
    options: boolean;
  };
  features: {
    paperTrading: boolean;
    fractionalShares: boolean;
    extendedHours: boolean;
    commission: string;
  };
  status: 'active' | 'coming_soon';
}

const BROKER_ASSET_SUPPORT: BrokerAssetSupport[] = [
  {
    brokerType: 'alpaca',
    name: 'Alpaca',
    logo: '🦙',
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    supportedAssets: { stocks: true, crypto: true, options: true },
    features: {
      paperTrading: true,
      fractionalShares: true,
      extendedHours: true,
      commission: 'Free'
    },
    status: 'active'
  },
  {
    brokerType: 'interactive_brokers',
    name: 'Interactive Brokers',
    logo: '🏛️',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    supportedAssets: { stocks: true, crypto: true, options: true },
    features: {
      paperTrading: true,
      fractionalShares: true,
      extendedHours: true,
      commission: '$0.005/share'
    },
    status: 'coming_soon'
  },
  {
    brokerType: 'binance',
    name: 'Binance',
    logo: '🔶',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    supportedAssets: { stocks: false, crypto: true, options: false },
    features: {
      paperTrading: true,
      fractionalShares: true,
      extendedHours: false,
      commission: '0.1%'
    },
    status: 'coming_soon'
  },
  {
    brokerType: 'coinbase',
    name: 'Coinbase',
    logo: '🪙',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    supportedAssets: { stocks: false, crypto: true, options: false },
    features: {
      paperTrading: false,
      fractionalShares: true,
      extendedHours: false,
      commission: '0.6%'
    },
    status: 'coming_soon'
  },
  {
    brokerType: 'schwab',
    name: 'Charles Schwab',
    logo: '💼',
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    supportedAssets: { stocks: true, crypto: false, options: true },
    features: {
      paperTrading: false,
      fractionalShares: true,
      extendedHours: true,
      commission: 'Free'
    },
    status: 'coming_soon'
  }
];

const ASSET_CLASS_INFO = {
  stocks: {
    icon: '📈',
    label: 'Stocks & ETFs',
    description: 'Trade US stocks and ETFs',
    tradingHours: '9:30 AM - 4:00 PM ET'
  },
  crypto: {
    icon: '₿',
    label: 'Cryptocurrency',
    description: 'Trade crypto 24/7',
    tradingHours: '24/7'
  },
  options: {
    icon: '📊',
    label: 'Options',
    description: 'Trade stock options',
    tradingHours: '9:30 AM - 4:00 PM ET'
  }
};

interface BrokerAssetClassSelectorProps {
  onBrokerSelect?: (brokerType: BrokerType) => void;
  compact?: boolean;
}

export function BrokerAssetClassSelector({ onBrokerSelect, compact = false }: BrokerAssetClassSelectorProps) {
  const { assetClass, setAssetClass } = useAssetClass();
  const { connectedBrokers, activeBroker, selectBroker } = useBroker();

  // Get brokers that support the current asset class
  const supportingBrokers = useMemo(() => {
    return BROKER_ASSET_SUPPORT.filter(broker => {
      const assetKey = assetClass as keyof typeof broker.supportedAssets;
      return broker.supportedAssets[assetKey];
    });
  }, [assetClass]);

  // Get connected brokers that support the current asset class
  const connectedSupportingBrokers = useMemo(() => {
    return supportingBrokers.filter(broker => 
      connectedBrokers.some(cb => cb.brokerType === broker.brokerType) && 
      broker.status === 'active'
    );
  }, [supportingBrokers, connectedBrokers]);

  // Check if current active broker supports the selected asset class
  const activeBrokerSupportsAsset = useMemo(() => {
    if (!activeBroker) return false;
    const brokerSupport = BROKER_ASSET_SUPPORT.find(b => b.brokerType === activeBroker.brokerType);
    if (!brokerSupport) return false;
    const assetKey = assetClass as keyof typeof brokerSupport.supportedAssets;
    return brokerSupport.supportedAssets[assetKey];
  }, [activeBroker, assetClass]);

  const handleAssetClassChange = (newAssetClass: AssetClass) => {
    setAssetClass(newAssetClass);
    
    // If current broker doesn't support the new asset class, try to auto-switch
    if (activeBroker) {
      const brokerSupport = BROKER_ASSET_SUPPORT.find(b => b.brokerType === activeBroker.brokerType);
      if (!brokerSupport) return;
      const assetKey = newAssetClass as keyof typeof brokerSupport.supportedAssets;
      
      if (!brokerSupport?.supportedAssets[assetKey]) {
        // Find a connected broker that supports this asset class
        const supportingConnectedBroker = connectedBrokers.find(cb => {
          const support = BROKER_ASSET_SUPPORT.find(b => b.brokerType === cb.brokerType);
          return support?.supportedAssets[assetKey] && support.status === 'active';
        });
        
        if (supportingConnectedBroker) {
          selectBroker(supportingConnectedBroker.id);
        }
      }
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <TooltipProvider>
          {(['stocks', 'crypto', 'options'] as AssetClass[]).map((asset) => {
            const info = ASSET_CLASS_INFO[asset];
            const isActive = assetClass === asset;
            const brokerCount = BROKER_ASSET_SUPPORT.filter(b => {
              const assetKey = asset as keyof typeof b.supportedAssets;
              return b.supportedAssets[assetKey] && b.status === 'active';
            }).length;
            
            return (
              <Tooltip key={asset}>
                <TooltipTrigger asChild>
                  <Button
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleAssetClassChange(asset)}
                    className={cn(
                      'gap-1.5',
                      isActive && 'bg-primary text-primary-foreground'
                    )}
                  >
                    <span>{info.icon}</span>
                    <span className="hidden sm:inline">{info.label}</span>
                    {asset === 'crypto' && (
                      <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 bg-green-500/20 text-green-400 border-green-500/30">
                        24/7
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm">
                    <p className="font-medium">{info.label}</p>
                    <p className="text-muted-foreground">{info.description}</p>
                    <p className="text-xs mt-1">
                      <Clock className="inline h-3 w-3 mr-1" />
                      {info.tradingHours}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {brokerCount} broker{brokerCount !== 1 ? 's' : ''} available
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Multi-Asset Trading
        </CardTitle>
        <CardDescription>
          Select asset class and broker for trading
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={assetClass} onValueChange={(v) => handleAssetClassChange(v as AssetClass)}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            {(['stocks', 'crypto', 'options'] as AssetClass[]).map((asset) => {
              const info = ASSET_CLASS_INFO[asset];
              return (
                <TabsTrigger key={asset} value={asset} className="gap-1.5">
                  <span>{info.icon}</span>
                  <span className="hidden sm:inline">{info.label.split(' ')[0]}</span>
                  {asset === 'crypto' && (
                    <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 bg-green-500/20 text-green-400 border-green-500/30">
                      24/7
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(['stocks', 'crypto', 'options'] as AssetClass[]).map((asset) => {
            const info = ASSET_CLASS_INFO[asset];
            const assetBrokers = BROKER_ASSET_SUPPORT.filter(b => {
              const assetKey = asset as keyof typeof b.supportedAssets;
              return b.supportedAssets[assetKey];
            });

            return (
              <TabsContent key={asset} value={asset} className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{info.description}</span>
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {info.tradingHours}
                  </Badge>
                </div>

                {/* Active broker warning */}
                {activeBroker && !activeBrokerSupportsAsset && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>
                      {activeBroker.accountName} doesn't support {info.label}. 
                      {connectedSupportingBrokers.length > 0 
                        ? ' Select a different broker below.'
                        : ' Connect a broker that supports this asset class.'}
                    </span>
                  </div>
                )}

                {/* Broker list */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Available Brokers</p>
                  <div className="grid gap-2">
                    {assetBrokers.map((broker) => {
                      const isConnected = connectedBrokers.some(cb => cb.brokerType === broker.brokerType);
                      const isActive = activeBroker?.brokerType === broker.brokerType;
                      const isComingSoon = broker.status === 'coming_soon';

                      return (
                        <div
                          key={broker.brokerType}
                          className={cn(
                            'flex items-center justify-between p-3 rounded-lg border transition-colors',
                            isActive && 'border-primary bg-primary/5',
                            isConnected && !isActive && 'border-green-500/30 bg-green-500/5',
                            isComingSoon && 'opacity-60',
                            !isConnected && !isComingSoon && 'border-border hover:border-muted-foreground/50'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn('text-2xl p-2 rounded-lg', broker.color)}>
                              {broker.logo}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{broker.name}</span>
                                {isConnected && (
                                  <Badge variant="outline" className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">
                                    Connected
                                  </Badge>
                                )}
                                {isComingSoon && (
                                  <Badge variant="outline" className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30">
                                    Coming Soon
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                <span>{broker.features.commission}</span>
                                {broker.features.fractionalShares && (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                    Fractional
                                  </span>
                                )}
                                {broker.features.paperTrading && (
                                  <span className="flex items-center gap-1">
                                    <Shield className="h-3 w-3 text-blue-500" />
                                    Paper
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {isConnected && !isComingSoon ? (
                            <Button
                              size="sm"
                              variant={isActive ? 'default' : 'outline'}
                              onClick={() => {
                                const connection = connectedBrokers.find(cb => cb.brokerType === broker.brokerType);
                                if (connection) {
                                  selectBroker(connection.id);
                                  onBrokerSelect?.(broker.brokerType);
                                }
                              }}
                            >
                              {isActive ? 'Active' : 'Select'}
                            </Button>
                          ) : isComingSoon ? (
                            <Button size="sm" variant="ghost" disabled>
                              Coming Soon
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" asChild>
                              <a href="/brokers">Connect</a>
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* No connected broker warning */}
                {connectedSupportingBrokers.length === 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-sm">
                    <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">
                      No connected broker supports {info.label}. 
                      <a href="/brokers" className="text-primary hover:underline ml-1">
                        Connect a broker
                      </a>
                    </span>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}

/**
 * Broker Support Matrix
 * 
 * Shows a comparison table of which brokers support which asset classes
 */
export function BrokerSupportMatrix() {
  const { connectedBrokers } = useBroker();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Broker Support Matrix</CardTitle>
        <CardDescription>
          Compare broker capabilities across asset classes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4">Broker</th>
                <th className="text-center py-2 px-2">📈 Stocks</th>
                <th className="text-center py-2 px-2">₿ Crypto</th>
                <th className="text-center py-2 px-2">📊 Options</th>
                <th className="text-center py-2 px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {BROKER_ASSET_SUPPORT.map((broker) => {
                const isConnected = connectedBrokers.some(cb => cb.brokerType === broker.brokerType);
                
                return (
                  <tr key={broker.brokerType} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{broker.logo}</span>
                        <span className="font-medium">{broker.name}</span>
                        {isConnected && (
                          <Badge variant="outline" className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">
                            ✓
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="text-center py-3 px-2">
                      {broker.supportedAssets.stocks ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                      )}
                    </td>
                    <td className="text-center py-3 px-2">
                      {broker.supportedAssets.crypto ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                      )}
                    </td>
                    <td className="text-center py-3 px-2">
                      {broker.supportedAssets.options ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                      )}
                    </td>
                    <td className="text-center py-3 px-2">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          'text-[10px]',
                          broker.status === 'active' 
                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        )}
                      >
                        {broker.status === 'active' ? 'Active' : 'Coming Soon'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default BrokerAssetClassSelector;
