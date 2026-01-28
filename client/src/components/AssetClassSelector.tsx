import { useAssetClass, AssetClass, ASSET_CLASSES } from '@/contexts/AssetClassContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AssetClassSelectorProps {
  variant?: 'tabs' | 'pills' | 'compact';
  showDescription?: boolean;
  className?: string;
}

export function AssetClassSelector({ 
  variant = 'tabs', 
  showDescription = false,
  className 
}: AssetClassSelectorProps) {
  const { assetClass, setAssetClass, allAssetClasses, isMarketOpen } = useAssetClass();

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <div className={cn("flex items-center gap-1", className)}>
          {allAssetClasses.map((ac) => (
            <Tooltip key={ac.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setAssetClass(ac.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                    "hover:bg-muted",
                    assetClass === ac.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  )}
                  style={{
                    backgroundColor: assetClass === ac.id ? ac.color : undefined,
                  }}
                >
                  <span className="mr-1">{ac.icon}</span>
                  {ac.id === 'stocks' ? 'Stocks' : ac.id === 'crypto' ? 'Crypto' : 'Options'}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{ac.name}</p>
                <p className="text-xs text-muted-foreground">{ac.tradingHours}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    );
  }

  if (variant === 'pills') {
    return (
      <div className={cn("flex items-center gap-2 p-1 bg-muted/50 rounded-lg", className)}>
        {allAssetClasses.map((ac) => (
          <button
            key={ac.id}
            onClick={() => setAssetClass(ac.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
              assetClass === ac.id
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>{ac.icon}</span>
            <span>{ac.name}</span>
            {ac.is24x7 && (
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
                24/7
              </Badge>
            )}
          </button>
        ))}
      </div>
    );
  }

  // Default: tabs variant
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center border-b border-border">
        {allAssetClasses.map((ac) => (
          <button
            key={ac.id}
            onClick={() => setAssetClass(ac.id)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all relative",
              "hover:text-foreground",
              assetClass === ac.id
                ? "text-foreground"
                : "text-muted-foreground"
            )}
          >
            <span className="text-lg">{ac.icon}</span>
            <span>{ac.name}</span>
            {ac.is24x7 && (
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
                24/7
              </Badge>
            )}
            {assetClass === ac.id && (
              <div 
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ backgroundColor: ac.color }}
              />
            )}
          </button>
        ))}
      </div>
      
      {showDescription && (
        <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
            style={{ backgroundColor: `${ASSET_CLASSES[assetClass].color}20` }}
          >
            {ASSET_CLASSES[assetClass].icon}
          </div>
          <div>
            <h3 className="font-semibold">{ASSET_CLASSES[assetClass].name}</h3>
            <p className="text-sm text-muted-foreground">
              {ASSET_CLASSES[assetClass].description}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                Trading Hours: {ASSET_CLASSES[assetClass].tradingHours}
              </span>
              {isMarketOpen ? (
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
                  Market Open
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs bg-red-500/10 text-red-500 border-red-500/20">
                  Market Closed
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact inline selector for headers
export function AssetClassBadge() {
  const { currentAssetInfo, isMarketOpen } = useAssetClass();
  
  return (
    <div 
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
      style={{ backgroundColor: `${currentAssetInfo.color}20`, color: currentAssetInfo.color }}
    >
      <span>{currentAssetInfo.icon}</span>
      <span className="font-medium">{currentAssetInfo.name}</span>
      {currentAssetInfo.is24x7 ? (
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      ) : isMarketOpen ? (
        <span className="w-2 h-2 rounded-full bg-green-500" />
      ) : (
        <span className="w-2 h-2 rounded-full bg-red-500" />
      )}
    </div>
  );
}
