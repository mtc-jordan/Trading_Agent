/**
 * Enhanced Connection Status Component
 * 
 * Shows detailed connection status with reconnection progress,
 * retry countdown, and manual reconnect option.
 */

import { useSocketReconnect, ConnectionState, ReconnectStatus } from "@/hooks/useSocketReconnect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Wifi, 
  WifiOff, 
  Loader2, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectionStatusEnhancedProps {
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export function ConnectionStatusEnhanced({ 
  showDetails = false, 
  compact = false,
  className 
}: ConnectionStatusEnhancedProps) {
  const { 
    connectionState, 
    reconnectStatus, 
    manualReconnect, 
    latency 
  } = useSocketReconnect();

  const getStatusConfig = (state: ConnectionState) => {
    switch (state) {
      case "connected":
        return {
          icon: <Wifi className="h-3 w-3" />,
          label: "Connected",
          color: "text-green-500",
          bgColor: "bg-green-500/20",
          borderColor: "border-green-500/30",
          dotColor: "bg-green-500",
        };
      case "connecting":
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          label: "Connecting...",
          color: "text-yellow-500",
          bgColor: "bg-yellow-500/20",
          borderColor: "border-yellow-500/30",
          dotColor: "bg-yellow-500 animate-pulse",
        };
      case "reconnecting":
        return {
          icon: <RefreshCw className="h-3 w-3 animate-spin" />,
          label: `Reconnecting (${reconnectStatus.attempt}/${reconnectStatus.maxAttempts})`,
          color: "text-orange-500",
          bgColor: "bg-orange-500/20",
          borderColor: "border-orange-500/30",
          dotColor: "bg-orange-500 animate-pulse",
        };
      case "disconnected":
        return {
          icon: <WifiOff className="h-3 w-3" />,
          label: "Disconnected",
          color: "text-red-500",
          bgColor: "bg-red-500/20",
          borderColor: "border-red-500/30",
          dotColor: "bg-red-500",
        };
      case "failed":
        return {
          icon: <XCircle className="h-3 w-3" />,
          label: "Connection Failed",
          color: "text-red-500",
          bgColor: "bg-red-500/20",
          borderColor: "border-red-500/30",
          dotColor: "bg-red-500",
        };
      default:
        return {
          icon: <WifiOff className="h-3 w-3" />,
          label: "Unknown",
          color: "text-gray-500",
          bgColor: "bg-gray-500/20",
          borderColor: "border-gray-500/30",
          dotColor: "bg-gray-500",
        };
    }
  };

  const config = getStatusConfig(connectionState);

  // Compact dot indicator
  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("w-2 h-2 rounded-full cursor-default", config.dotColor, className)} />
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <ConnectionTooltipContent 
            config={config} 
            reconnectStatus={reconnectStatus}
            latency={latency}
            onReconnect={manualReconnect}
          />
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline"
          className={cn(
            "flex items-center gap-1.5 px-2 py-0.5 text-xs cursor-default transition-colors",
            config.bgColor,
            config.color,
            config.borderColor,
            className
          )}
        >
          {config.icon}
          <span className="hidden sm:inline">{config.label}</span>
          {reconnectStatus.nextRetryIn !== null && reconnectStatus.isReconnecting && (
            <span className="text-[10px] opacity-80">
              ({reconnectStatus.nextRetryIn}s)
            </span>
          )}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <ConnectionTooltipContent 
          config={config} 
          reconnectStatus={reconnectStatus}
          latency={latency}
          onReconnect={manualReconnect}
          showDetails={showDetails}
        />
      </TooltipContent>
    </Tooltip>
  );
}

// Tooltip content component
interface ConnectionTooltipContentProps {
  config: ReturnType<typeof getStatusConfig>;
  reconnectStatus: ReconnectStatus;
  latency: number | null;
  onReconnect: () => void;
  showDetails?: boolean;
}

function getStatusConfig(state: ConnectionState) {
  switch (state) {
    case "connected":
      return {
        icon: <Wifi className="h-3 w-3" />,
        label: "Connected",
        color: "text-green-500",
        bgColor: "bg-green-500/20",
        borderColor: "border-green-500/30",
        dotColor: "bg-green-500",
      };
    case "connecting":
      return {
        icon: <Loader2 className="h-3 w-3 animate-spin" />,
        label: "Connecting...",
        color: "text-yellow-500",
        bgColor: "bg-yellow-500/20",
        borderColor: "border-yellow-500/30",
        dotColor: "bg-yellow-500 animate-pulse",
      };
    case "reconnecting":
      return {
        icon: <RefreshCw className="h-3 w-3 animate-spin" />,
        label: "Reconnecting",
        color: "text-orange-500",
        bgColor: "bg-orange-500/20",
        borderColor: "border-orange-500/30",
        dotColor: "bg-orange-500 animate-pulse",
      };
    case "disconnected":
      return {
        icon: <WifiOff className="h-3 w-3" />,
        label: "Disconnected",
        color: "text-red-500",
        bgColor: "bg-red-500/20",
        borderColor: "border-red-500/30",
        dotColor: "bg-red-500",
      };
    case "failed":
      return {
        icon: <XCircle className="h-3 w-3" />,
        label: "Connection Failed",
        color: "text-red-500",
        bgColor: "bg-red-500/20",
        borderColor: "border-red-500/30",
        dotColor: "bg-red-500",
      };
    default:
      return {
        icon: <WifiOff className="h-3 w-3" />,
        label: "Unknown",
        color: "text-gray-500",
        bgColor: "bg-gray-500/20",
        borderColor: "border-gray-500/30",
        dotColor: "bg-gray-500",
      };
  }
}

function ConnectionTooltipContent({ 
  config, 
  reconnectStatus, 
  latency, 
  onReconnect,
  showDetails = true 
}: ConnectionTooltipContentProps) {
  return (
    <div className="space-y-2 text-sm">
      {/* Status header */}
      <div className="flex items-center gap-2">
        <span className={config.color}>{config.icon}</span>
        <span className="font-medium">{config.label}</span>
      </div>

      {/* Latency */}
      {reconnectStatus.state === "connected" && latency !== null && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          <span>Latency: {latency}ms</span>
        </div>
      )}

      {/* Reconnection progress */}
      {reconnectStatus.isReconnecting && showDetails && (
        <div className="space-y-1.5 pt-1 border-t border-border/50">
          <div className="flex items-center gap-2 text-orange-500">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>
              Attempt {reconnectStatus.attempt} of {reconnectStatus.maxAttempts}
            </span>
          </div>
          
          {reconnectStatus.nextRetryIn !== null && (
            <div className="text-muted-foreground">
              Next retry in {reconnectStatus.nextRetryIn}s
            </div>
          )}

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-orange-500 transition-all duration-300"
              style={{ 
                width: `${(reconnectStatus.attempt / reconnectStatus.maxAttempts) * 100}%` 
              }}
            />
          </div>
        </div>
      )}

      {/* Error message */}
      {reconnectStatus.lastError && showDetails && (
        <div className="flex items-start gap-2 text-red-500 text-xs">
          <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span className="break-words">{reconnectStatus.lastError}</span>
        </div>
      )}

      {/* Manual reconnect button */}
      {(reconnectStatus.state === "failed" || reconnectStatus.state === "disconnected") && (
        <Button 
          size="sm" 
          variant="outline" 
          className="w-full h-7 text-xs mt-2"
          onClick={(e) => {
            e.stopPropagation();
            onReconnect();
          }}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Reconnect
        </Button>
      )}
    </div>
  );
}

// Reconnection banner component for prominent display
export function ReconnectionBanner() {
  const { connectionState, reconnectStatus, manualReconnect } = useSocketReconnect();

  // Only show banner when reconnecting or failed
  if (connectionState !== "reconnecting" && connectionState !== "failed") {
    return null;
  }

  return (
    <div className={cn(
      "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
      "px-4 py-2 rounded-lg shadow-lg",
      "flex items-center gap-3",
      "animate-in slide-in-from-bottom-4 duration-300",
      connectionState === "failed" 
        ? "bg-red-500/90 text-white" 
        : "bg-orange-500/90 text-white"
    )}>
      {connectionState === "reconnecting" ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">
            Reconnecting... ({reconnectStatus.attempt}/{reconnectStatus.maxAttempts})
            {reconnectStatus.nextRetryIn !== null && ` - ${reconnectStatus.nextRetryIn}s`}
          </span>
        </>
      ) : (
        <>
          <XCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Connection failed</span>
          <Button 
            size="sm" 
            variant="secondary" 
            className="h-6 text-xs"
            onClick={manualReconnect}
          >
            Retry
          </Button>
        </>
      )}
    </div>
  );
}

export default ConnectionStatusEnhanced;
