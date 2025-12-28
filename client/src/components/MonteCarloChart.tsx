import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Target,
  Activity,
  BarChart3
} from 'lucide-react';

interface MonteCarloChartProps {
  data: {
    histogram: { binStart: number; binEnd: number; count: number; percentage: number }[];
    percentiles: { percentile: number; value: number }[];
    statistics: {
      mean: number;
      median: number;
      stdDev: number;
      skewness: number;
      kurtosis: number;
      min: number;
      max: number;
    };
    var95: number;
    var99: number;
    cvar95: number;
    cvar99: number;
    probabilityOfLoss: number;
    probabilityOfGain: number;
    expectedReturn: number;
  };
  initialValue: number;
  title?: string;
}

export function MonteCarloChart({ data, initialValue, title = "Monte Carlo Simulation Results" }: MonteCarloChartProps) {
  const maxCount = useMemo(() => Math.max(...data.histogram.map(h => h.count)), [data.histogram]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const getReturnPercent = (value: number) => {
    return ((value - initialValue) / initialValue) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-400" />
              Expected Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(data.statistics.mean)}
            </div>
            <div className={`text-sm ${getReturnPercent(data.statistics.mean) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatPercent(getReturnPercent(data.statistics.mean))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              Probability of Gain
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {(data.probabilityOfGain * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">
              Chance of profit
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              VaR (95%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">
              {formatCurrency(data.var95)}
            </div>
            <div className="text-sm text-gray-500">
              Max loss at 95% confidence
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              Volatility
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">
              {formatCurrency(data.statistics.stdDev)}
            </div>
            <div className="text-sm text-gray-500">
              Standard deviation
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Chart */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-400" />
            {title}
          </CardTitle>
          <CardDescription className="text-gray-400">
            Probability distribution of portfolio outcomes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative h-64">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-xs text-gray-500">
              <span>{maxCount}</span>
              <span>{Math.round(maxCount / 2)}</span>
              <span>0</span>
            </div>

            {/* Chart area */}
            <div className="ml-16 h-full flex items-end gap-px">
              {data.histogram.map((bin, index) => {
                const height = (bin.count / maxCount) * 100;
                const isLoss = bin.binEnd < initialValue;
                const isBreakeven = bin.binStart <= initialValue && bin.binEnd >= initialValue;
                
                return (
                  <div
                    key={index}
                    className="flex-1 relative group"
                    style={{ height: '100%' }}
                  >
                    <div
                      className={`absolute bottom-8 w-full transition-all duration-200 ${
                        isBreakeven ? 'bg-yellow-500' :
                        isLoss ? 'bg-red-500/70 hover:bg-red-500' : 'bg-green-500/70 hover:bg-green-500'
                      }`}
                      style={{ height: `${height}%` }}
                    />
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs whitespace-nowrap">
                        <div className="text-white font-semibold">
                          {formatCurrency(bin.binStart)} - {formatCurrency(bin.binEnd)}
                        </div>
                        <div className="text-gray-400">
                          {bin.count} simulations ({bin.percentage.toFixed(1)}%)
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-axis labels */}
            <div className="ml-16 h-8 flex justify-between text-xs text-gray-500 pt-2">
              <span>{formatCurrency(data.statistics.min)}</span>
              <span className="text-yellow-400">Break-even: {formatCurrency(initialValue)}</span>
              <span>{formatCurrency(data.statistics.max)}</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500/70 rounded" />
              <span className="text-gray-400">Loss ({(data.probabilityOfLoss * 100).toFixed(1)}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded" />
              <span className="text-gray-400">Break-even</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500/70 rounded" />
              <span className="text-gray-400">Gain ({(data.probabilityOfGain * 100).toFixed(1)}%)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Percentiles and Risk Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Percentiles */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Percentile Distribution</CardTitle>
            <CardDescription className="text-gray-400">
              Portfolio value at different confidence levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.percentiles.map((p) => (
                <div key={p.percentile} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-gray-600 text-gray-400">
                      {p.percentile}th
                    </Badge>
                    <span className="text-gray-400">percentile</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-semibold">{formatCurrency(p.value)}</div>
                    <div className={`text-xs ${getReturnPercent(p.value) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatPercent(getReturnPercent(p.value))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Risk Metrics */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Risk Metrics</CardTitle>
            <CardDescription className="text-gray-400">
              Value at Risk and Conditional VaR
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-red-600/10 border border-red-600/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">VaR (95%)</span>
                  <span className="text-red-400 font-semibold">{formatCurrency(data.var95)}</span>
                </div>
                <p className="text-xs text-gray-500">
                  With 95% confidence, losses will not exceed this amount
                </p>
              </div>

              <div className="p-4 bg-red-600/10 border border-red-600/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">VaR (99%)</span>
                  <span className="text-red-400 font-semibold">{formatCurrency(data.var99)}</span>
                </div>
                <p className="text-xs text-gray-500">
                  With 99% confidence, losses will not exceed this amount
                </p>
              </div>

              <div className="p-4 bg-orange-600/10 border border-orange-600/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">CVaR (95%)</span>
                  <span className="text-orange-400 font-semibold">{formatCurrency(data.cvar95)}</span>
                </div>
                <p className="text-xs text-gray-500">
                  Expected loss in the worst 5% of scenarios
                </p>
              </div>

              <div className="p-4 bg-orange-600/10 border border-orange-600/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">CVaR (99%)</span>
                  <span className="text-orange-400 font-semibold">{formatCurrency(data.cvar99)}</span>
                </div>
                <p className="text-xs text-gray-500">
                  Expected loss in the worst 1% of scenarios
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Summary */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-lg">Statistical Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <div className="text-gray-400 text-sm mb-1">Mean</div>
              <div className="text-white font-semibold">{formatCurrency(data.statistics.mean)}</div>
            </div>
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <div className="text-gray-400 text-sm mb-1">Median</div>
              <div className="text-white font-semibold">{formatCurrency(data.statistics.median)}</div>
            </div>
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <div className="text-gray-400 text-sm mb-1">Skewness</div>
              <div className="text-white font-semibold">{data.statistics.skewness.toFixed(3)}</div>
            </div>
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <div className="text-gray-400 text-sm mb-1">Kurtosis</div>
              <div className="text-white font-semibold">{data.statistics.kurtosis.toFixed(3)}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
