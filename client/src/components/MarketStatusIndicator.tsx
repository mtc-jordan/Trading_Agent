import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Sun, Moon, Sunrise, Sunset, Calendar, AlertTriangle, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

type MarketStatus = "open" | "closed" | "pre-market" | "after-hours" | "holiday" | "early-close";

interface MarketClockData {
  timestamp: string;
  is_open: boolean;
  next_open: string;
  next_close: string;
}

interface CalendarDay {
  date: string;
  open: string;
  close: string;
  sessionOpen?: string;
  sessionClose?: string;
}

interface MarketStatusConfig {
  status: MarketStatus;
  label: string;
  icon: React.ReactNode;
  className: string;
  pulseClass?: string;
  description: string;
}

// US Market Holidays for 2024-2025
const MARKET_HOLIDAYS: Record<string, string> = {
  "2024-01-01": "New Year's Day",
  "2024-01-15": "Martin Luther King Jr. Day",
  "2024-02-19": "Presidents Day",
  "2024-03-29": "Good Friday",
  "2024-05-27": "Memorial Day",
  "2024-06-19": "Juneteenth",
  "2024-07-04": "Independence Day",
  "2024-09-02": "Labor Day",
  "2024-11-28": "Thanksgiving Day",
  "2024-12-25": "Christmas Day",
  "2025-01-01": "New Year's Day",
  "2025-01-20": "Martin Luther King Jr. Day",
  "2025-02-17": "Presidents Day",
  "2025-04-18": "Good Friday",
  "2025-05-26": "Memorial Day",
  "2025-06-19": "Juneteenth",
  "2025-07-04": "Independence Day",
  "2025-09-01": "Labor Day",
  "2025-11-27": "Thanksgiving Day",
  "2025-12-25": "Christmas Day",
};

// Early close days (1:00 PM ET)
const EARLY_CLOSE_DAYS: Record<string, string> = {
  "2024-07-03": "Day Before Independence Day",
  "2024-11-29": "Day After Thanksgiving",
  "2024-12-24": "Christmas Eve",
  "2025-07-03": "Day Before Independence Day",
  "2025-11-28": "Day After Thanksgiving",
  "2025-12-24": "Christmas Eve",
};

function getTodayET(): string {
  const now = new Date();
  return now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

function isMarketHoliday(date: string): string | null {
  return MARKET_HOLIDAYS[date] || null;
}

function isEarlyCloseDay(date: string): string | null {
  return EARLY_CLOSE_DAYS[date] || null;
}

function getUpcomingHolidays(count: number = 3): Array<{ date: string; name: string; isEarlyClose: boolean }> {
  const today = getTodayET();
  const allDates = [
    ...Object.entries(MARKET_HOLIDAYS).map(([date, name]) => ({ date, name, isEarlyClose: false })),
    ...Object.entries(EARLY_CLOSE_DAYS).map(([date, name]) => ({ date, name, isEarlyClose: true })),
  ];
  
  return allDates
    .filter(({ date }) => date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, count);
}

function getMarketStatus(clockData: MarketClockData | null, calendarData?: CalendarDay[]): MarketStatusConfig {
  const today = getTodayET();
  const holidayName = isMarketHoliday(today);
  const earlyCloseName = isEarlyCloseDay(today);
  
  // Check for holiday
  if (holidayName) {
    return {
      status: "holiday",
      label: "Holiday",
      icon: <Calendar className="h-3.5 w-3.5" />,
      className: "bg-red-500/20 text-red-400 border-red-500/30",
      description: `Market closed for ${holidayName}`,
    };
  }

  if (!clockData) {
    return {
      status: "closed",
      label: "Market Closed",
      icon: <Moon className="h-3.5 w-3.5" />,
      className: "bg-slate-500/20 text-slate-400 border-slate-500/30",
      description: "Unable to determine market status",
    };
  }

  const now = new Date();
  const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const currentMinutes = hours * 60 + minutes;
  const dayOfWeek = etTime.getDay();

  // Weekend check
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      status: "closed",
      label: "Weekend",
      icon: <Moon className="h-3.5 w-3.5" />,
      className: "bg-slate-500/20 text-slate-400 border-slate-500/30",
      description: "Markets are closed for the weekend",
    };
  }

  // Market hours in minutes from midnight ET
  const preMarketOpen = 4 * 60; // 4:00 AM
  const regularOpen = 9 * 60 + 30; // 9:30 AM
  const regularClose = earlyCloseName ? 13 * 60 : 16 * 60; // 1:00 PM or 4:00 PM
  const afterHoursClose = earlyCloseName ? 17 * 60 : 20 * 60; // 5:00 PM or 8:00 PM

  // Check for early close day during market hours
  if (earlyCloseName && clockData.is_open) {
    return {
      status: "early-close",
      label: "Early Close",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      className: "bg-orange-500/20 text-orange-500 border-orange-500/30",
      pulseClass: "animate-pulse",
      description: `Market closes early at 1:00 PM ET (${earlyCloseName})`,
    };
  }

  if (clockData.is_open) {
    return {
      status: "open",
      label: "Market Open",
      icon: <Sun className="h-3.5 w-3.5" />,
      className: "bg-green-500/20 text-green-500 border-green-500/30",
      pulseClass: "animate-pulse",
      description: "US stock market is currently open for trading",
    };
  }

  // Pre-market: 4:00 AM - 9:30 AM ET
  if (currentMinutes >= preMarketOpen && currentMinutes < regularOpen) {
    return {
      status: "pre-market",
      label: "Pre-Market",
      icon: <Sunrise className="h-3.5 w-3.5" />,
      className: "bg-amber-500/20 text-amber-500 border-amber-500/30",
      description: "Pre-market trading session (4:00 AM - 9:30 AM ET)",
    };
  }

  // After-hours: 4:00 PM - 8:00 PM ET (or 1:00 PM - 5:00 PM on early close days)
  if (currentMinutes >= regularClose && currentMinutes < afterHoursClose) {
    return {
      status: "after-hours",
      label: "After-Hours",
      icon: <Sunset className="h-3.5 w-3.5" />,
      className: "bg-purple-500/20 text-purple-500 border-purple-500/30",
      description: "After-hours trading session",
    };
  }

  // Closed
  return {
    status: "closed",
    label: "Market Closed",
    icon: <Moon className="h-3.5 w-3.5" />,
    className: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    description: "US stock market is currently closed",
  };
}

function formatTimeUntil(targetDate: Date): string {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();

  if (diff <= 0) return "now";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function formatETTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function MarketStatusIndicator() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { data: clockData, isLoading } = trpc.alpaca.getClock.useQuery(undefined, {
    refetchInterval: 60000, // Refresh every minute
    retry: 2,
  });

  // Update current time every second for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1.5 px-2 py-1 text-xs bg-muted/50">
        <Clock className="h-3.5 w-3.5 animate-spin" />
        <span>Loading...</span>
      </Badge>
    );
  }

  const statusConfig = getMarketStatus(clockData as MarketClockData | null);
  const nextOpen = clockData?.next_open ? new Date(clockData.next_open) : null;
  const nextClose = clockData?.next_close ? new Date(clockData.next_close) : null;

  const etTimeStr = formatETTime(currentTime);
  const countdownTarget = statusConfig.status === "open" || statusConfig.status === "early-close" ? nextClose : nextOpen;
  const countdownLabel = statusConfig.status === "open" || statusConfig.status === "early-close" ? "Closes in" : "Opens in";
  const countdownStr = countdownTarget ? formatTimeUntil(countdownTarget) : null;

  const upcomingHolidays = getUpcomingHolidays(2);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 text-xs cursor-default transition-all",
            statusConfig.className
          )}
        >
          <span className={statusConfig.pulseClass}>{statusConfig.icon}</span>
          <span className="font-medium">{statusConfig.label}</span>
          {countdownStr && (
            <span className="text-[10px] opacity-75 ml-0.5">
              ({countdownStr})
            </span>
          )}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            {statusConfig.icon}
            <span className="font-semibold">{statusConfig.label}</span>
          </div>
          <p className="text-muted-foreground">{statusConfig.description}</p>
          <div className="pt-1 border-t border-border/50 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Current Time (ET):</span>
              <span className="font-mono">{etTimeStr}</span>
            </div>
            {countdownTarget && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{countdownLabel}:</span>
                <span className="font-mono">{countdownStr}</span>
              </div>
            )}
          </div>
          {upcomingHolidays.length > 0 && (
            <div className="pt-1 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Upcoming:</p>
              {upcomingHolidays.map((holiday) => (
                <div key={holiday.date} className="flex justify-between text-xs">
                  <span className={holiday.isEarlyClose ? "text-orange-400" : "text-red-400"}>
                    {holiday.isEarlyClose ? "⏰" : "🚫"} {holiday.name}
                  </span>
                  <span className="text-muted-foreground">{formatDate(holiday.date)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="pt-1 border-t border-border/50 text-xs text-muted-foreground">
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <span>Pre-Market:</span>
              <span>4:00 AM - 9:30 AM</span>
              <span>Regular:</span>
              <span>9:30 AM - 4:00 PM</span>
              <span>After-Hours:</span>
              <span>4:00 PM - 8:00 PM</span>
            </div>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// Compact version for header
export function MarketStatusDot() {
  const { data: clockData } = trpc.alpaca.getClock.useQuery(undefined, {
    refetchInterval: 60000,
    retry: 2,
  });

  const statusConfig = getMarketStatus(clockData as MarketClockData | null);

  const dotColor = {
    open: "bg-green-500",
    closed: "bg-slate-500",
    "pre-market": "bg-amber-500",
    "after-hours": "bg-purple-500",
    holiday: "bg-red-500",
    "early-close": "bg-orange-500",
  }[statusConfig.status];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 cursor-default">
          <div className={cn("w-2 h-2 rounded-full", dotColor, statusConfig.pulseClass)} />
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {statusConfig.label}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-sm">{statusConfig.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// Large card version for dashboard
export function MarketStatusCard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { data: clockData, isLoading } = trpc.alpaca.getClock.useQuery(undefined, {
    refetchInterval: 60000,
    retry: 2,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const statusConfig = getMarketStatus(clockData as MarketClockData | null);
  const nextOpen = clockData?.next_open ? new Date(clockData.next_open) : null;
  const nextClose = clockData?.next_close ? new Date(clockData.next_close) : null;
  const etTimeStr = formatETTime(currentTime);
  const upcomingHolidays = getUpcomingHolidays(3);

  const bgGradient = {
    open: "from-green-500/10 to-green-500/5",
    closed: "from-slate-500/10 to-slate-500/5",
    "pre-market": "from-amber-500/10 to-amber-500/5",
    "after-hours": "from-purple-500/10 to-purple-500/5",
    holiday: "from-red-500/10 to-red-500/5",
    "early-close": "from-orange-500/10 to-orange-500/5",
  }[statusConfig.status];

  const iconBg = {
    open: "bg-green-500/20",
    closed: "bg-slate-500/20",
    "pre-market": "bg-amber-500/20",
    "after-hours": "bg-purple-500/20",
    holiday: "bg-red-500/20",
    "early-close": "bg-orange-500/20",
  }[statusConfig.status];

  return (
    <div className={cn(
      "rounded-xl border bg-gradient-to-br p-4",
      bgGradient,
      "border-border/50"
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg", iconBg)}>
              {statusConfig.icon}
            </div>
            <div>
              <h3 className="font-semibold text-sm">{statusConfig.label}</h3>
              <p className="text-xs text-muted-foreground">US Stock Market</p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-mono font-semibold">{etTimeStr}</p>
          <p className="text-xs text-muted-foreground">Eastern Time</p>
        </div>
      </div>

      {!isLoading && (
        <div className="mt-3 pt-3 border-t border-border/30">
          <div className="grid grid-cols-1 gap-2 text-xs">
            {(statusConfig.status === "open" || statusConfig.status === "early-close") && nextClose && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {statusConfig.status === "early-close" ? "Early close in:" : "Closes in:"}
                </span>
                <span className="font-mono font-medium text-red-400">
                  {formatTimeUntil(nextClose)}
                </span>
              </div>
            )}
            {statusConfig.status !== "open" && statusConfig.status !== "early-close" && nextOpen && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Opens in:</span>
                <span className="font-mono font-medium text-green-400">
                  {formatTimeUntil(nextOpen)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upcoming Holidays Section */}
      {upcomingHolidays.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/30">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Upcoming Market Events
          </p>
          <div className="space-y-1.5">
            {upcomingHolidays.map((holiday) => (
              <div key={holiday.date} className="flex justify-between items-center text-xs">
                <span className={cn(
                  "flex items-center gap-1",
                  holiday.isEarlyClose ? "text-orange-400" : "text-red-400"
                )}>
                  {holiday.isEarlyClose ? (
                    <Clock className="h-3 w-3" />
                  ) : (
                    <Moon className="h-3 w-3" />
                  )}
                  {holiday.name}
                </span>
                <span className="text-muted-foreground font-mono">
                  {formatDate(holiday.date)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Upcoming holidays widget
export function UpcomingHolidaysWidget() {
  const upcomingHolidays = getUpcomingHolidays(5);

  if (upcomingHolidays.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Upcoming Market Closures
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {upcomingHolidays.map((holiday) => (
            <div
              key={holiday.date}
              className={cn(
                "flex justify-between items-center p-2 rounded-lg text-sm",
                holiday.isEarlyClose ? "bg-orange-500/10" : "bg-red-500/10"
              )}
            >
              <div className="flex items-center gap-2">
                {holiday.isEarlyClose ? (
                  <Clock className="h-4 w-4 text-orange-400" />
                ) : (
                  <Moon className="h-4 w-4 text-red-400" />
                )}
                <div>
                  <p className="font-medium">{holiday.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {holiday.isEarlyClose ? "Early close at 1:00 PM ET" : "Market closed"}
                  </p>
                </div>
              </div>
              <span className="text-muted-foreground font-mono text-xs">
                {formatDate(holiday.date)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
