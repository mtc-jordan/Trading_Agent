import { useSocket, useAlpacaStreamStatus } from "@/hooks/useSocket";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Wifi, WifiOff, Loader2, Zap, ZapOff } from "lucide-react";

export function ConnectionStatus() {
  const { connectionStatus, latency } = useSocket();

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case "connected":
        return {
          icon: <Wifi className="h-3 w-3" />,
          label: "Connected",
          variant: "default" as const,
          className: "bg-green-500/20 text-green-500 border-green-500/30",
        };
      case "connecting":
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          label: "Connecting...",
          variant: "secondary" as const,
          className: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
        };
      case "disconnected":
        return {
          icon: <WifiOff className="h-3 w-3" />,
          label: "Disconnected",
          variant: "destructive" as const,
          className: "bg-red-500/20 text-red-500 border-red-500/30",
        };
      case "error":
        return {
          icon: <WifiOff className="h-3 w-3" />,
          label: "Connection Error",
          variant: "destructive" as const,
          className: "bg-red-500/20 text-red-500 border-red-500/30",
        };
      default:
        return {
          icon: <WifiOff className="h-3 w-3" />,
          label: "Unknown",
          variant: "outline" as const,
          className: "",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant={config.variant} 
          className={`flex items-center gap-1.5 px-2 py-0.5 text-xs cursor-default ${config.className}`}
        >
          {config.icon}
          <span className="hidden sm:inline">{config.label}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-sm">
          <p className="font-medium">{config.label}</p>
          {connectionStatus === "connected" && latency !== null && (
            <p className="text-muted-foreground">Latency: {latency}ms</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// Alpaca stream status indicator
export function AlpacaStreamStatus() {
  const { status, isLoading } = useAlpacaStreamStatus();

  if (isLoading) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1.5 px-2 py-0.5 text-xs bg-muted/50">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="hidden sm:inline">Alpaca</span>
      </Badge>
    );
  }

  const isConnected = status?.connected && status?.authenticated;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={isConnected ? "default" : "secondary"}
          className={`flex items-center gap-1.5 px-2 py-0.5 text-xs cursor-default ${
            isConnected
              ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30"
              : "bg-orange-500/20 text-orange-500 border-orange-500/30"
          }`}
        >
          {isConnected ? (
            <Zap className="h-3 w-3" />
          ) : (
            <ZapOff className="h-3 w-3" />
          )}
          <span className="hidden sm:inline">Alpaca</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-sm space-y-1">
          <p className="font-medium">
            Alpaca Stream: {isConnected ? "Connected" : "Disconnected"}
          </p>
          {status && (
            <>
              <p className="text-muted-foreground">
                Auth: {status.authenticated ? "✓" : "✗"}
              </p>
              {status.subscribedSymbols && status.subscribedSymbols.length > 0 && (
                <p className="text-muted-foreground">
                  Symbols: {status.subscribedSymbols.slice(0, 5).join(", ")}
                  {status.subscribedSymbols.length > 5 && ` +${status.subscribedSymbols.length - 5} more`}
                </p>
              )}
              {status.reconnectAttempts > 0 && (
                <p className="text-orange-500">
                  Reconnect attempts: {status.reconnectAttempts}
                </p>
              )}
            </>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// Compact version for sidebar/header
export function ConnectionStatusDot() {
  const { connectionStatus } = useSocket();

  const getColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "bg-green-500";
      case "connecting":
        return "bg-yellow-500 animate-pulse";
      case "disconnected":
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`w-2 h-2 rounded-full ${getColor()}`} />
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-sm capitalize">{connectionStatus}</p>
      </TooltipContent>
    </Tooltip>
  );
}
