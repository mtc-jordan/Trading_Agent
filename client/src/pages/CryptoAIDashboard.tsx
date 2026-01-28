import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Shield, 
  Zap,
  Brain,
  Target,
  DollarSign,
  BarChart3,
  Wallet,
  RefreshCw,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

// Demo data for the dashboard
const whaleAlerts = [
  { id: 1, wallet: '0x742d...8f44', action: 'accumulating', token: 'ETH', amount: '$2.5M', time: '5 min ago', confidence: 92 },
  { id: 2, wallet: '0x1a2b...3c4d', action: 'distributing', token: 'SOL', amount: '$1.8M', time: '12 min ago', confidence: 87 },
  { id: 3, wallet: '0x5e6f...7g8h', action: 'accumulating', token: 'BTC', amount: '$5.2M', time: '23 min ago', confidence: 95 },
  { id: 4, wallet: '0x9i0j...1k2l', action: 'distributing', token: 'AVAX', amount: '$890K', time: '45 min ago', confidence: 78 },
];

const narrativeStrengths = [
  { name: 'AI & ML Tokens', score: 78, change: 12, tokens: ['FET', 'AGIX', 'OCEAN'] },
  { name: 'Real World Assets', score: 65, change: 8, tokens: ['ONDO', 'MKR', 'PAXG'] },
  { name: 'DePIN', score: 58, change: -5, tokens: ['FIL', 'AR', 'RNDR'] },
  { name: 'Meme Coins', score: 45, change: -15, tokens: ['DOGE', 'SHIB', 'PEPE'] },
  { name: 'Layer 2', score: 72, change: 3, tokens: ['ARB', 'OP', 'MATIC'] },
];

const correlationData = {
  btcNasdaq: 0.72,
  btcSp500: 0.65,
  btcGold: -0.12,
  lagHours: 4,
  regime: 'risk_on' as const,
};

const yieldOpportunities = [
  { pair: 'BTC Funding', apr: 18.5, exchange: 'Binance', risk: 'low' },
  { pair: 'ETH Basis', apr: 14.2, exchange: 'dYdX', risk: 'low' },
  { pair: 'SOL Funding', apr: 22.8, exchange: 'Bybit', risk: 'medium' },
  { pair: 'Cross-Exchange Arb', apr: 8.5, exchange: 'Multi', risk: 'low' },
];

const filterResults = [
  { token: 'ETH', status: 'pass', volume: '$12.5B', spread: '0.02%', audit: 'CertiK', whaleRisk: 'low' },
  { token: 'SOL', status: 'pass', volume: '$3.2B', spread: '0.05%', audit: 'Hacken', whaleRisk: 'low' },
  { token: 'PEPE', status: 'fail', volume: '$450M', spread: '0.8%', audit: 'None', whaleRisk: 'high' },
  { token: 'ARB', status: 'pass', volume: '$890M', spread: '0.12%', audit: 'Trail of Bits', whaleRisk: 'medium' },
];

export default function CryptoAIDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Crypto AI Command Center</h1>
          <p className="text-muted-foreground mt-1">
            Institutional-grade crypto intelligence powered by AI agents
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Whale Activity</p>
                <p className="text-2xl font-bold">High</p>
                <p className="text-xs text-blue-400">+23% from yesterday</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Best Yield APR</p>
                <p className="text-2xl font-bold">22.8%</p>
                <p className="text-xs text-green-400">SOL Funding Rate</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Market Regime</p>
                <p className="text-2xl font-bold">Risk-On</p>
                <p className="text-xs text-purple-400">BTC-Nasdaq: 0.72</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Activity className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hot Narrative</p>
                <p className="text-2xl font-bold">AI Tokens</p>
                <p className="text-xs text-orange-400">Score: 78/100</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Brain className="h-6 w-6 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="whale">Whale Agent</TabsTrigger>
          <TabsTrigger value="hype">Hype Agent</TabsTrigger>
          <TabsTrigger value="macro">Macro Agent</TabsTrigger>
          <TabsTrigger value="yield">Yield Engine</TabsTrigger>
          <TabsTrigger value="filter">Risk Filter</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Whale Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-blue-400" />
                  Recent Whale Alerts
                </CardTitle>
                <CardDescription>Smart money movements detected in the last hour</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {whaleAlerts.slice(0, 3).map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          alert.action === 'accumulating' ? 'bg-green-500/20' : 'bg-red-500/20'
                        }`}>
                          {alert.action === 'accumulating' ? (
                            <TrendingUp className="h-5 w-5 text-green-400" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{alert.wallet}</p>
                          <p className="text-sm text-muted-foreground">
                            {alert.action} {alert.token} • {alert.amount}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={alert.confidence > 85 ? 'default' : 'secondary'}>
                          {alert.confidence}% conf
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Narrative Strength */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-400" />
                  Narrative Strength
                </CardTitle>
                <CardDescription>Current crypto narrative momentum</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {narrativeStrengths.slice(0, 4).map((narrative) => (
                    <div key={narrative.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{narrative.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={narrative.change > 0 ? 'text-green-400' : 'text-red-400'}>
                            {narrative.change > 0 ? '+' : ''}{narrative.change}%
                          </span>
                          <span className="text-muted-foreground">{narrative.score}/100</span>
                        </div>
                      </div>
                      <Progress value={narrative.score} className="h-2" />
                      <div className="flex gap-1">
                        {narrative.tokens.map((token) => (
                          <Badge key={token} variant="outline" className="text-xs">
                            {token}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Yield Opportunities & Correlation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-400" />
                  Top Yield Opportunities
                </CardTitle>
                <CardDescription>Delta-neutral strategies available now</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {yieldOpportunities.map((opp, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">{opp.pair}</p>
                        <p className="text-sm text-muted-foreground">{opp.exchange}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-green-400">{opp.apr}%</p>
                        <Badge variant={opp.risk === 'low' ? 'default' : 'secondary'}>
                          {opp.risk} risk
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                  Cross-Asset Correlation
                </CardTitle>
                <CardDescription>BTC correlation with traditional markets</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <p className="text-sm text-muted-foreground">BTC-Nasdaq</p>
                      <p className="text-2xl font-bold text-blue-400">{correlationData.btcNasdaq}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <p className="text-sm text-muted-foreground">BTC-S&P500</p>
                      <p className="text-2xl font-bold text-purple-400">{correlationData.btcSp500}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <p className="text-sm text-muted-foreground">BTC-Gold</p>
                      <p className="text-2xl font-bold text-yellow-400">{correlationData.btcGold}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <p className="text-sm text-muted-foreground">Lag Time</p>
                      <p className="text-2xl font-bold text-green-400">{correlationData.lagHours}h</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/20 to-green-600/10 border border-green-500/30">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-green-400" />
                      <span className="font-medium">Current Regime: Risk-On</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      BTC trading as high-beta tech. Expect correlation to persist.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Whale Agent Tab */}
        <TabsContent value="whale" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-blue-400" />
                On-Chain Intelligence Agent
              </CardTitle>
              <CardDescription>
                Real-time whale tracking and smart money flow analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {whaleAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                        alert.action === 'accumulating' 
                          ? 'bg-green-500/20 border-2 border-green-500/50' 
                          : 'bg-red-500/20 border-2 border-red-500/50'
                      }`}>
                        {alert.action === 'accumulating' ? (
                          <TrendingUp className="h-6 w-6 text-green-400" />
                        ) : (
                          <TrendingDown className="h-6 w-6 text-red-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-mono font-medium">{alert.wallet}</p>
                          <Badge variant="outline">Known Whale</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {alert.action === 'accumulating' ? 'Accumulating' : 'Distributing'} {alert.token}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">{alert.amount}</p>
                      <div className="flex items-center gap-2 justify-end mt-1">
                        <Progress value={alert.confidence} className="w-20 h-2" />
                        <span className="text-sm text-muted-foreground">{alert.confidence}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {alert.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <h4 className="font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-400" />
                  AI Insight
                </h4>
                <p className="text-sm text-muted-foreground mt-2">
                  Strong accumulation pattern detected for ETH. 3 known institutional wallets have 
                  increased positions by $8.5M in the last 24 hours. Historical accuracy of similar 
                  patterns: 78% bullish outcome within 7 days.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hype Agent Tab */}
        <TabsContent value="hype" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-400" />
                Sentiment & Narrative Mapping Agent
              </CardTitle>
              <CardDescription>
                NLP-based social dominance monitoring and narrative tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {narrativeStrengths.map((narrative) => (
                  <div key={narrative.name} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          narrative.score > 70 ? 'bg-green-500/20' : 
                          narrative.score > 50 ? 'bg-yellow-500/20' : 'bg-red-500/20'
                        }`}>
                          <Target className={`h-5 w-5 ${
                            narrative.score > 70 ? 'text-green-400' : 
                            narrative.score > 50 ? 'text-yellow-400' : 'text-red-400'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium">{narrative.name}</p>
                          <div className="flex gap-1 mt-1">
                            {narrative.tokens.map((token) => (
                              <Badge key={token} variant="outline" className="text-xs">
                                {token}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{narrative.score}</p>
                        <p className={`text-sm ${narrative.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {narrative.change > 0 ? '↑' : '↓'} {Math.abs(narrative.change)}% this week
                        </p>
                      </div>
                    </div>
                    <Progress value={narrative.score} className="h-3" />
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                      <span>Dormant</span>
                      <span>Rising</span>
                      <span>Peaking</span>
                      <span>Overheated</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <h4 className="font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-purple-400" />
                  Divergence Alert
                </h4>
                <p className="text-sm text-muted-foreground mt-2">
                  Meme coin narrative showing signs of blow-off top. Social volume down 15% while 
                  prices remain elevated. Consider reducing exposure to DOGE, SHIB, PEPE.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Macro Agent Tab */}
        <TabsContent value="macro" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-400" />
                Cross-Asset Correlation Agent
              </CardTitle>
              <CardDescription>
                BTC-Nasdaq correlation tracking and lag analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-6 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 text-center">
                  <p className="text-sm text-muted-foreground">BTC-Nasdaq Correlation</p>
                  <p className="text-4xl font-bold text-blue-400 mt-2">0.72</p>
                  <p className="text-xs text-muted-foreground mt-1">Strong positive</p>
                </div>
                <div className="p-6 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 text-center">
                  <p className="text-sm text-muted-foreground">Optimal Lag</p>
                  <p className="text-4xl font-bold text-purple-400 mt-2">4h</p>
                  <p className="text-xs text-muted-foreground mt-1">BTC follows Nasdaq</p>
                </div>
                <div className="p-6 rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 text-center">
                  <p className="text-sm text-muted-foreground">Market Regime</p>
                  <p className="text-4xl font-bold text-green-400 mt-2">Risk-On</p>
                  <p className="text-xs text-muted-foreground mt-1">85% confidence</p>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium mb-4">Correlation Matrix</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Asset Pair</th>
                        <th className="text-center py-2">1D</th>
                        <th className="text-center py-2">1W</th>
                        <th className="text-center py-2">1M</th>
                        <th className="text-center py-2">Lag</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-3">BTC / Nasdaq</td>
                        <td className="text-center text-green-400">0.72</td>
                        <td className="text-center text-green-400">0.68</td>
                        <td className="text-center text-green-400">0.65</td>
                        <td className="text-center">4h</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3">BTC / S&P 500</td>
                        <td className="text-center text-green-400">0.65</td>
                        <td className="text-center text-green-400">0.62</td>
                        <td className="text-center text-green-400">0.58</td>
                        <td className="text-center">6h</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3">BTC / Gold</td>
                        <td className="text-center text-red-400">-0.12</td>
                        <td className="text-center text-red-400">-0.08</td>
                        <td className="text-center text-yellow-400">0.05</td>
                        <td className="text-center">N/A</td>
                      </tr>
                      <tr>
                        <td className="py-3">ETH / BTC</td>
                        <td className="text-center text-green-400">0.92</td>
                        <td className="text-center text-green-400">0.89</td>
                        <td className="text-center text-green-400">0.85</td>
                        <td className="text-center">1h</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <h4 className="font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-400" />
                  Lag Opportunity Detected
                </h4>
                <p className="text-sm text-muted-foreground mt-2">
                  Nasdaq moved +1.2% 4 hours ago. Based on historical lag correlation (72%), 
                  BTC expected to follow with similar move. Consider long position.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Yield Engine Tab */}
        <TabsContent value="yield" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-400" />
                Delta-Neutral Yield Strategy Engine
              </CardTitle>
              <CardDescription>
                Automated cash-and-carry trades for risk-free yield
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {yieldOpportunities.map((opp, i) => (
                  <div key={i} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium">{opp.pair}</p>
                        <p className="text-sm text-muted-foreground">{opp.exchange}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-green-400">{opp.apr}%</p>
                        <p className="text-xs text-muted-foreground">APR</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant={opp.risk === 'low' ? 'default' : 'secondary'}>
                        {opp.risk} risk
                      </Badge>
                      <Button size="sm" variant="outline">
                        View Strategy <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium mb-4">Strategy Execution Steps</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-green-400">1</span>
                    </div>
                    <div>
                      <p className="font-medium">Buy Spot</p>
                      <p className="text-sm text-muted-foreground">Purchase BTC spot on Binance at market price</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-green-400">2</span>
                    </div>
                    <div>
                      <p className="font-medium">Short Perpetual</p>
                      <p className="text-sm text-muted-foreground">Open equivalent short position on BTC perpetual futures</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-green-400">3</span>
                    </div>
                    <div>
                      <p className="font-medium">Collect Funding</p>
                      <p className="text-sm text-muted-foreground">Receive funding payments every 8 hours (currently 0.01%)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-400">4</span>
                    </div>
                    <div>
                      <p className="font-medium">Monitor & Rebalance</p>
                      <p className="text-sm text-muted-foreground">AI monitors funding rates and rebalances when rates change</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Filter Tab */}
        <TabsContent value="filter" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-orange-400" />
                Institutional Risk Filter
              </CardTitle>
              <CardDescription>
                Strict on-chain risk policies to prevent rug pulls and low-liquidity traps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filterResults.map((result, i) => (
                  <div key={i} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {result.status === 'pass' ? (
                          <CheckCircle className="h-6 w-6 text-green-400" />
                        ) : (
                          <XCircle className="h-6 w-6 text-red-400" />
                        )}
                        <div>
                          <p className="font-medium text-lg">{result.token}</p>
                          <Badge variant={result.status === 'pass' ? 'default' : 'destructive'}>
                            {result.status === 'pass' ? 'APPROVED' : 'BLOCKED'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Daily Volume</p>
                        <p className="font-medium">{result.volume}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Spread</p>
                        <p className="font-medium">{result.spread}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Audit</p>
                        <p className="font-medium">{result.audit}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Whale Risk</p>
                        <Badge variant={
                          result.whaleRisk === 'low' ? 'default' : 
                          result.whaleRisk === 'medium' ? 'secondary' : 'destructive'
                        }>
                          {result.whaleRisk}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-3">Filter Criteria</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>Minimum $5M daily volume</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>Maximum 0.5% bid-ask spread</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>Verified smart contract audit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>Max 3% single wallet holding</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>Minimum 1,000 holders</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>90+ days token age</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
