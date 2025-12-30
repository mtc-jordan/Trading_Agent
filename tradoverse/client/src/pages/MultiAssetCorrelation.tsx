import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { trpc } from '@/lib/trpc';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  Shield,
  Target,
  CheckCircle,
  XCircle,
  ArrowRight,
  Grid3X3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Layers,
  Search,
  Plus,
  Info
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  Legend
} from 'recharts';

// Asset class colors
const ASSET_CLASS_COLORS: Record<string, string> = {
  stock: '#3b82f6',
  crypto: '#f59e0b',
  forex: '#22c55e',
  commodity: '#a855f7',
  bond: '#06b6d4',
  etf: '#6366f1'
};

// Correlation color scale
function getCorrelationColor(correlation: number): string {
  if (correlation >= 0.7) return '#22c55e';
  if (correlation >= 0.3) return '#84cc16';
  if (correlation >= -0.3) return '#f59e0b';
  if (correlation >= -0.7) return '#f97316';
  return '#ef4444';
}

interface Asset {
  symbol: string;
  name: string;
  assetClass: string;
  sector?: string;
}

interface CorrelationPair {
  asset1: Asset;
  asset2: Asset;
  correlation: number;
  strength: string;
  direction: string;
}

interface CorrelationMatrix {
  assets: Asset[];
  matrix: number[][];
}

export default function MultiAssetCorrelation() {
  const [selectedAssets, setSelectedAssets] = useState<string[]>([
    'SPY', 'QQQ', 'BTC', 'ETH', 'GLD', 'TLT'
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('1Y');
  const [correlationMatrix, setCorrelationMatrix] = useState<CorrelationMatrix | null>(null);
  const [crossAssetAnalysis, setCrossAssetAnalysis] = useState<any>(null);

  const getAssets = trpc.broker.getCorrelationAssets.useQuery();
  const calculateMatrix = trpc.broker.calculateCorrelationMatrix.useMutation();
  const analyzeCrossAsset = trpc.broker.analyzeCrossAssetCorrelations.useMutation();
  const findUncorrelated = trpc.broker.findUncorrelatedAssets.useMutation();

  const availableAssets = useMemo(() => {
    return getAssets.data || [];
  }, [getAssets.data]);

  const filteredAssets = useMemo(() => {
    if (!searchTerm) return availableAssets;
    const term = searchTerm.toLowerCase();
    return availableAssets.filter((a: Asset) => 
      a.symbol.toLowerCase().includes(term) || 
      a.name.toLowerCase().includes(term)
    );
  }, [availableAssets, searchTerm]);

  const handleCalculateMatrix = async () => {
    try {
      const result = await calculateMatrix.mutateAsync({
        symbols: selectedAssets,
        period: selectedPeriod
      });
      setCorrelationMatrix(result as CorrelationMatrix);

      const analysis = await analyzeCrossAsset.mutateAsync({
        symbols: selectedAssets
      });
      setCrossAssetAnalysis(analysis);
    } catch (error) {
      console.error('Failed to calculate correlation matrix:', error);
    }
  };

  const toggleAsset = (symbol: string) => {
    setSelectedAssets(prev => 
      prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  };

  // Group assets by class
  const assetsByClass = useMemo(() => {
    const grouped: Record<string, Asset[]> = {};
    availableAssets.forEach((asset: Asset) => {
      if (!grouped[asset.assetClass]) {
        grouped[asset.assetClass] = [];
      }
      grouped[asset.assetClass].push(asset);
    });
    return grouped;
  }, [availableAssets]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Multi-Asset Correlation Engine</h1>
            <p className="text-muted-foreground mt-1">
              Analyze correlations across stocks, crypto, forex, and commodities
            </p>
          </div>
          <Button 
            onClick={handleCalculateMatrix} 
            disabled={calculateMatrix.isPending || selectedAssets.length < 2}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${calculateMatrix.isPending ? 'animate-spin' : ''}`} />
            {calculateMatrix.isPending ? 'Calculating...' : 'Calculate Correlations'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Asset Selection Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Asset Selection
              </CardTitle>
              <CardDescription>
                Select assets to analyze ({selectedAssets.length} selected)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1M">1 Month</SelectItem>
                  <SelectItem value="3M">3 Months</SelectItem>
                  <SelectItem value="6M">6 Months</SelectItem>
                  <SelectItem value="1Y">1 Year</SelectItem>
                  <SelectItem value="2Y">2 Years</SelectItem>
                </SelectContent>
              </Select>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {Object.entries(assetsByClass).map(([assetClass, assets]) => (
                  <div key={assetClass}>
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: ASSET_CLASS_COLORS[assetClass] }}
                      />
                      <span className="text-sm font-medium capitalize">{assetClass}</span>
                    </div>
                    <div className="space-y-1 pl-5">
                      {assets.map((asset: Asset) => (
                        <div 
                          key={asset.symbol}
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                          onClick={() => toggleAsset(asset.symbol)}
                        >
                          <Checkbox 
                            checked={selectedAssets.includes(asset.symbol)}
                            onCheckedChange={() => toggleAsset(asset.symbol)}
                          />
                          <span className="text-sm font-medium">{asset.symbol}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {asset.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedAssets([])}
                >
                  Clear All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedAssets(availableAssets.map((a: Asset) => a.symbol))}
                >
                  Select All
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Correlation Matrix */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Grid3X3 className="h-5 w-5" />
                Correlation Matrix
              </CardTitle>
              <CardDescription>
                Pairwise correlations between selected assets
              </CardDescription>
            </CardHeader>
            <CardContent>
              {correlationMatrix ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="p-2"></th>
                        {correlationMatrix.assets.map((asset) => (
                          <th key={asset.symbol} className="p-2 text-center font-medium">
                            {asset.symbol}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {correlationMatrix.assets.map((asset, i) => (
                        <tr key={asset.symbol}>
                          <td className="p-2 font-medium">{asset.symbol}</td>
                          {correlationMatrix.matrix[i].map((corr, j) => (
                            <td 
                              key={j} 
                              className="p-2 text-center"
                              style={{ 
                                backgroundColor: i === j ? '#1f2937' : getCorrelationColor(corr) + '40',
                                color: i === j ? '#9ca3af' : 'inherit'
                              }}
                            >
                              {i === j ? '1.00' : corr.toFixed(2)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Grid3X3 className="h-12 w-12 mb-4 opacity-50" />
                  <p>Select assets and click "Calculate Correlations"</p>
                  <p className="text-sm">to generate the correlation matrix</p>
                </div>
              )}

              {/* Color Legend */}
              {correlationMatrix && (
                <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t">
                  <span className="text-xs text-muted-foreground">Correlation:</span>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
                    <span className="text-xs">-1.0</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }} />
                    <span className="text-xs">0</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }} />
                    <span className="text-xs">+1.0</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cross-Asset Analysis */}
        {crossAssetAnalysis && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Diversification Score</p>
                    <p className="text-3xl font-bold">{crossAssetAnalysis.diversificationScore}</p>
                  </div>
                  <div className={`p-3 rounded-full ${
                    crossAssetAnalysis.diversificationScore >= 70 ? 'bg-green-500/20' :
                    crossAssetAnalysis.diversificationScore >= 40 ? 'bg-yellow-500/20' :
                    'bg-red-500/20'
                  }`}>
                    <Shield className={`h-6 w-6 ${
                      crossAssetAnalysis.diversificationScore >= 70 ? 'text-green-500' :
                      crossAssetAnalysis.diversificationScore >= 40 ? 'text-yellow-500' :
                      'text-red-500'
                    }`} />
                  </div>
                </div>
                <Progress 
                  value={crossAssetAnalysis.diversificationScore} 
                  className="mt-4 h-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Asset Classes</p>
                    <p className="text-3xl font-bold">{crossAssetAnalysis.assetClasses?.length || 0}</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-500/20">
                    <Layers className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
                <div className="flex gap-1 mt-4 flex-wrap">
                  {crossAssetAnalysis.assetClasses?.map((cls: string) => (
                    <Badge 
                      key={cls} 
                      variant="outline"
                      style={{ borderColor: ASSET_CLASS_COLORS[cls], color: ASSET_CLASS_COLORS[cls] }}
                    >
                      {cls}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Risk Concentrations</p>
                    <p className="text-3xl font-bold">{crossAssetAnalysis.riskConcentrations?.length || 0}</p>
                  </div>
                  <div className={`p-3 rounded-full ${
                    crossAssetAnalysis.riskConcentrations?.length === 0 ? 'bg-green-500/20' :
                    crossAssetAnalysis.riskConcentrations?.length <= 2 ? 'bg-yellow-500/20' :
                    'bg-red-500/20'
                  }`}>
                    <AlertTriangle className={`h-6 w-6 ${
                      crossAssetAnalysis.riskConcentrations?.length === 0 ? 'text-green-500' :
                      crossAssetAnalysis.riskConcentrations?.length <= 2 ? 'text-yellow-500' :
                      'text-red-500'
                    }`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Recommendations</p>
                    <p className="text-3xl font-bold">{crossAssetAnalysis.recommendations?.length || 0}</p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-500/20">
                    <Info className="h-6 w-6 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recommendations */}
        {crossAssetAnalysis?.recommendations?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Diversification Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {crossAssetAnalysis.recommendations.map((rec: string, index: number) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="p-1 rounded-full bg-primary/20">
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-sm">{rec}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Risk Concentrations */}
        {crossAssetAnalysis?.riskConcentrations?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                High Correlation Pairs (Risk Concentrations)
              </CardTitle>
              <CardDescription>
                Asset pairs with correlation above 0.7 that may reduce diversification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {crossAssetAnalysis.riskConcentrations.map((risk: any, index: number) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={risk.risk === 'high' ? 'destructive' : 'secondary'}>
                        {risk.risk.toUpperCase()}
                      </Badge>
                      <span className="font-medium">
                        {risk.assets[0].symbol}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {risk.assets[1].symbol}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Correlation:</span>
                      <Badge 
                        variant="outline"
                        style={{ 
                          borderColor: getCorrelationColor(risk.correlation),
                          color: getCorrelationColor(risk.correlation)
                        }}
                      >
                        {risk.correlation.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inter-Class Correlations */}
        {crossAssetAnalysis?.interClassCorrelations && Object.keys(crossAssetAnalysis.interClassCorrelations).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Inter-Class Correlations
              </CardTitle>
              <CardDescription>
                Average correlations between different asset classes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(crossAssetAnalysis.interClassCorrelations).map(([pair, corr]) => {
                  const [class1, class2] = pair.split('-');
                  return (
                    <div 
                      key={pair}
                      className="p-4 rounded-lg border text-center"
                    >
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: ASSET_CLASS_COLORS[class1] }}
                        />
                        <span className="text-xs capitalize">{class1}</span>
                        <Minus className="h-3 w-3 text-muted-foreground" />
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: ASSET_CLASS_COLORS[class2] }}
                        />
                        <span className="text-xs capitalize">{class2}</span>
                      </div>
                      <div 
                        className="text-2xl font-bold"
                        style={{ color: getCorrelationColor(corr as number) }}
                      >
                        {(corr as number).toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
