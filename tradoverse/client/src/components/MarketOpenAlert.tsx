import { useEffect, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Bell, 
  BellOff, 
  TrendingUp, 
  TrendingDown, 
  Sun, 
  Clock,
  ChevronRight,
  Zap,
  Volume2,
  Mail
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface OvernightChange {
  symbol: string;
  previousClose: number;
  currentPrice: number;
  change: number;
  changePercent: number;
  direction: "up" | "down" | "neutral";
}

interface MarketOpenAlertProps {
  symbols?: string[];
  onDismiss?: () => void;
  className?: string;
}

// Check if we're within 5 minutes of market open
function isNearMarketOpen(): boolean {
  const now = new Date();
  const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const currentMinutes = hours * 60 + minutes;
  const dayOfWeek = etTime.getDay();

  // Weekend
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;

  // Within 5 minutes before or after 9:30 AM ET
  const marketOpen = 9 * 60 + 30;
  return Math.abs(currentMinutes - marketOpen) <= 5;
}

// Check if market just opened (within first 30 minutes)
function isMarketJustOpened(): boolean {
  const now = new Date();
  const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const currentMinutes = hours * 60 + minutes;
  const dayOfWeek = etTime.getDay();

  // Weekend
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;

  // Within first 30 minutes of market open (9:30 - 10:00 AM ET)
  const marketOpen = 9 * 60 + 30;
  return currentMinutes >= marketOpen && currentMinutes <= marketOpen + 30;
}

export function MarketOpenAlert({ 
  symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA'],
  onDismiss,
  className 
}: MarketOpenAlertProps) {
  const [dismissed, setDismissed] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  // Fetch last closing prices for overnight change calculation
  const { data: closingPrices } = trpc.alpaca.getLastClosingPrices.useQuery(
    { symbols },
    {
      enabled: showAlert,
      staleTime: 60000,
    }
  );

  // Check if we should show the alert
  useEffect(() => {
    const checkMarketStatus = () => {
      const shouldShow = isNearMarketOpen() || isMarketJustOpened();
      setShowAlert(shouldShow && !dismissed);
    };

    checkMarketStatus();
    const interval = setInterval(checkMarketStatus, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [dismissed]);

  const handleDismiss = () => {
    setDismissed(true);
    setShowAlert(false);
    onDismiss?.();
  };

  if (!showAlert || !closingPrices?.length) {
    return null;
  }

  // Calculate overnight changes
  const overnightChanges: OvernightChange[] = closingPrices.map(price => ({
    symbol: price.symbol,
    previousClose: price.previousClose,
    currentPrice: price.close,
    change: price.change,
    changePercent: price.changePercent,
    direction: price.changePercent > 0 ? "up" : price.changePercent < 0 ? "down" : "neutral",
  }));

  // Sort by absolute change percentage
  const sortedChanges = [...overnightChanges].sort(
    (a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)
  );

  const topGainer = sortedChanges.find(c => c.direction === "up");
  const topLoser = sortedChanges.find(c => c.direction === "down");

  return (
    <Card className={cn(
      "border-green-500/30 bg-gradient-to-br from-green-500/10 to-green-500/5",
      "animate-in slide-in-from-top-2 duration-300",
      className
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-green-500/20">
              <Sun className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <CardTitle className="text-sm">Market Opening Alert</CardTitle>
              <CardDescription className="text-xs">
                {isNearMarketOpen() ? "Market opens soon!" : "Market just opened"}
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            <BellOff className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Overnight Summary */}
        <div className="grid grid-cols-2 gap-2">
          {topGainer && (
            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                Top Gainer
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">{topGainer.symbol}</span>
                <span className="text-green-500 text-sm font-mono">
                  +{topGainer.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          )}
          {topLoser && (
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <TrendingDown className="h-3 w-3 text-red-500" />
                Top Loser
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">{topLoser.symbol}</span>
                <span className="text-red-500 text-sm font-mono">
                  {topLoser.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* All Changes */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Overnight Changes</p>
          <div className="grid grid-cols-3 gap-1.5">
            {sortedChanges.slice(0, 6).map((change) => (
              <div
                key={change.symbol}
                className={cn(
                  "flex items-center justify-between p-1.5 rounded text-xs",
                  change.direction === "up" && "bg-green-500/10",
                  change.direction === "down" && "bg-red-500/10",
                  change.direction === "neutral" && "bg-muted/50"
                )}
              >
                <span className="font-medium">{change.symbol}</span>
                <span className={cn(
                  "font-mono",
                  change.direction === "up" && "text-green-500",
                  change.direction === "down" && "text-red-500"
                )}>
                  {change.direction === "up" ? "+" : ""}
                  {change.changePercent.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
            <a href="/analysis">
              <Zap className="h-3 w-3 mr-1" />
              AI Analysis
            </a>
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
            <a href="/trading/paper">
              <ChevronRight className="h-3 w-3 mr-1" />
              Trade Now
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Settings component for market open alerts
interface MarketAlertSettingsProps {
  className?: string;
}

export function MarketAlertSettings({ className }: MarketAlertSettingsProps) {
  const [settings, setSettings] = useState({
    enabled: true,
    soundEnabled: false,
    emailEnabled: false,
    preMarketAlert: true,
    marketOpenAlert: true,
    significantMoveThreshold: 2, // Percentage
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    toast.success(`${key} ${!settings[key] ? 'enabled' : 'disabled'}`);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Market Open Alerts
        </CardTitle>
        <CardDescription>
          Get notified when the market opens with overnight price summaries
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="alerts-enabled">Enable Alerts</Label>
            <p className="text-xs text-muted-foreground">
              Receive market open notifications
            </p>
          </div>
          <Switch
            id="alerts-enabled"
            checked={settings.enabled}
            onCheckedChange={() => handleToggle('enabled')}
          />
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="text-sm font-medium">Alert Types</p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="premarket-alert">Pre-Market Alert</Label>
            </div>
            <Switch
              id="premarket-alert"
              checked={settings.preMarketAlert}
              onCheckedChange={() => handleToggle('preMarketAlert')}
              disabled={!settings.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="market-open-alert">Market Open Alert</Label>
            </div>
            <Switch
              id="market-open-alert"
              checked={settings.marketOpenAlert}
              onCheckedChange={() => handleToggle('marketOpenAlert')}
              disabled={!settings.enabled}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="text-sm font-medium">Notification Channels</p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="sound-enabled">Sound Notifications</Label>
            </div>
            <Switch
              id="sound-enabled"
              checked={settings.soundEnabled}
              onCheckedChange={() => handleToggle('soundEnabled')}
              disabled={!settings.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="email-enabled">Email Notifications</Label>
            </div>
            <Switch
              id="email-enabled"
              checked={settings.emailEnabled}
              onCheckedChange={() => handleToggle('emailEnabled')}
              disabled={!settings.enabled}
            />
          </div>
        </div>

        <Separator />

        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> Market open alerts will show overnight price changes 
            for your watchlist stocks, highlighting top gainers and losers to help you 
            make informed trading decisions at market open.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact notification banner
interface MarketOpenBannerProps {
  onViewDetails?: () => void;
  className?: string;
}

export function MarketOpenBanner({ onViewDetails, className }: MarketOpenBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const checkStatus = () => {
      setVisible(isNearMarketOpen() || isMarketJustOpened());
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  return (
    <div className={cn(
      "flex items-center justify-between p-2 rounded-lg",
      "bg-gradient-to-r from-green-500/20 to-green-500/10",
      "border border-green-500/30",
      "animate-in slide-in-from-top-1 duration-200",
      className
    )}>
      <div className="flex items-center gap-2">
        <div className="p-1 rounded bg-green-500/20">
          <Sun className="h-3.5 w-3.5 text-green-500" />
        </div>
        <span className="text-sm font-medium">
          {isNearMarketOpen() ? "Market opens in 5 minutes!" : "Market is now open"}
        </span>
      </div>
      <Button variant="ghost" size="sm" onClick={onViewDetails} className="text-xs">
        View Summary
        <ChevronRight className="h-3 w-3 ml-1" />
      </Button>
    </div>
  );
}
