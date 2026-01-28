/**
 * Smart Order Router Component
 * 
 * Shows routing decision before order execution:
 * - Detects asset type (stock, crypto, forex, options)
 * - Recommends best broker based on asset type
 * - Shows alternatives and confidence level
 * - Allows manual broker override
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Zap,
  Building2,
  Bitcoin,
  TrendingUp,
  Settings2,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Asset class detection (client-side mirror of server logic)
const CRYPTO_SYMBOLS = new Set([
  'BTC', 'ETH', 'XRP', 'LTC', 'BCH', 'ADA', 'DOT', 'LINK', 'XLM', 'DOGE',
  'UNI', 'AAVE', 'SOL', 'AVAX', 'MATIC', 'ATOM', 'ALGO', 'FIL', 'TRX', 'ETC',
  'BTCUSD', 'ETHUSD', 'BTCUSDT', 'ETHUSDT', 'BNBUSD', 'SOLUSD',
  'SHIB', 'PEPE', 'FLOKI', 'BONK', 'WIF', 'ARB', 'OP', 'APT', 'SUI', 'SEI'
]);

const FOREX_PAIRS = new Set([
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY'
]);

type AssetClass = 'us_equity' | 'crypto' | 'forex' | 'options' | 'futures';
type BrokerType = 'alpaca' | 'interactive_brokers' | 'binance' | 'coinbase';

interface BrokerConnection {
  id: string;
  brokerType: BrokerType;
  isPaper: boolean;
  isActive: boolean;
}

interface RoutingDecision {
  selectedBroker: BrokerType;
  selectedConnectionId: string;
  reason: string;
  alternatives: { broker: BrokerType; connectionId: string }[];
  confidence: number;
  assetClass: AssetClass;
}

interface SmartOrderRouterProps {
  symbol: string;
  connections: BrokerConnection[];
  onBrokerSelected: (connectionId: string, brokerType: BrokerType) => void;
  selectedConnectionId?: string;
  showDetails?: boolean;
}

// Broker metadata
const BROKER_INFO: Record<BrokerType, { name: string; icon: React.ReactNode; color: string }> = {
  alpaca: { 
    name: 'Alpaca', 
    icon: <TrendingUp className="h-4 w-4" />,
    color: 'text-yellow-500'
  },
  interactive_brokers: { 
    name: 'Interactive Brokers', 
    icon: <Building2 className="h-4 w-4" />,
    color: 'text-red-500'
  },
  binance: { 
    name: 'Binance', 
    icon: <Bitcoin className="h-4 w-4" />,
    color: 'text-amber-500'
  },
  coinbase: { 
    name: 'Coinbase', 
    icon: <Bitcoin className="h-4 w-4" />,
    color: 'text-blue-500'
  },
};

// Asset class display info
const ASSET_CLASS_INFO: Record<AssetClass, { name: string; icon: React.ReactNode }> = {
  us_equity: { name: 'US Stock', icon: <TrendingUp className="h-4 w-4" /> },
  crypto: { name: 'Cryptocurrency', icon: <Bitcoin className="h-4 w-4" /> },
  forex: { name: 'Forex', icon: <Building2 className="h-4 w-4" /> },
  options: { name: 'Options', icon: <TrendingUp className="h-4 w-4" /> },
  futures: { name: 'Futures', icon: <TrendingUp className="h-4 w-4" /> },
};

// Broker priorities by asset class
const BROKER_PRIORITIES: Record<AssetClass, BrokerType[]> = {
  us_equity: ['alpaca', 'interactive_brokers'],
  crypto: ['binance', 'coinbase', 'alpaca'],
  forex: ['interactive_brokers'],
  options: ['interactive_brokers'],
  futures: ['interactive_brokers'],
};

// Broker capabilities
const BROKER_SUPPORTS: Record<BrokerType, AssetClass[]> = {
  alpaca: ['us_equity', 'crypto'],
  interactive_brokers: ['us_equity', 'options', 'futures', 'forex'],
  binance: ['crypto'],
  coinbase: ['crypto'],
};

function detectAssetClass(symbol: string): AssetClass {
  const normalized = symbol.toUpperCase().replace(/[-_\/]/g, '');
  
  if (CRYPTO_SYMBOLS.has(normalized) || 
      CRYPTO_SYMBOLS.has(normalized.replace('USD', '')) ||
      CRYPTO_SYMBOLS.has(normalized.replace('USDT', ''))) {
    return 'crypto';
  }
  
  if (FOREX_PAIRS.has(normalized)) {
    return 'forex';
  }
  
  if (/\d{6}[CP]\d+/.test(normalized)) {
    return 'options';
  }
  
  if (/[A-Z]{2,4}[FGHJKMNQUVXZ]\d{1,2}$/.test(normalized)) {
    return 'futures';
  }
  
  return 'us_equity';
}

function calculateRoutingDecision(
  symbol: string,
  connections: BrokerConnection[]
): RoutingDecision | null {
  if (!symbol || connections.length === 0) return null;
  
  const assetClass = detectAssetClass(symbol);
  const priorities = BROKER_PRIORITIES[assetClass];
  
  // Find the best available broker
  for (const brokerType of priorities) {
    const connection = connections.find(
      c => c.brokerType === brokerType && c.isActive && BROKER_SUPPORTS[brokerType]?.includes(assetClass)
    );
    
    if (connection) {
      // Find alternatives
      const alternatives = connections
        .filter(c => 
          c.id !== connection.id && 
          c.isActive && 
          BROKER_SUPPORTS[c.brokerType]?.includes(assetClass)
        )
        .map(c => ({ broker: c.brokerType, connectionId: c.id }));
      
      return {
        selectedBroker: brokerType,
        selectedConnectionId: connection.id,
        reason: `Best broker for ${ASSET_CLASS_INFO[assetClass].name} trading`,
        alternatives,
        confidence: 95,
        assetClass,
      };
    }
  }
  
  // Fallback to any broker that supports the asset class
  const fallback = connections.find(
    c => c.isActive && BROKER_SUPPORTS[c.brokerType]?.includes(assetClass)
  );
  
  if (fallback) {
    return {
      selectedBroker: fallback.brokerType,
      selectedConnectionId: fallback.id,
      reason: `Fallback broker for ${ASSET_CLASS_INFO[assetClass].name}`,
      alternatives: [],
      confidence: 70,
      assetClass,
    };
  }
  
  return null;
}

export function SmartOrderRouter({
  symbol,
  connections,
  onBrokerSelected,
  selectedConnectionId,
  showDetails = true,
}: SmartOrderRouterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [manualOverride, setManualOverride] = useState(false);
  
  // Calculate routing decision
  const routingDecision = useMemo(() => {
    return calculateRoutingDecision(symbol, connections);
  }, [symbol, connections]);
  
  // Auto-select broker when routing decision changes
  useEffect(() => {
    if (routingDecision && !manualOverride) {
      onBrokerSelected(routingDecision.selectedConnectionId, routingDecision.selectedBroker);
    }
  }, [routingDecision, manualOverride, onBrokerSelected]);
  
  // Handle manual broker selection
  const handleManualSelect = (connectionId: string) => {
    const connection = connections.find(c => c.id === connectionId);
    if (connection) {
      setManualOverride(true);
      onBrokerSelected(connectionId, connection.brokerType);
    }
  };
  
  // Reset to smart routing
  const handleResetToSmart = () => {
    setManualOverride(false);
    if (routingDecision) {
      onBrokerSelected(routingDecision.selectedConnectionId, routingDecision.selectedBroker);
    }
  };
  
  if (!symbol) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
        <Info className="h-4 w-4" />
        Enter a symbol to see routing recommendation
      </div>
    );
  }
  
  if (!routingDecision) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>No Broker Available</AlertTitle>
        <AlertDescription>
          No connected broker supports trading {symbol}. Please connect a compatible broker.
        </AlertDescription>
      </Alert>
    );
  }
  
  const selectedBrokerInfo = BROKER_INFO[routingDecision.selectedBroker];
  const assetInfo = ASSET_CLASS_INFO[routingDecision.assetClass];
  const currentConnection = connections.find(c => c.id === selectedConnectionId);
  
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Smart Routing</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Routing Summary */}
        <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              {assetInfo.icon}
              {assetInfo.name}
            </Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge 
              variant="default" 
              className={cn("gap-1", manualOverride ? "bg-amber-600" : "bg-green-600")}
            >
              {currentConnection && BROKER_INFO[currentConnection.brokerType]?.icon}
              {currentConnection ? BROKER_INFO[currentConnection.brokerType]?.name : selectedBrokerInfo.name}
              {currentConnection?.isPaper && ' (Paper)'}
            </Badge>
          </div>
          
          <div className="ml-auto flex items-center gap-2">
            {!manualOverride && (
              <Badge variant="secondary" className="gap-1">
                <Zap className="h-3 w-3" />
                {routingDecision.confidence}% confidence
              </Badge>
            )}
            {manualOverride && (
              <Badge variant="outline" className="gap-1 text-amber-600 border-amber-600">
                <Settings2 className="h-3 w-3" />
                Manual
              </Badge>
            )}
          </div>
        </div>
        
        {/* Expanded Details */}
        {isExpanded && showDetails && (
          <>
            <Separator />
            
            {/* Routing Reason */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Routing Reason</Label>
              <p className="text-sm">{routingDecision.reason}</p>
            </div>
            
            {/* Manual Override */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Manual Broker Selection</Label>
                {manualOverride && (
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={handleResetToSmart}>
                    Reset to Smart Routing
                  </Button>
                )}
              </div>
              
              <Select 
                value={selectedConnectionId || ''} 
                onValueChange={handleManualSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select broker" />
                </SelectTrigger>
                <SelectContent>
                  {connections.filter(c => c.isActive).map((conn) => {
                    const info = BROKER_INFO[conn.brokerType];
                    const supports = BROKER_SUPPORTS[conn.brokerType]?.includes(routingDecision.assetClass);
                    
                    return (
                      <SelectItem 
                        key={conn.id} 
                        value={conn.id}
                        disabled={!supports}
                      >
                        <div className="flex items-center gap-2">
                          <span className={info.color}>{info.icon}</span>
                          <span>{info.name}</span>
                          {conn.isPaper && <Badge variant="outline" className="text-xs">Paper</Badge>}
                          {!supports && <Badge variant="destructive" className="text-xs">Not supported</Badge>}
                          {conn.id === routingDecision.selectedConnectionId && !manualOverride && (
                            <Badge variant="secondary" className="text-xs">Recommended</Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            {/* Alternatives */}
            {routingDecision.alternatives.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Alternative Brokers</Label>
                <div className="flex flex-wrap gap-2">
                  {routingDecision.alternatives.map((alt) => {
                    const info = BROKER_INFO[alt.broker];
                    const conn = connections.find(c => c.id === alt.connectionId);
                    return (
                      <Button
                        key={alt.connectionId}
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => handleManualSelect(alt.connectionId)}
                      >
                        <span className={info.color}>{info.icon}</span>
                        {info.name}
                        {conn?.isPaper && ' (Paper)'}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default SmartOrderRouter;
