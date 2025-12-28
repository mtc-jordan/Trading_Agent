/**
 * Broker Selector Component
 * 
 * Dropdown component for selecting active broker.
 * Shows all connected brokers with status and allows switching.
 */

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useBroker, BrokerType, BrokerConnection } from '@/contexts/BrokerContext';
import { 
  ChevronDown, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Settings,
  Wallet,
  RefreshCw
} from 'lucide-react';
import { Link } from 'wouter';

interface BrokerSelectorProps {
  className?: string;
  variant?: 'default' | 'compact' | 'full';
  showPaperToggle?: boolean;
  onBrokerChange?: (broker: BrokerConnection) => void;
}

// Broker icon component
const BrokerIcon = ({ type }: { type: BrokerType }) => {
  const colors: Record<BrokerType, string> = {
    alpaca: 'bg-yellow-500',
    interactive_brokers: 'bg-red-600',
    binance: 'bg-yellow-400',
    coinbase: 'bg-blue-600'
  };
  
  const initials: Record<BrokerType, string> = {
    alpaca: 'A',
    interactive_brokers: 'IB',
    binance: 'B',
    coinbase: 'C'
  };
  
  return (
    <div className={cn(
      'w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px]',
      colors[type]
    )}>
      {initials[type]}
    </div>
  );
};

export function BrokerSelector({ 
  className, 
  variant = 'default',
  showPaperToggle = true,
  onBrokerChange
}: BrokerSelectorProps) {
  const { 
    activeBroker, 
    connectedBrokers, 
    selectBroker, 
    isPaperMode, 
    setIsPaperMode,
    getBrokerName,
    isLoadingBrokers,
    refetchBrokers,
    hasConnectedBroker
  } = useBroker();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchBrokers();
    setTimeout(() => setIsRefreshing(false), 500);
  };
  
  const handleSelectBroker = (connectionId: string) => {
    selectBroker(connectionId);
    const broker = connectedBrokers.find(b => b.id === connectionId);
    if (broker && onBrokerChange) {
      onBrokerChange(broker);
    }
  };
  
  // Compact variant - just a simple select
  if (variant === 'compact') {
    return (
      <Select 
        value={activeBroker?.id || ''} 
        onValueChange={handleSelectBroker}
      >
        <SelectTrigger className={cn('w-[180px]', className)}>
          <SelectValue placeholder="Select broker" />
        </SelectTrigger>
        <SelectContent>
          {connectedBrokers.map((broker) => (
            <SelectItem key={broker.id} value={broker.id}>
              <div className="flex items-center gap-2">
                <BrokerIcon type={broker.brokerType} />
                <span>{getBrokerName(broker.brokerType)}</span>
              </div>
            </SelectItem>
          ))}
          {connectedBrokers.length === 0 && (
            <SelectItem value="none" disabled>
              No brokers connected
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    );
  }
  
  // Full variant - dropdown with more options
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            'gap-2 justify-between min-w-[200px]',
            className
          )}
        >
          {activeBroker ? (
            <div className="flex items-center gap-2">
              <BrokerIcon type={activeBroker.brokerType} />
              <span>{getBrokerName(activeBroker.brokerType)}</span>
              {activeBroker.isConnected ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">Select Broker</span>
          )}
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-[280px]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Connected Brokers</span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={handleRefresh}
          >
            <RefreshCw className={cn(
              'w-3.5 h-3.5',
              isRefreshing && 'animate-spin'
            )} />
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {isLoadingBrokers ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            Loading brokers...
          </div>
        ) : connectedBrokers.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              No brokers connected
            </p>
            <Link href="/brokers">
              <Button variant="outline" size="sm" className="gap-1">
                <Plus className="w-3.5 h-3.5" />
                Connect Broker
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {connectedBrokers.map((broker) => (
              <DropdownMenuItem
                key={broker.id}
                onClick={() => handleSelectBroker(broker.id)}
                className={cn(
                  'flex items-center gap-3 py-2.5 cursor-pointer',
                  activeBroker?.id === broker.id && 'bg-accent'
                )}
              >
                <BrokerIcon type={broker.brokerType} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {getBrokerName(broker.brokerType)}
                    </span>
                    {broker.isPaper && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        Paper
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {broker.accountId || 'Account connected'}
                  </p>
                </div>
                {broker.isConnected ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}
        
        <DropdownMenuSeparator />
        
        {showPaperToggle && hasConnectedBroker && (
          <>
            <div className="px-2 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Paper Trading</span>
              </div>
              <Switch
                checked={isPaperMode}
                onCheckedChange={setIsPaperMode}
              />
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        
        <Link href="/brokers">
          <DropdownMenuItem className="gap-2 cursor-pointer">
            <Settings className="w-4 h-4" />
            <span>Manage Brokers</span>
          </DropdownMenuItem>
        </Link>
        
        <Link href="/brokers">
          <DropdownMenuItem className="gap-2 cursor-pointer">
            <Plus className="w-4 h-4" />
            <span>Add New Broker</span>
          </DropdownMenuItem>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Simple broker select for forms
export function BrokerSelectField({ 
  value, 
  onChange,
  className,
  required = false,
  disabled = false
}: { 
  value: string; 
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const { connectedBrokers, getBrokerName } = useBroker();
  
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select broker for execution" />
      </SelectTrigger>
      <SelectContent>
        {connectedBrokers.map((broker) => (
          <SelectItem key={broker.id} value={broker.id}>
            <div className="flex items-center gap-2">
              <BrokerIcon type={broker.brokerType} />
              <span>{getBrokerName(broker.brokerType)}</span>
              {broker.isPaper && (
                <Badge variant="secondary" className="text-[10px] ml-1">
                  Paper
                </Badge>
              )}
            </div>
          </SelectItem>
        ))}
        {connectedBrokers.length === 0 && (
          <SelectItem value="none" disabled>
            No brokers connected
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}

export default BrokerSelector;
