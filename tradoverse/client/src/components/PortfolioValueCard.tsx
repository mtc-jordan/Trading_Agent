import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, DollarSign, Wallet, BarChart3, RefreshCw } from "lucide-react";
import { usePortfolioValue, formatCurrency, formatPercent } from "@/hooks/usePortfolio";
import { cn } from "@/lib/utils";

interface PortfolioValueCardProps {
  accountId?: number | null;
  className?: string;
  compact?: boolean;
}

export function PortfolioValueCard({ accountId = null, className, compact = false }: PortfolioValueCardProps) {
  const {
    portfolioValue,
    isLoading,
    isConnected,
    totalValue,
    cashBalance,
    positionsValue,
    valueChange,
    percentChange,
    lastUpdated,
  } = usePortfolioValue(accountId);

  const isPositive = valueChange >= 0;

  if (isLoading && !portfolioValue) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-24" />
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Portfolio Value</p>
              <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
            </div>
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium",
              isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
            )}>
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {formatPercent(percentChange)}
            </div>
          </div>
          {isConnected && (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Live
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Portfolio Value</CardTitle>
          {isConnected && (
            <Badge variant="outline" className="text-xs gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Live
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Total Value */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{formatCurrency(totalValue)}</span>
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium",
              isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
            )}>
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {formatCurrency(Math.abs(valueChange))} ({formatPercent(percentChange)})
            </div>
          </div>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-full bg-blue-500/10">
              <Wallet className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cash Balance</p>
              <p className="font-semibold">{formatCurrency(cashBalance)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-full bg-purple-500/10">
              <BarChart3 className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Positions</p>
              <p className="font-semibold">{formatCurrency(positionsValue)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Mini version for sidebar or header
export function PortfolioValueMini({ accountId }: { accountId: number | null }) {
  const { totalValue, percentChange, isConnected } = usePortfolioValue(accountId);
  const isPositive = percentChange >= 0;

  return (
    <div className="flex items-center gap-2">
      <DollarSign className="h-4 w-4 text-muted-foreground" />
      <span className="font-medium">{formatCurrency(totalValue)}</span>
      <span className={cn(
        "text-sm",
        isPositive ? "text-green-500" : "text-red-500"
      )}>
        {formatPercent(percentChange)}
      </span>
      {isConnected && (
        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
      )}
    </div>
  );
}

// Positions table with real-time updates
export function PositionsTable({ accountId }: { accountId: number | null }) {
  const { positions, isLoading } = usePortfolioValue(accountId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No open positions</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-sm text-muted-foreground">
            <th className="pb-2 font-medium">Symbol</th>
            <th className="pb-2 font-medium text-right">Qty</th>
            <th className="pb-2 font-medium text-right">Price</th>
            <th className="pb-2 font-medium text-right">Value</th>
            <th className="pb-2 font-medium text-right">P/L</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((position) => {
            const isPositive = position.unrealizedPnL >= 0;
            return (
              <tr key={position.symbol} className="border-b last:border-0">
                <td className="py-3 font-medium">{position.symbol}</td>
                <td className="py-3 text-right">{position.quantity.toFixed(2)}</td>
                <td className="py-3 text-right">{formatCurrency(position.currentPrice)}</td>
                <td className="py-3 text-right">{formatCurrency(position.marketValue)}</td>
                <td className={cn(
                  "py-3 text-right font-medium",
                  isPositive ? "text-green-500" : "text-red-500"
                )}>
                  {formatCurrency(position.unrealizedPnL)}
                  <span className="text-xs ml-1">
                    ({formatPercent(position.unrealizedPnLPercent)})
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
