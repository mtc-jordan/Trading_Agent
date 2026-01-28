import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { 
  Grid3X3, RefreshCw, TrendingUp, TrendingDown, Minus, 
  Info, Maximize2, Minimize2, Download, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

type TimePeriod = '24h' | '7d' | '30d';
type CorrelationStrength = 'strong_positive' | 'moderate_positive' | 'weak_positive' | 'neutral' | 'weak_negative' | 'moderate_negative' | 'strong_negative';

interface CorrelationPair {
  asset1: string;
  asset2: string;
  correlation: number;
  strength: CorrelationStrength;
  sampleSize: number;
}

interface CorrelationMatrixData {
  assets: string[];
  correlations: number[][];
  pairs: CorrelationPair[];
  period: TimePeriod;
  calculatedAt: number;
  metadata: {
    totalPairs: number;
    avgCorrelation: number;
    strongestPositive: CorrelationPair | null;
    strongestNegative: CorrelationPair | null;
  };
}

interface CorrelationMatrixProps {
  symbols?: string[];
  assetTypes?: ('stock' | 'crypto' | 'forex' | 'commodity' | 'option')[];
  defaultPeriod?: TimePeriod;
  compact?: boolean;
  onCellClick?: (asset1: string, asset2: string, correlation: number) => void;
}

// Color mapping for correlation values
function getCorrelationColor(correlation: number): string {
  if (correlation >= 0.7) return 'bg-green-500';
  if (correlation >= 0.4) return 'bg-green-400';
  if (correlation >= 0.1) return 'bg-green-200';
  if (correlation > -0.1) return 'bg-gray-200';
  if (correlation > -0.4) return 'bg-red-200';
  if (correlation > -0.7) return 'bg-red-400';
  return 'bg-red-500';
}

function getCorrelationTextColor(correlation: number): string {
  const absCorr = Math.abs(correlation);
  if (absCorr >= 0.4) return 'text-white';
  return 'text-gray-800';
}

function getStrengthLabel(strength: CorrelationStrength): string {
  const labels: Record<CorrelationStrength, string> = {
    strong_positive: 'Strong +',
    moderate_positive: 'Moderate +',
    weak_positive: 'Weak +',
    neutral: 'Neutral',
    weak_negative: 'Weak -',
    moderate_negative: 'Moderate -',
    strong_negative: 'Strong -',
  };
  return labels[strength];
}

function getStrengthIcon(strength: CorrelationStrength) {
  if (strength.includes('positive')) {
    return <TrendingUp className="h-3 w-3" />;
  }
  if (strength.includes('negative')) {
    return <TrendingDown className="h-3 w-3" />;
  }
  return <Minus className="h-3 w-3" />;
}

// Default demo symbols for multi-asset correlation
const DEFAULT_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'BTC', 'ETH', 'GOLD', 'EUR/USD'];
const DEFAULT_ASSET_TYPES: ('stock' | 'crypto' | 'forex' | 'commodity')[] = [
  'stock', 'stock', 'stock', 'crypto', 'crypto', 'commodity', 'forex'
];

export function CorrelationMatrix({
  symbols = DEFAULT_SYMBOLS,
  assetTypes = DEFAULT_ASSET_TYPES,
  defaultPeriod = '7d',
  compact = false,
  onCellClick,
}: CorrelationMatrixProps) {
  const [period, setPeriod] = useState<TimePeriod>(defaultPeriod);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  // Seed demo data on mount
  const seedMutation = trpc.correlation.seedDemoData.useMutation();
  
  useEffect(() => {
    seedMutation.mutate();
  }, []);

  // Fetch correlation matrix
  const { data: matrixData, isLoading, refetch, isRefetching } = trpc.correlation.getMatrix.useQuery(
    { symbols, assetTypes, period },
    { 
      enabled: symbols.length >= 2,
      refetchInterval: 60000, // Refresh every minute
    }
  );

  const cellSize = compact ? 'w-12 h-12' : isExpanded ? 'w-16 h-16' : 'w-14 h-14';
  const fontSize = compact ? 'text-xs' : 'text-sm';

  // Memoize the matrix rendering for performance
  const matrixGrid = useMemo(() => {
    if (!matrixData) return null;

    return (
      <div className="overflow-x-auto">
        <div className="inline-block min-w-max">
          {/* Header row with asset labels */}
          <div className="flex">
            <div className={cn(cellSize, 'flex items-center justify-center')} />
            {matrixData.assets.map((asset, i) => (
              <div
                key={`header-${asset}`}
                className={cn(
                  cellSize,
                  'flex items-center justify-center font-medium',
                  fontSize,
                  'text-muted-foreground'
                )}
              >
                <span className="truncate max-w-full px-1" title={asset}>
                  {asset.length > 5 ? asset.slice(0, 5) : asset}
                </span>
              </div>
            ))}
          </div>

          {/* Matrix rows */}
          {matrixData.assets.map((rowAsset, rowIndex) => (
            <div key={`row-${rowAsset}`} className="flex">
              {/* Row label */}
              <div
                className={cn(
                  cellSize,
                  'flex items-center justify-center font-medium',
                  fontSize,
                  'text-muted-foreground'
                )}
              >
                <span className="truncate max-w-full px-1" title={rowAsset}>
                  {rowAsset.length > 5 ? rowAsset.slice(0, 5) : rowAsset}
                </span>
              </div>

              {/* Correlation cells */}
              {matrixData.correlations[rowIndex].map((correlation, colIndex) => {
                const isHovered = hoveredCell?.row === rowIndex && hoveredCell?.col === colIndex;
                const isDiagonal = rowIndex === colIndex;
                const colAsset = matrixData.assets[colIndex];

                return (
                  <TooltipProvider key={`cell-${rowIndex}-${colIndex}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            cellSize,
                            'flex items-center justify-center cursor-pointer transition-all duration-200',
                            getCorrelationColor(correlation),
                            getCorrelationTextColor(correlation),
                            fontSize,
                            'font-medium rounded-sm m-0.5',
                            isHovered && 'ring-2 ring-primary ring-offset-1 scale-105 z-10',
                            isDiagonal && 'opacity-50'
                          )}
                          onMouseEnter={() => setHoveredCell({ row: rowIndex, col: colIndex })}
                          onMouseLeave={() => setHoveredCell(null)}
                          onClick={() => {
                            if (!isDiagonal && onCellClick) {
                              onCellClick(rowAsset, colAsset, correlation);
                            }
                          }}
                        >
                          {correlation.toFixed(2)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-semibold">
                            {rowAsset} ↔ {colAsset}
                          </p>
                          <p>Correlation: <span className="font-mono">{correlation.toFixed(3)}</span></p>
                          {!isDiagonal && (
                            <>
                              <p className="text-xs text-muted-foreground">
                                {correlation > 0 
                                  ? 'Assets tend to move together'
                                  : correlation < 0
                                  ? 'Assets tend to move opposite'
                                  : 'No significant relationship'}
                              </p>
                            </>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }, [matrixData, hoveredCell, cellSize, fontSize, onCellClick]);

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className={cn(compact && 'border-0 shadow-none')}>
        <CardHeader className={cn('pb-2', compact && 'p-2')}>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-24" />
          </div>
        </CardHeader>
        <CardContent className={cn(compact && 'p-2')}>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-2">
                {[...Array(5)].map((_, j) => (
                  <Skeleton key={j} className="w-14 h-14 rounded-sm" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(compact && 'border-0 shadow-none', isExpanded && 'fixed inset-4 z-50 overflow-auto')}>
      <CardHeader className={cn('pb-2', compact && 'p-2')}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-primary" />
            <CardTitle className={cn('text-lg', compact && 'text-base')}>
              Correlation Matrix
            </CardTitle>
            {matrixData && (
              <Badge variant="outline" className="text-xs">
                {matrixData.assets.length} assets
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Time Period Selector */}
            <Select value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
              <SelectTrigger className="w-24 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">24 Hours</SelectItem>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="30d">30 Days</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              {isRefetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>

            {/* Expand/Collapse Button */}
            {!compact && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn(compact && 'p-2')}>
        {/* Matrix Grid */}
        {matrixGrid}

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span>Legend:</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-500 rounded-sm" />
            <span>Strong +</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-300 rounded-sm" />
            <span>Moderate +</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-gray-200 rounded-sm" />
            <span>Neutral</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-300 rounded-sm" />
            <span>Moderate -</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-500 rounded-sm" />
            <span>Strong -</span>
          </div>
        </div>

        {/* Metadata Summary */}
        {matrixData?.metadata && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Total Pairs</p>
              <p className="text-lg font-semibold">{matrixData.metadata.totalPairs}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Avg Correlation</p>
              <p className="text-lg font-semibold">{matrixData.metadata.avgCorrelation.toFixed(2)}</p>
            </div>
            {matrixData.metadata.strongestPositive && (
              <div className="bg-green-500/10 rounded-lg p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  Strongest +
                </p>
                <p className="text-sm font-semibold">
                  {matrixData.metadata.strongestPositive.asset1}/{matrixData.metadata.strongestPositive.asset2}
                </p>
                <p className="text-xs text-green-600">
                  {matrixData.metadata.strongestPositive.correlation.toFixed(2)}
                </p>
              </div>
            )}
            {matrixData.metadata.strongestNegative && (
              <div className="bg-red-500/10 rounded-lg p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  Strongest -
                </p>
                <p className="text-sm font-semibold">
                  {matrixData.metadata.strongestNegative.asset1}/{matrixData.metadata.strongestNegative.asset2}
                </p>
                <p className="text-xs text-red-600">
                  {matrixData.metadata.strongestNegative.correlation.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Info Footer */}
        <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>
            Correlation measures how assets move together. Values range from -1 (perfect inverse) to +1 (perfect positive).
            Use this to identify diversification opportunities and manage portfolio risk.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Mini version for embedding in other components
export function CorrelationMatrixMini({
  symbols,
  assetTypes,
}: {
  symbols: string[];
  assetTypes: ('stock' | 'crypto' | 'forex' | 'commodity' | 'option')[];
}) {
  return (
    <CorrelationMatrix
      symbols={symbols}
      assetTypes={assetTypes}
      compact={true}
      defaultPeriod="7d"
    />
  );
}

export default CorrelationMatrix;
