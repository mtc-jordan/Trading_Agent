import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SentimentTrendChartProps {
  className?: string;
  compact?: boolean;
}

// Format timestamp for display
function formatTimestamp(timestamp: number, period: '24h' | '7d'): string {
  const date = new Date(timestamp);
  if (period === '24h') {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

// Mini bar chart component
function MiniBarChart({ 
  data, 
  period,
  height = 80 
}: { 
  data: Array<{ timestamp: number; bullish: number; bearish: number; neutral: number; total: number }>;
  period: '24h' | '7d';
  height?: number;
}) {
  const maxTotal = Math.max(...data.map(d => d.total), 1);
  
  return (
    <div className="flex items-end gap-0.5 w-full" style={{ height }}>
      {data.map((point, index) => {
        const totalHeight = (point.total / maxTotal) * 100;
        const bullishHeight = point.total > 0 ? (point.bullish / point.total) * totalHeight : 0;
        const bearishHeight = point.total > 0 ? (point.bearish / point.total) * totalHeight : 0;
        const neutralHeight = point.total > 0 ? (point.neutral / point.total) * totalHeight : 0;
        
        return (
          <TooltipProvider key={index}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className="flex-1 flex flex-col justify-end cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ height: '100%' }}
                >
                  {point.total > 0 ? (
                    <div className="flex flex-col w-full rounded-t-sm overflow-hidden">
                      <div 
                        className="bg-green-500 w-full transition-all duration-300"
                        style={{ height: `${bullishHeight}%`, minHeight: bullishHeight > 0 ? '2px' : '0' }}
                      />
                      <div 
                        className="bg-gray-400 w-full transition-all duration-300"
                        style={{ height: `${neutralHeight}%`, minHeight: neutralHeight > 0 ? '2px' : '0' }}
                      />
                      <div 
                        className="bg-red-500 w-full transition-all duration-300"
                        style={{ height: `${bearishHeight}%`, minHeight: bearishHeight > 0 ? '2px' : '0' }}
                      />
                    </div>
                  ) : (
                    <div className="bg-muted/30 w-full h-1 rounded-t-sm" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <div className="space-y-1">
                  <p className="font-medium">{formatTimestamp(point.timestamp, period)}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">↑ {point.bullish}</span>
                    <span className="text-gray-400">— {point.neutral}</span>
                    <span className="text-red-500">↓ {point.bearish}</span>
                  </div>
                  <p className="text-muted-foreground">Total: {point.total}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}

// Sentiment distribution donut
function SentimentDonut({ 
  bullish, 
  bearish, 
  neutral,
  size = 60 
}: { 
  bullish: number; 
  bearish: number; 
  neutral: number;
  size?: number;
}) {
  const total = bullish + bearish + neutral;
  if (total === 0) {
    return (
      <div 
        className="rounded-full bg-muted/30 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <Activity className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }
  
  const bullishPct = (bullish / total) * 100;
  const bearishPct = (bearish / total) * 100;
  const neutralPct = (neutral / total) * 100;
  
  // Calculate stroke dash arrays for the donut segments
  const circumference = 2 * Math.PI * 20; // radius = 20
  const bullishDash = (bullishPct / 100) * circumference;
  const bearishDash = (bearishPct / 100) * circumference;
  const neutralDash = (neutralPct / 100) * circumference;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 50 50" className="transform -rotate-90">
        {/* Bullish segment */}
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="#22c55e"
          strokeWidth="8"
          strokeDasharray={`${bullishDash} ${circumference}`}
          strokeDashoffset="0"
        />
        {/* Neutral segment */}
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="#9ca3af"
          strokeWidth="8"
          strokeDasharray={`${neutralDash} ${circumference}`}
          strokeDashoffset={-bullishDash}
        />
        {/* Bearish segment */}
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="#ef4444"
          strokeWidth="8"
          strokeDasharray={`${bearishDash} ${circumference}`}
          strokeDashoffset={-(bullishDash + neutralDash)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold">{total}</span>
      </div>
    </div>
  );
}

export function SentimentTrendChart({ className = '', compact = false }: SentimentTrendChartProps) {
  const [period, setPeriod] = useState<'24h' | '7d'>('24h');
  
  const { data: trendData, isLoading } = trpc.alpaca.getSentimentTrend.useQuery(
    { period },
    { refetchInterval: 60000 } // Refresh every minute
  );
  
  const trendIcon = useMemo(() => {
    if (!trendData) return null;
    switch (trendData.summary.trend) {
      case 'improving':
        return <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />;
      case 'declining':
        return <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />;
      default:
        return <Minus className="h-3.5 w-3.5 text-gray-400" />;
    }
  }, [trendData]);
  
  const dominantIcon = useMemo(() => {
    if (!trendData) return null;
    switch (trendData.summary.dominantSentiment) {
      case 'bullish':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'bearish':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  }, [trendData]);
  
  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg bg-muted/30 ${className}`}>
        <Brain className="h-4 w-4 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium">Sentiment Trend</span>
            <div className="flex gap-1">
              <Button
                variant={period === '24h' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-5 px-1.5 text-[10px]"
                onClick={() => setPeriod('24h')}
              >
                24h
              </Button>
              <Button
                variant={period === '7d' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-5 px-1.5 text-[10px]"
                onClick={() => setPeriod('7d')}
              >
                7d
              </Button>
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : trendData ? (
            <div className="flex items-center gap-3">
              <MiniBarChart data={trendData.dataPoints} period={period} height={40} />
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                {trendIcon}
                <span className="capitalize">{trendData.summary.trend}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }
  
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-4 w-4 text-primary" />
            Sentiment Trend
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant={period === '24h' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setPeriod('24h')}
            >
              24h
            </Button>
            <Button
              variant={period === '7d' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setPeriod('7d')}
            >
              7d
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ) : trendData ? (
          <div className="space-y-4">
            {/* Chart */}
            <MiniBarChart data={trendData.dataPoints} period={period} height={80} />
            
            {/* Summary */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="flex items-center gap-3">
                <SentimentDonut 
                  bullish={trendData.summary.bullishPercentage}
                  bearish={trendData.summary.bearishPercentage}
                  neutral={trendData.summary.neutralPercentage}
                  size={50}
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    {dominantIcon}
                    <span className="text-xs font-medium capitalize">
                      {trendData.summary.dominantSentiment} Dominant
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    {trendIcon}
                    <span className="capitalize">{trendData.summary.trend} trend</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-1 text-right">
                <div className="flex items-center gap-1.5 justify-end">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-500">{trendData.summary.bullishPercentage}%</span>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  <Minus className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-400">{trendData.summary.neutralPercentage}%</span>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  <span className="text-xs text-red-500">{trendData.summary.bearishPercentage}%</span>
                </div>
              </div>
            </div>
            
            {/* Legend */}
            <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Bullish</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                <span>Neutral</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span>Bearish</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-xs text-muted-foreground">No trend data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Inline mini chart for embedding in other components
export function SentimentTrendMini({ className = '' }: { className?: string }) {
  const [period, setPeriod] = useState<'24h' | '7d'>('24h');
  
  const { data: trendData, isLoading } = trpc.alpaca.getSentimentTrend.useQuery(
    { period },
    { refetchInterval: 60000 }
  );
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Brain className="h-3.5 w-3.5 text-primary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        {isLoading ? (
          <Skeleton className="h-6 w-full" />
        ) : trendData ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-6">
              <MiniBarChart data={trendData.dataPoints} period={period} height={24} />
            </div>
            <Badge 
              variant="outline" 
              className={`text-[9px] px-1 py-0 ${
                trendData.summary.dominantSentiment === 'bullish' 
                  ? 'text-green-500 border-green-500/30' 
                  : trendData.summary.dominantSentiment === 'bearish'
                    ? 'text-red-500 border-red-500/30'
                    : 'text-gray-400 border-gray-500/30'
              }`}
            >
              {trendData.summary.dominantSentiment === 'bullish' && <TrendingUp className="h-2.5 w-2.5 mr-0.5" />}
              {trendData.summary.dominantSentiment === 'bearish' && <TrendingDown className="h-2.5 w-2.5 mr-0.5" />}
              {trendData.summary.dominantSentiment === 'neutral' && <Minus className="h-2.5 w-2.5 mr-0.5" />}
              {trendData.summary.bullishPercentage}%
            </Badge>
          </div>
        ) : null}
      </div>
      <div className="flex gap-0.5">
        <Button
          variant={period === '24h' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-5 w-6 p-0 text-[9px]"
          onClick={() => setPeriod('24h')}
        >
          24h
        </Button>
        <Button
          variant={period === '7d' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-5 w-6 p-0 text-[9px]"
          onClick={() => setPeriod('7d')}
        >
          7d
        </Button>
      </div>
    </div>
  );
}

export default SentimentTrendChart;
