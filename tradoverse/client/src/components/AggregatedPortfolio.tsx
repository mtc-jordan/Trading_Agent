/**
 * Aggregated Portfolio Component
 * 
 * Displays combined portfolio view across all connected brokers.
 * Shows total value, positions breakdown by broker, and aggregated metrics.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useBroker, BrokerType, AggregatedPortfolio as AggregatedPortfolioType } from '@/contexts/BrokerContext';
import { 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PieChart, 
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';

// Broker colors for visual distinction
const BROKER_COLORS: Record<BrokerType, string> = {
  alpaca: 'bg-yellow-500',
  interactive_brokers: 'bg-red-500',
  binance: 'bg-amber-500',
  coinbase: 'bg-blue-500',
  schwab: 'bg-sky-500',
};

const BROKER_TEXT_COLORS: Record<BrokerType, string> = {
  alpaca: 'text-yellow-500',
  interactive_brokers: 'text-red-500',
  binance: 'text-amber-500',
  coinbase: 'text-blue-500',
  schwab: 'text-sky-500',
};

interface AggregatedPortfolioProps {
  className?: string;
  showBrokerBreakdown?: boolean;
  compact?: boolean;
}

export function AggregatedPortfolioView({ 
  className, 
  showBrokerBreakdown = true,
  compact = false 
}: AggregatedPortfolioProps) {
  const { 
    aggregatedPortfolio, 
    isLoadingAggregatedPortfolio, 
    refreshAggregatedPortfolio,
    connectedBrokers,
    getBrokerName,
    isHealthCheckRunning,
    lastHealthCheck
  } = useBroker();

  if (connectedBrokers.length === 0) {
    return (
      <Card className={cn('', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            Multi-Broker Portfolio
          </CardTitle>
          <CardDescription>
            Connect brokers to see your aggregated portfolio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No brokers connected yet. Connect your first broker to start tracking your portfolio.
            </p>
            <Link href="/brokers">
              <Button>
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect Broker
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoadingAggregatedPortfolio) {
    return (
      <Card className={cn('', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            Multi-Broker Portfolio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const portfolio = aggregatedPortfolio;

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Multi-Broker Portfolio
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              {lastHealthCheck && (
                <span className="flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3" />
                  Last checked: {lastHealthCheck.toLocaleTimeString()}
                </span>
              )}
            </CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => refreshAggregatedPortfolio()}
                  disabled={isHealthCheckRunning}
                >
                  <RefreshCw className={cn(
                    "h-4 w-4",
                    isHealthCheckRunning && "animate-spin"
                  )} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh portfolio data</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Portfolio Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            title="Total Value"
            value={formatCurrency(portfolio?.totalValue || 0)}
            icon={<Wallet className="h-4 w-4" />}
          />
          <SummaryCard
            title="Total Cash"
            value={formatCurrency(portfolio?.totalCash || 0)}
            icon={<Wallet className="h-4 w-4" />}
            variant="secondary"
          />
          <SummaryCard
            title="Total Equity"
            value={formatCurrency(portfolio?.totalEquity || 0)}
            icon={<PieChart className="h-4 w-4" />}
            variant="secondary"
          />
          <SummaryCard
            title="Unrealized P&L"
            value={formatCurrency(portfolio?.totalUnrealizedPnL || 0)}
            icon={portfolio?.totalUnrealizedPnL && portfolio.totalUnrealizedPnL >= 0 
              ? <TrendingUp className="h-4 w-4" /> 
              : <TrendingDown className="h-4 w-4" />
            }
            variant={portfolio?.totalUnrealizedPnL && portfolio.totalUnrealizedPnL >= 0 ? 'success' : 'danger'}
            suffix={portfolio?.totalUnrealizedPnLPercent 
              ? `(${portfolio.totalUnrealizedPnLPercent >= 0 ? '+' : ''}${portfolio.totalUnrealizedPnLPercent.toFixed(2)}%)`
              : undefined
            }
          />
        </div>

        {/* Broker Breakdown */}
        {showBrokerBreakdown && portfolio?.brokerSummaries && portfolio.brokerSummaries.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Broker Breakdown</h4>
            <div className="space-y-2">
              {portfolio.brokerSummaries.map((broker) => (
                <BrokerSummaryRow 
                  key={broker.brokerId} 
                  broker={broker}
                  totalValue={portfolio.totalValue}
                />
              ))}
            </div>
          </div>
        )}

        {/* Connected Brokers Status */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Connected Brokers</h4>
          <div className="flex flex-wrap gap-2">
            {connectedBrokers.map((broker) => (
              <Badge
                key={broker.id}
                variant="outline"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1',
                  broker.isConnected 
                    ? 'border-green-500/50 bg-green-500/10' 
                    : 'border-yellow-500/50 bg-yellow-500/10'
                )}
              >
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  broker.isConnected ? 'bg-green-500' : 'bg-yellow-500'
                )} />
                <span>{getBrokerName(broker.brokerType)}</span>
                {broker.isPaper && (
                  <span className="text-xs text-muted-foreground">(Paper)</span>
                )}
              </Badge>
            ))}
          </div>
        </div>

        {/* Positions Table (if not compact) */}
        {!compact && portfolio?.positions && portfolio.positions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Aggregated Positions</h4>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Market Value</TableHead>
                    <TableHead className="text-right">P&L</TableHead>
                    <TableHead>Brokers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {portfolio.positions.map((position) => (
                    <TableRow key={position.symbol}>
                      <TableCell className="font-medium">{position.symbol}</TableCell>
                      <TableCell className="text-right">{position.totalQuantity.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(position.totalMarketValue)}</TableCell>
                      <TableCell className={cn(
                        'text-right',
                        position.totalUnrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'
                      )}>
                        {formatCurrency(position.totalUnrealizedPnL)}
                        <span className="text-xs ml-1">
                          ({position.totalUnrealizedPnLPercent >= 0 ? '+' : ''}{position.totalUnrealizedPnLPercent.toFixed(2)}%)
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {position.brokerBreakdown.map((b) => (
                            <TooltipProvider key={b.brokerId}>
                              <Tooltip>
                                <TooltipTrigger>
                                  <div className={cn(
                                    'w-3 h-3 rounded-full',
                                    BROKER_COLORS[b.brokerType]
                                  )} />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{b.brokerName}: {b.quantity} shares</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Empty positions state */}
        {!compact && (!portfolio?.positions || portfolio.positions.length === 0) && (
          <div className="text-center py-6 text-muted-foreground">
            <p>No positions found across connected brokers.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Summary Card Component
interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  variant?: 'default' | 'secondary' | 'success' | 'danger';
  suffix?: string;
}

function SummaryCard({ title, value, icon, variant = 'default', suffix }: SummaryCardProps) {
  const variantClasses = {
    default: 'bg-card',
    secondary: 'bg-muted/50',
    success: 'bg-green-500/10 border-green-500/30',
    danger: 'bg-red-500/10 border-red-500/30',
  };

  const valueClasses = {
    default: 'text-foreground',
    secondary: 'text-foreground',
    success: 'text-green-500',
    danger: 'text-red-500',
  };

  return (
    <div className={cn(
      'rounded-lg border p-3',
      variantClasses[variant]
    )}>
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{title}</span>
      </div>
      <div className={cn('text-lg font-semibold', valueClasses[variant])}>
        {value}
        {suffix && <span className="text-xs ml-1 font-normal">{suffix}</span>}
      </div>
    </div>
  );
}

// Broker Summary Row Component
interface BrokerSummaryRowProps {
  broker: {
    brokerId: string;
    brokerType: BrokerType;
    brokerName: string;
    totalValue: number;
    cash: number;
    equity: number;
    unrealizedPnL: number;
    positionCount: number;
    isConnected: boolean;
  };
  totalValue: number;
}

function BrokerSummaryRow({ broker, totalValue }: BrokerSummaryRowProps) {
  const percentage = totalValue > 0 ? (broker.totalValue / totalValue) * 100 : 0;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className={cn(
        'w-3 h-3 rounded-full',
        BROKER_COLORS[broker.brokerType]
      )} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{broker.brokerName}</span>
          {broker.isConnected ? (
            <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-3 w-3 text-yellow-500 flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Progress value={percentage} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground w-12 text-right">
            {percentage.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="text-right">
        <div className="font-medium">{formatCurrency(broker.totalValue)}</div>
        <div className="text-xs text-muted-foreground">
          {broker.positionCount} position{broker.positionCount !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}

// Utility function
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default AggregatedPortfolioView;
