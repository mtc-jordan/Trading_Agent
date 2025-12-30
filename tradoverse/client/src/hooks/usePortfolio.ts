import { useState, useEffect, useCallback } from "react";
import { useSocket } from "./useSocket";
import { trpc } from "@/lib/trpc";

interface Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

interface PortfolioValue {
  accountId: number;
  totalValue: number;
  cashBalance: number;
  positionsValue: number;
  positions: Position[];
  valueChange: number;
  percentChange: number;
  lastUpdated: string;
}

export function usePortfolioValue(accountId: number | null) {
  const [portfolioValue, setPortfolioValue] = useState<PortfolioValue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isConnected, subscribeToPortfolio, onPortfolioUpdate } = useSocket();

  // Subscribe to portfolio updates
  useEffect(() => {
    if (!isConnected || !accountId) return;

    // Subscribe to portfolio updates
    subscribeToPortfolio();

    // Listen for portfolio updates
    const cleanup = onPortfolioUpdate((data) => {
      // Transform the data to match our interface
      const transformed: PortfolioValue = {
        accountId: accountId,
        totalValue: data.totalValue,
        cashBalance: 0, // Will be updated from API
        positionsValue: data.totalValue,
        positions: data.positions.map(p => ({
          symbol: p.symbol,
          quantity: p.quantity,
          averagePrice: 0, // Will be updated from API
          currentPrice: p.currentPrice,
          marketValue: p.value,
          unrealizedPnL: p.change,
          unrealizedPnLPercent: 0,
        })),
        valueChange: data.dayChange,
        percentChange: data.dayChangePercent,
        lastUpdated: new Date(data.timestamp).toISOString(),
      };
      setPortfolioValue(transformed);
      setIsLoading(false);
    });

    return cleanup;
  }, [isConnected, accountId, subscribeToPortfolio, onPortfolioUpdate]);

  // Calculate derived values
  const totalReturn = portfolioValue
    ? ((portfolioValue.totalValue - (portfolioValue.totalValue - portfolioValue.valueChange)) / 
       (portfolioValue.totalValue - portfolioValue.valueChange)) * 100
    : 0;

  return {
    portfolioValue,
    isLoading,
    isConnected,
    totalReturn,
    positions: portfolioValue?.positions || [],
    totalValue: portfolioValue?.totalValue || 0,
    cashBalance: portfolioValue?.cashBalance || 0,
    positionsValue: portfolioValue?.positionsValue || 0,
    valueChange: portfolioValue?.valueChange || 0,
    percentChange: portfolioValue?.percentChange || 0,
    lastUpdated: portfolioValue?.lastUpdated ? new Date(portfolioValue.lastUpdated) : null,
  };
}

// Hook for portfolio value history chart
export function usePortfolioHistory(accountId: number | null, days: number = 30) {
  const [history, setHistory] = useState<Array<{
    timestamp: Date;
    totalValue: number;
    cashBalance: number;
    positionsValue: number;
    valueChange: number;
    percentChange: number;
  }>>([]);

  // This would typically fetch from an API endpoint
  // For now, we'll use the tRPC query when available

  return {
    history,
    isLoading: false,
  };
}

// Hook for position-level real-time updates
export function usePositionUpdates() {
  const [positions, setPositions] = useState<Position[]>([]);
  const { isConnected, subscribeToPortfolio, onPortfolioUpdate } = useSocket();

  useEffect(() => {
    if (!isConnected) return;

    subscribeToPortfolio();

    const cleanup = onPortfolioUpdate((data) => {
      const transformed: Position[] = data.positions.map(p => ({
        symbol: p.symbol,
        quantity: p.quantity,
        averagePrice: 0,
        currentPrice: p.currentPrice,
        marketValue: p.value,
        unrealizedPnL: p.change,
        unrealizedPnLPercent: 0,
      }));
      setPositions(transformed);
    });

    return cleanup;
  }, [isConnected, subscribeToPortfolio, onPortfolioUpdate]);

  return { positions, isConnected };
}

// Format currency for display
export function formatCurrency(value: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Format percentage for display
export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

// Format large numbers with abbreviations
export function formatLargeNumber(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return formatCurrency(value);
}
