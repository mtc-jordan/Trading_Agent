import { useSocket } from "@/hooks/useSocket";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

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
