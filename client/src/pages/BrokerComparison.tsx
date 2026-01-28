/**
 * Broker Comparison Page
 * 
 * Comprehensive comparison of all supported brokers,
 * their capabilities, fees, and asset class support.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Zap, 
  Shield, 
  TrendingUp,
  DollarSign,
  Globe,
  Smartphone,
  Lock,
  ArrowRight,
  Star,
  Info
} from 'lucide-react';
import { useBroker, BrokerType } from '@/contexts/BrokerContext';
import { cn } from '@/lib/utils';

interface BrokerDetail {
  brokerType: BrokerType;
  name: string;
  logo: string;
  tagline: string;
  description: string;
  color: string;
  
  // Asset support
  assets: {
    stocks: { supported: boolean; features: string[] };
    crypto: { supported: boolean; features: string[] };
    options: { supported: boolean; features: string[] };
  };
  
  // Fees
  fees: {
    stocks: string;
    crypto: string;
    options: string;
    accountMinimum: string;
    inactivityFee: string;
  };
  
  // Features
  features: {
    paperTrading: boolean;
    fractionalShares: boolean;
    extendedHours: boolean;
    marginTrading: boolean;
    shortSelling: boolean;
    apiAccess: boolean;
    mobileApp: boolean;
    level2Data: boolean;
  };
  
  // Trading hours
  tradingHours: {
    stocks: string;
    crypto: string;
    options: string;
  };
  
  // Regions
  supportedRegions: string[];
  
  // Integration status
  status: 'active' | 'beta' | 'coming_soon';
  
  // Ratings (out of 5)
  ratings: {
    overall: number;
    fees: number;
    platform: number;
    research: number;
    mobile: number;
  };
}

const BROKER_DETAILS: BrokerDetail[] = [
  {
    brokerType: 'alpaca',
    name: 'Alpaca',
    logo: '🦙',
    tagline: 'API-First Trading Platform',
    description: 'Commission-free stock, crypto, and options trading with powerful API for algorithmic trading. Perfect for developers and automated trading strategies.',
    color: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30',
    assets: {
      stocks: { 
        supported: true, 
        features: ['US Stocks', 'ETFs', 'Fractional Shares', 'Extended Hours'] 
      },
      crypto: { 
        supported: true, 
        features: ['24/7 Trading', 'BTC, ETH, SOL', '20+ Coins', 'Fractional'] 
      },
      options: { 
        supported: true, 
        features: ['Stock Options', 'Index Options', 'Multi-leg Orders'] 
      }
    },
    fees: {
      stocks: 'Free',
      crypto: '0.25%',
      options: 'Free',
      accountMinimum: '$0',
      inactivityFee: 'None'
    },
    features: {
      paperTrading: true,
      fractionalShares: true,
      extendedHours: true,
      marginTrading: true,
      shortSelling: true,
      apiAccess: true,
      mobileApp: false,
      level2Data: false
    },
    tradingHours: {
      stocks: '4:00 AM - 8:00 PM ET',
      crypto: '24/7',
      options: '9:30 AM - 4:00 PM ET'
    },
    supportedRegions: ['United States'],
    status: 'active',
    ratings: { overall: 4.5, fees: 5, platform: 4.5, research: 3.5, mobile: 3 }
  },
  {
    brokerType: 'interactive_brokers',
    name: 'Interactive Brokers',
    logo: '🏛️',
    tagline: 'Professional Trading Platform',
    description: 'Industry-leading platform for professional traders with access to global markets, advanced tools, and competitive pricing.',
    color: 'from-red-500/20 to-rose-500/20 border-red-500/30',
    assets: {
      stocks: { 
        supported: true, 
        features: ['Global Stocks', 'ETFs', 'Fractional', '135+ Markets'] 
      },
      crypto: { 
        supported: true, 
        features: ['BTC, ETH, LTC', 'BCH', 'Limited Selection'] 
      },
      options: { 
        supported: true, 
        features: ['Stock Options', 'Index Options', 'Futures Options', 'Complex Strategies'] 
      }
    },
    fees: {
      stocks: '$0.005/share',
      crypto: '0.18%',
      options: '$0.65/contract',
      accountMinimum: '$0',
      inactivityFee: 'None'
    },
    features: {
      paperTrading: true,
      fractionalShares: true,
      extendedHours: true,
      marginTrading: true,
      shortSelling: true,
      apiAccess: true,
      mobileApp: true,
      level2Data: true
    },
    tradingHours: {
      stocks: '4:00 AM - 8:00 PM ET',
      crypto: '24/7',
      options: '9:30 AM - 4:00 PM ET'
    },
    supportedRegions: ['United States', 'Europe', 'UK', 'Canada', 'Australia', 'Hong Kong', 'Singapore', 'Japan'],
    status: 'coming_soon',
    ratings: { overall: 4.8, fees: 4.5, platform: 5, research: 5, mobile: 4 }
  },
  {
    brokerType: 'binance',
    name: 'Binance',
    logo: '🔶',
    tagline: 'World\'s Largest Crypto Exchange',
    description: 'The world\'s largest cryptocurrency exchange by trading volume with hundreds of trading pairs and advanced features.',
    color: 'from-amber-500/20 to-yellow-500/20 border-amber-500/30',
    assets: {
      stocks: { 
        supported: false, 
        features: [] 
      },
      crypto: { 
        supported: true, 
        features: ['350+ Coins', 'Spot Trading', 'Futures', 'Margin', 'Staking'] 
      },
      options: { 
        supported: false, 
        features: [] 
      }
    },
    fees: {
      stocks: 'N/A',
      crypto: '0.1%',
      options: 'N/A',
      accountMinimum: '$0',
      inactivityFee: 'None'
    },
    features: {
      paperTrading: true,
      fractionalShares: true,
      extendedHours: false,
      marginTrading: true,
      shortSelling: true,
      apiAccess: true,
      mobileApp: true,
      level2Data: true
    },
    tradingHours: {
      stocks: 'N/A',
      crypto: '24/7',
      options: 'N/A'
    },
    supportedRegions: ['Global (except US)'],
    status: 'coming_soon',
    ratings: { overall: 4.3, fees: 5, platform: 4.5, research: 3.5, mobile: 4.5 }
  },
  {
    brokerType: 'coinbase',
    name: 'Coinbase',
    logo: '🪙',
    tagline: 'Most Trusted Crypto Exchange',
    description: 'US-regulated cryptocurrency exchange known for security, ease of use, and institutional-grade custody solutions.',
    color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30',
    assets: {
      stocks: { 
        supported: false, 
        features: [] 
      },
      crypto: { 
        supported: true, 
        features: ['200+ Coins', 'Spot Trading', 'Staking', 'NFTs'] 
      },
      options: { 
        supported: false, 
        features: [] 
      }
    },
    fees: {
      stocks: 'N/A',
      crypto: '0.6%',
      options: 'N/A',
      accountMinimum: '$0',
      inactivityFee: 'None'
    },
    features: {
      paperTrading: false,
      fractionalShares: true,
      extendedHours: false,
      marginTrading: false,
      shortSelling: false,
      apiAccess: true,
      mobileApp: true,
      level2Data: true
    },
    tradingHours: {
      stocks: 'N/A',
      crypto: '24/7',
      options: 'N/A'
    },
    supportedRegions: ['United States', 'Europe', 'UK', 'Canada', 'Australia', 'Singapore'],
    status: 'coming_soon',
    ratings: { overall: 4.2, fees: 3, platform: 4.5, research: 4, mobile: 5 }
  },
  {
    brokerType: 'schwab',
    name: 'Charles Schwab',
    logo: '💼',
    tagline: 'Full-Service Brokerage',
    description: 'Comprehensive investment platform with excellent research, banking services, and retirement planning tools.',
    color: 'from-cyan-500/20 to-teal-500/20 border-cyan-500/30',
    assets: {
      stocks: { 
        supported: true, 
        features: ['US Stocks', 'ETFs', 'Mutual Funds', 'Fractional'] 
      },
      crypto: { 
        supported: false, 
        features: [] 
      },
      options: { 
        supported: true, 
        features: ['Stock Options', 'Index Options', 'Multi-leg'] 
      }
    },
    fees: {
      stocks: 'Free',
      crypto: 'N/A',
      options: '$0.65/contract',
      accountMinimum: '$0',
      inactivityFee: 'None'
    },
    features: {
      paperTrading: false,
      fractionalShares: true,
      extendedHours: true,
      marginTrading: true,
      shortSelling: true,
      apiAccess: true,
      mobileApp: true,
      level2Data: false
    },
    tradingHours: {
      stocks: '4:00 AM - 8:00 PM ET',
      crypto: 'N/A',
      options: '9:30 AM - 4:00 PM ET'
    },
    supportedRegions: ['United States'],
    status: 'coming_soon',
    ratings: { overall: 4.6, fees: 4.5, platform: 4.5, research: 5, mobile: 4.5 }
  }
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'h-3.5 w-3.5',
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : star - 0.5 <= rating
              ? 'fill-yellow-400/50 text-yellow-400'
              : 'text-muted-foreground/30'
          )}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function BrokerComparison() {
  const { connectedBrokers } = useBroker();
  const [selectedBroker, setSelectedBroker] = useState<BrokerDetail | null>(null);

  return (
    <div className="container max-w-7xl py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Broker Comparison</h1>
        <p className="text-muted-foreground">
          Compare supported brokers, their capabilities, fees, and features to find the best fit for your trading needs.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">
              {BROKER_DETAILS.filter(b => b.status === 'active').length}
            </div>
            <p className="text-sm text-muted-foreground">Active Integrations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-400">
              {BROKER_DETAILS.filter(b => b.status === 'coming_soon').length}
            </div>
            <p className="text-sm text-muted-foreground">Coming Soon</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-400">
              {connectedBrokers.length}
            </div>
            <p className="text-sm text-muted-foreground">Connected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-400">3</div>
            <p className="text-sm text-muted-foreground">Asset Classes</p>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="assets">Asset Classes</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {BROKER_DETAILS.map((broker) => {
              const isConnected = connectedBrokers.some(cb => cb.brokerType === broker.brokerType);
              
              return (
                <Card 
                  key={broker.brokerType}
                  className={cn(
                    'relative overflow-hidden transition-all hover:shadow-lg cursor-pointer',
                    `bg-gradient-to-br ${broker.color}`,
                    isConnected && 'ring-2 ring-green-500'
                  )}
                  onClick={() => setSelectedBroker(broker)}
                >
                  {isConnected && (
                    <Badge className="absolute top-2 right-2 bg-green-500">
                      Connected
                    </Badge>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{broker.logo}</span>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {broker.name}
                          {broker.status === 'coming_soon' && (
                            <Badge variant="outline" className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30">
                              Coming Soon
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{broker.tagline}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {broker.description}
                    </p>
                    
                    {/* Asset Support Icons */}
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'flex items-center gap-1 text-xs',
                        broker.assets.stocks.supported ? 'text-green-400' : 'text-muted-foreground/50'
                      )}>
                        📈 Stocks
                      </div>
                      <div className={cn(
                        'flex items-center gap-1 text-xs',
                        broker.assets.crypto.supported ? 'text-green-400' : 'text-muted-foreground/50'
                      )}>
                        ₿ Crypto
                      </div>
                      <div className={cn(
                        'flex items-center gap-1 text-xs',
                        broker.assets.options.supported ? 'text-green-400' : 'text-muted-foreground/50'
                      )}>
                        📊 Options
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center justify-between">
                      <StarRating rating={broker.ratings.overall} />
                      <Button variant="ghost" size="sm" className="gap-1">
                        Details <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Fees Tab */}
        <TabsContent value="fees">
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 pr-4">Broker</th>
                      <th className="text-center py-3 px-4">Stocks</th>
                      <th className="text-center py-3 px-4">Crypto</th>
                      <th className="text-center py-3 px-4">Options</th>
                      <th className="text-center py-3 px-4">Account Min</th>
                      <th className="text-center py-3 px-4">Inactivity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BROKER_DETAILS.map((broker) => (
                      <tr key={broker.brokerType} className="border-b last:border-0">
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{broker.logo}</span>
                            <span className="font-medium">{broker.name}</span>
                          </div>
                        </td>
                        <td className="text-center py-4 px-4">
                          <span className={broker.fees.stocks === 'Free' ? 'text-green-400 font-medium' : ''}>
                            {broker.fees.stocks}
                          </span>
                        </td>
                        <td className="text-center py-4 px-4">{broker.fees.crypto}</td>
                        <td className="text-center py-4 px-4">
                          <span className={broker.fees.options === 'Free' ? 'text-green-400 font-medium' : ''}>
                            {broker.fees.options}
                          </span>
                        </td>
                        <td className="text-center py-4 px-4 text-green-400">{broker.fees.accountMinimum}</td>
                        <td className="text-center py-4 px-4 text-green-400">{broker.fees.inactivityFee}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features">
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 pr-4">Broker</th>
                      <th className="text-center py-3 px-2">Paper</th>
                      <th className="text-center py-3 px-2">Fractional</th>
                      <th className="text-center py-3 px-2">Extended</th>
                      <th className="text-center py-3 px-2">Margin</th>
                      <th className="text-center py-3 px-2">Short</th>
                      <th className="text-center py-3 px-2">API</th>
                      <th className="text-center py-3 px-2">Mobile</th>
                      <th className="text-center py-3 px-2">L2 Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BROKER_DETAILS.map((broker) => (
                      <tr key={broker.brokerType} className="border-b last:border-0">
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{broker.logo}</span>
                            <span className="font-medium">{broker.name}</span>
                          </div>
                        </td>
                        {Object.entries(broker.features).map(([key, value]) => (
                          <td key={key} className="text-center py-4 px-2">
                            {value ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Asset Classes Tab */}
        <TabsContent value="assets">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Stocks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📈 Stocks & ETFs
                </CardTitle>
                <CardDescription>US and global equity trading</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {BROKER_DETAILS.filter(b => b.assets.stocks.supported).map((broker) => (
                  <div key={broker.brokerType} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span>{broker.logo}</span>
                      <span className="font-medium text-sm">{broker.name}</span>
                    </div>
                    <Badge variant="outline" className={
                      broker.status === 'active' 
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    }>
                      {broker.status === 'active' ? 'Active' : 'Soon'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Crypto */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  ₿ Cryptocurrency
                  <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                    24/7
                  </Badge>
                </CardTitle>
                <CardDescription>Digital asset trading</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {BROKER_DETAILS.filter(b => b.assets.crypto.supported).map((broker) => (
                  <div key={broker.brokerType} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span>{broker.logo}</span>
                      <span className="font-medium text-sm">{broker.name}</span>
                    </div>
                    <Badge variant="outline" className={
                      broker.status === 'active' 
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    }>
                      {broker.status === 'active' ? 'Active' : 'Soon'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📊 Options
                </CardTitle>
                <CardDescription>Derivatives trading</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {BROKER_DETAILS.filter(b => b.assets.options.supported).map((broker) => (
                  <div key={broker.brokerType} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span>{broker.logo}</span>
                      <span className="font-medium text-sm">{broker.name}</span>
                    </div>
                    <Badge variant="outline" className={
                      broker.status === 'active' 
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    }>
                      {broker.status === 'active' ? 'Active' : 'Soon'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Info Banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium mb-1">Multi-Broker Trading</h4>
              <p className="text-sm text-muted-foreground">
                TradoVerse supports connecting multiple brokers simultaneously. Trade stocks on Alpaca, 
                crypto on Binance, and options on Interactive Brokers - all from a single unified interface. 
                Your AI agents can automatically route orders to the best broker for each trade.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
