import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { 
  TrendingUp, 
  TrendingDown,
  BarChart3, 
  Trophy,
  Target,
  Activity,
  ArrowUp,
  ArrowDown,
  Minus,
  LineChart
} from 'lucide-react';

export default function TemplatePerformance() {
  const [period, setPeriod] = useState<'1m' | '3m' | '6m' | '1y' | 'ytd'>('1y');
  const [sortBy, setSortBy] = useState<'return' | 'sharpe' | 'drawdown'>('return');
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);

  // Queries
  const { data: rankings, isLoading: loadingRankings } = 
    trpc.broker.getTemplateRankings.useQuery({ period, sortBy });

  const { data: comparison, isLoading: loadingComparison } = 
    trpc.broker.compareTemplatePerformance.useQuery(
      { templateIds: selectedTemplates, period: period === 'ytd' ? '1y' : period },
      { enabled: selectedTemplates.length >= 2 }
    );

  const toggleTemplateSelection = (templateId: string) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId].slice(-4) // Max 4 templates
    );
  };

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'conservative': return 'bg-blue-600/20 text-blue-400 border-blue-600';
      case 'moderate': return 'bg-yellow-600/20 text-yellow-400 border-yellow-600';
      case 'aggressive': return 'bg-red-600/20 text-red-400 border-red-600';
      default: return 'bg-gray-600/20 text-gray-400 border-gray-600';
    }
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Template Performance</h1>
            <p className="text-gray-400 mt-1">
              Track and compare simulation template performance over time
            </p>
          </div>
          <div className="flex gap-3">
            <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
              <SelectTrigger className="w-[120px] bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="1m">1 Month</SelectItem>
                <SelectItem value="3m">3 Months</SelectItem>
                <SelectItem value="6m">6 Months</SelectItem>
                <SelectItem value="ytd">YTD</SelectItem>
                <SelectItem value="1y">1 Year</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-[150px] bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="return">By Return</SelectItem>
                <SelectItem value="sharpe">By Sharpe Ratio</SelectItem>
                <SelectItem value="drawdown">By Drawdown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="rankings" className="space-y-6">
          <TabsList className="bg-gray-800/50 border border-gray-700">
            <TabsTrigger value="rankings" className="data-[state=active]:bg-green-600">
              <Trophy className="w-4 h-4 mr-2" />
              Rankings
            </TabsTrigger>
            <TabsTrigger value="compare" className="data-[state=active]:bg-green-600">
              <BarChart3 className="w-4 h-4 mr-2" />
              Compare
            </TabsTrigger>
          </TabsList>

          {/* Rankings Tab */}
          <TabsContent value="rankings" className="space-y-6">
            {loadingRankings ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="bg-gray-900/50 border-gray-800 animate-pulse">
                    <CardContent className="p-6 h-24" />
                  </Card>
                ))}
              </div>
            ) : rankings && rankings.length > 0 ? (
              <div className="space-y-4">
                {rankings.map((template, index) => (
                  <Card 
                    key={template.templateId}
                    className={`bg-gray-900/50 border-gray-800 hover:border-green-600/50 transition-colors cursor-pointer ${
                      selectedTemplates.includes(template.templateId) ? 'border-green-600' : ''
                    }`}
                    onClick={() => toggleTemplateSelection(template.templateId)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Rank */}
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                            index === 0 ? 'bg-yellow-600/20 text-yellow-400' :
                            index === 1 ? 'bg-gray-400/20 text-gray-300' :
                            index === 2 ? 'bg-orange-600/20 text-orange-400' :
                            'bg-gray-800 text-gray-400'
                          }`}>
                            #{template.rank}
                          </div>
                          
                          {/* Template Info */}
                          <div>
                            <h3 className="text-white font-semibold text-lg">{template.templateName}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="border-gray-600 text-gray-400">
                                {template.category}
                              </Badge>
                              <Badge variant="outline" className={getRiskBadgeColor(template.riskLevel)}>
                                {template.riskLevel}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Metrics */}
                        <div className="flex items-center gap-8">
                          <div className="text-center">
                            <div className={`text-xl font-bold flex items-center gap-1 ${
                              template.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {template.totalReturn >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                              {formatPercent(template.totalReturn)}
                            </div>
                            <div className="text-gray-500 text-sm">Return</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-xl font-bold ${
                              template.sharpeRatio >= 1 ? 'text-green-400' : 
                              template.sharpeRatio >= 0 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {template.sharpeRatio.toFixed(2)}
                            </div>
                            <div className="text-gray-500 text-sm">Sharpe</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-red-400">
                              -{template.maxDrawdown.toFixed(2)}%
                            </div>
                            <div className="text-gray-500 text-sm">Max DD</div>
                          </div>
                          <div>
                            {selectedTemplates.includes(template.templateId) ? (
                              <Badge className="bg-green-600">Selected</Badge>
                            ) : (
                              <Button variant="outline" size="sm" className="border-gray-700 text-gray-300">
                                Compare
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-12 text-center">
                  <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Rankings Available</h3>
                  <p className="text-gray-400">Performance data is being calculated...</p>
                </CardContent>
              </Card>
            )}

            {selectedTemplates.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Selected for comparison:</span>
                {selectedTemplates.map(id => {
                  const template = rankings?.find(t => t.templateId === id);
                  return (
                    <Badge key={id} className="bg-green-600/20 text-green-400">
                      {template?.templateName || id}
                    </Badge>
                  );
                })}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-400"
                  onClick={() => setSelectedTemplates([])}
                >
                  Clear
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Compare Tab */}
          <TabsContent value="compare" className="space-y-6">
            {selectedTemplates.length < 2 ? (
              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-12 text-center">
                  <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Select Templates to Compare</h3>
                  <p className="text-gray-400">
                    Click on templates in the Rankings tab to select them for comparison (2-4 templates)
                  </p>
                </CardContent>
              </Card>
            ) : loadingComparison ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="bg-gray-900/50 border-gray-800 animate-pulse">
                    <CardContent className="p-6 h-48" />
                  </Card>
                ))}
              </div>
            ) : comparison ? (
              <div className="space-y-6">
                {/* Comparison Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        Best Return
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-400">
                        {formatPercent(comparison.comparison.bestReturn.value)}
                      </div>
                      <div className="text-gray-400 text-sm">
                        {comparison.templates.find(t => t.templateId === comparison.comparison.bestReturn.templateId)?.templateName}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                        <Target className="w-4 h-4 text-blue-400" />
                        Best Sharpe
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-400">
                        {comparison.comparison.bestSharpe.value.toFixed(2)}
                      </div>
                      <div className="text-gray-400 text-sm">
                        {comparison.templates.find(t => t.templateId === comparison.comparison.bestSharpe.templateId)?.templateName}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-yellow-400" />
                        Lowest Drawdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-400">
                        -{comparison.comparison.lowestDrawdown.value.toFixed(2)}%
                      </div>
                      <div className="text-gray-400 text-sm">
                        {comparison.templates.find(t => t.templateId === comparison.comparison.lowestDrawdown.templateId)?.templateName}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-purple-400" />
                        Lowest Volatility
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-400">
                        {comparison.comparison.lowestVolatility.value.toFixed(2)}%
                      </div>
                      <div className="text-gray-400 text-sm">
                        {comparison.templates.find(t => t.templateId === comparison.comparison.lowestVolatility.templateId)?.templateName}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Comparison */}
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white">Detailed Comparison</CardTitle>
                    <CardDescription className="text-gray-400">
                      Side-by-side performance metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-800">
                            <th className="text-left text-gray-400 py-3 px-4">Metric</th>
                            {comparison.templates.map(t => (
                              <th key={t.templateId} className="text-center text-white py-3 px-4">
                                {t.templateName}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-gray-800/50">
                            <td className="text-gray-400 py-3 px-4">Total Return</td>
                            {comparison.templates.map(t => (
                              <td key={t.templateId} className={`text-center py-3 px-4 font-semibold ${
                                t.metrics.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {formatPercent(t.metrics.totalReturn)}
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b border-gray-800/50">
                            <td className="text-gray-400 py-3 px-4">Annualized Return</td>
                            {comparison.templates.map(t => (
                              <td key={t.templateId} className={`text-center py-3 px-4 ${
                                t.metrics.annualizedReturn >= 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {formatPercent(t.metrics.annualizedReturn)}
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b border-gray-800/50">
                            <td className="text-gray-400 py-3 px-4">Volatility</td>
                            {comparison.templates.map(t => (
                              <td key={t.templateId} className="text-center py-3 px-4 text-white">
                                {t.metrics.volatility.toFixed(2)}%
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b border-gray-800/50">
                            <td className="text-gray-400 py-3 px-4">Sharpe Ratio</td>
                            {comparison.templates.map(t => (
                              <td key={t.templateId} className={`text-center py-3 px-4 font-semibold ${
                                t.metrics.sharpeRatio >= 1 ? 'text-green-400' : 
                                t.metrics.sharpeRatio >= 0 ? 'text-yellow-400' : 'text-red-400'
                              }`}>
                                {t.metrics.sharpeRatio.toFixed(2)}
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b border-gray-800/50">
                            <td className="text-gray-400 py-3 px-4">Max Drawdown</td>
                            {comparison.templates.map(t => (
                              <td key={t.templateId} className="text-center py-3 px-4 text-red-400">
                                -{t.metrics.maxDrawdown.toFixed(2)}%
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b border-gray-800/50">
                            <td className="text-gray-400 py-3 px-4">Win Rate</td>
                            {comparison.templates.map(t => (
                              <td key={t.templateId} className="text-center py-3 px-4 text-white">
                                {t.metrics.winRate.toFixed(1)}%
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b border-gray-800/50">
                            <td className="text-gray-400 py-3 px-4">Total Trades</td>
                            {comparison.templates.map(t => (
                              <td key={t.templateId} className="text-center py-3 px-4 text-white">
                                {t.metrics.totalTrades}
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b border-gray-800/50">
                            <td className="text-gray-400 py-3 px-4">Best Day</td>
                            {comparison.templates.map(t => (
                              <td key={t.templateId} className="text-center py-3 px-4 text-green-400">
                                +{t.metrics.bestDay.return.toFixed(2)}%
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="text-gray-400 py-3 px-4">Worst Day</td>
                            {comparison.templates.map(t => (
                              <td key={t.templateId} className="text-center py-3 px-4 text-red-400">
                                {t.metrics.worstDay.return.toFixed(2)}%
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
