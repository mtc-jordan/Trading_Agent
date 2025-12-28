/**
 * Broker Badge Component
 * 
 * Displays the active broker with visual indicator.
 * Shows broker name, connection status, and paper/live mode.
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useBroker, BrokerType } from '@/contexts/BrokerContext';
import { CheckCircle2, AlertCircle, Wifi, WifiOff } from 'lucide-react';

interface BrokerBadgeProps {
  className?: string;
  showStatus?: boolean;
  showMode?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'minimal';
}

// Broker icons as simple colored circles with initials
const BrokerIcon = ({ type, size = 'md' }: { type: BrokerType; size?: 'sm' | 'md' | 'lg' }) => {
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
  
  const sizeClasses = {
    sm: 'w-4 h-4 text-[8px]',
    md: 'w-5 h-5 text-[10px]',
    lg: 'w-6 h-6 text-xs'
  };
  
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center text-white font-bold',
      colors[type],
      sizeClasses[size]
    )}>
      {initials[type]}
    </div>
  );
};

export function BrokerBadge({ 
  className, 
  showStatus = true, 
  showMode = true,
  size = 'md',
  variant = 'default'
}: BrokerBadgeProps) {
  const { activeBroker, isPaperMode, getBrokerName, hasConnectedBroker } = useBroker();
  
  if (!hasConnectedBroker || !activeBroker) {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          'gap-1.5 text-muted-foreground border-dashed',
          className
        )}
      >
        <WifiOff className="w-3 h-3" />
        <span>No Broker</span>
      </Badge>
    );
  }
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };
  
  const variantClasses = {
    default: 'bg-card border border-border',
    outline: 'bg-transparent border border-border',
    minimal: 'bg-transparent border-none'
  };
  
  return (
    <div className={cn(
      'inline-flex items-center gap-2 rounded-md',
      variantClasses[variant],
      sizeClasses[size],
      className
    )}>
      <BrokerIcon type={activeBroker.brokerType} size={size} />
      
      <span className="font-medium">
        {getBrokerName(activeBroker.brokerType)}
      </span>
      
      {showMode && (
        <Badge 
          variant={isPaperMode ? 'secondary' : 'default'}
          className={cn(
            'text-[10px] px-1.5 py-0',
            isPaperMode 
              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
              : 'bg-green-500/20 text-green-400 border-green-500/30'
          )}
        >
          {isPaperMode ? 'PAPER' : 'LIVE'}
        </Badge>
      )}
      
      {showStatus && (
        activeBroker.isConnected ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
        ) : (
          <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />
        )
      )}
    </div>
  );
}

// Compact version for tight spaces
export function BrokerBadgeCompact({ className }: { className?: string }) {
  const { activeBroker, isPaperMode, getBrokerName } = useBroker();
  
  if (!activeBroker) {
    return (
      <span className={cn('text-xs text-muted-foreground', className)}>
        No broker
      </span>
    );
  }
  
  return (
    <span className={cn('text-xs flex items-center gap-1', className)}>
      <BrokerIcon type={activeBroker.brokerType} size="sm" />
      <span className="text-muted-foreground">
        {getBrokerName(activeBroker.brokerType)}
        {isPaperMode && <span className="text-blue-400 ml-1">(Paper)</span>}
      </span>
    </span>
  );
}

// Status indicator only
export function BrokerStatusIndicator({ className }: { className?: string }) {
  const { activeBroker, hasConnectedBroker } = useBroker();
  
  if (!hasConnectedBroker || !activeBroker) {
    return (
      <div className={cn('flex items-center gap-1 text-muted-foreground', className)}>
        <div className="w-2 h-2 rounded-full bg-gray-500" />
        <span className="text-xs">Disconnected</span>
      </div>
    );
  }
  
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className={cn(
        'w-2 h-2 rounded-full',
        activeBroker.isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
      )} />
      <span className="text-xs text-muted-foreground">
        {activeBroker.isConnected ? 'Connected' : 'Reconnecting...'}
      </span>
    </div>
  );
}

export default BrokerBadge;
