import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Award, 
  BarChart3,
  RefreshCw,
  Brain,
  Scale,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react';

// Mock data for demonstration
const mockPerformanceData = {
  totalTheses: 24,
  closedTheses: 18,
  overallAccuracy: 0.72,
  avgAlpha: 2.3,
  avgReturnDifference: -1.2,
  bestAgent: 'fundamental',
  worstAgent: 'sentiment'
};

const mockComparisons = [
  {
    thesisId: 1,
    ticker: 'AAPL',
    rating: 'buy',
    predictedReturn: 15,
    actualReturn: 18.5,
    wasCorrect: true,
    convictionScore: 85,
    alphaGenerated: 3.5,
    timeHeld: 45
  },
  {
    thesisId: 2,
    ticker: 'MSFT',
    rating: 'strong_buy',
    predictedReturn: 20,
    actualReturn: 12.3,
    wasCorrect: true,
    convictionScore: 92,
    alphaGenerated: -2.7,
    timeHeld: 60
  },
  {
    thesisId: 3,
    ticker: 'TSLA',
    rating: 'sell',
    predictedReturn: -10,
    actualReturn: 5.2,
    wasCorrect: false,
    convictionScore: 68,
    alphaGenerated: -15.2,
    timeHeld: 30
  }
];

const mockWeightAdjustments = [
  { agentType: 'fundamental', previousWeight: 0.25, newWeight: 0.28, accuracyDelta: 0.15, confidenceLevel: 0.85 },
  { agentType: 'technical', previousWeight: 0.20, newWeight: 0.22, accuracyDelta: 0.08, confidenceLevel: 0.72 },
  { agentType: 'sentiment', previousWeight: 0.15, newWeight: 0.12, accuracyDelta: -0.12, confidenceLevel: 0.65 },
  { agentType: 'macro', previousWeight: 0.20, newWeight: 0.19, accuracyDelta: -0.03, confidenceLevel: 0.78 },
  { agentType: 'portfolio', previousWeight: 0.20, newWeight: 0.19, accuracyDelta: -0.02, confidenceLevel: 0.80 }
];

const mockConditionPerformance = [
  { regime: 'bull', accuracy: 0.78, sampleSize: 8 },
  { regime: 'bear', accuracy: 0.65, sampleSize: 4 },
  { regime: 'sideways', accuracy: 0.71, sampleSize: 5 },
  { regime: 'volatile', accuracy: 0.60, sampleSize: 3 }
];

export default function PerformanceTrackerDashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  };

  const handleApplyWeights = () => {
    // Would call API to apply weight adjustments
    alert('Weight adjustments applied successfully!');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Performance Tracker</h1>
            <p className="text-muted-foreground">
              Track thesis performance and optimize agent weights
            </p>
          </div>
          <Button onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Accuracy</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(mockPerformanceData.overallAccuracy * 100).toFixed(1)}%
              </div>
              <Progress value={mockPerformanceData.overallAccuracy * 100} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {mockPerformanceData.closedTheses} of {mockPerformanceData.totalTheses} theses closed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Alpha</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +{mockPerformanceData.avgAlpha.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Outperformance vs benchmark
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Best Agent</CardTitle>
              <Award className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">
                {mockPerformanceData.bestAgent}
              </div>
              <p className="text-xs text-muted-foreground">
                Highest prediction accuracy
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Needs Improvement</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">
                {mockPerformanceData.worstAgent}
              </div>
              <p className="text-xs text-muted-foreground">
                Lowest prediction accuracy
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="comparisons">Comparisons</TabsTrigger>
            <TabsTrigger value="weights">Weight Adjustments</TabsTrigger>
            <TabsTrigger value="conditions">Market Conditions</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Agent Accuracy Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mockWeightAdjustments.map((agent) => (
                    <div key={agent.agentType} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">{agent.agentType}</span>
                        <span className={agent.accuracyDelta >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {agent.accuracyDelta >= 0 ? '+' : ''}{(agent.accuracyDelta * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={(0.5 + agent.accuracyDelta) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Learning Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span>Total Comparisons</span>
                    <span className="font-bold">{mockPerformanceData.closedTheses}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span>Avg Return Difference</span>
                    <span className={`font-bold ${mockPerformanceData.avgReturnDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {mockPerformanceData.avgReturnDifference >= 0 ? '+' : ''}{mockPerformanceData.avgReturnDifference.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span>Confidence Level</span>
                    <span className="font-bold">78%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span>Learning Rate</span>
                    <span className="font-bold">0.10</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Comparisons Tab */}
          <TabsContent value="comparisons" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Thesis Performance Comparisons</CardTitle>
                <CardDescription>
                  Actual vs predicted performance for closed investment theses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockComparisons.map((comparison) => (
                    <div 
                      key={comparison.thesisId}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        {comparison.wasCorrect ? (
                          <CheckCircle2 className="h-8 w-8 text-green-500" />
                        ) : (
                          <XCircle className="h-8 w-8 text-red-500" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">{comparison.ticker}</span>
                            <Badge variant={comparison.rating.includes('buy') ? 'default' : 'destructive'}>
                              {comparison.rating.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Held for {comparison.timeHeld} days • Conviction: {comparison.convictionScore}%
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Predicted</p>
                            <p className={`font-bold ${comparison.predictedReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {comparison.predictedReturn >= 0 ? '+' : ''}{comparison.predictedReturn}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Actual</p>
                            <p className={`font-bold ${comparison.actualReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {comparison.actualReturn >= 0 ? '+' : ''}{comparison.actualReturn}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Alpha</p>
                            <p className={`font-bold ${comparison.alphaGenerated >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {comparison.alphaGenerated >= 0 ? '+' : ''}{comparison.alphaGenerated}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Weight Adjustments Tab */}
          <TabsContent value="weights" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Recommended Weight Adjustments
                </CardTitle>
                <CardDescription>
                  Based on historical performance analysis using adaptive learning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockWeightAdjustments.map((adjustment) => (
                    <div 
                      key={adjustment.agentType}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <span className="font-bold capitalize">{adjustment.agentType} Agent</span>
                        <p className="text-sm text-muted-foreground">
                          Confidence: {(adjustment.confidenceLevel * 100).toFixed(0)}%
                        </p>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Previous</p>
                          <p className="font-bold">{(adjustment.previousWeight * 100).toFixed(0)}%</p>
                        </div>
                        <div className="text-2xl">→</div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Recommended</p>
                          <p className={`font-bold ${adjustment.newWeight > adjustment.previousWeight ? 'text-green-600' : 'text-red-600'}`}>
                            {(adjustment.newWeight * 100).toFixed(0)}%
                          </p>
                        </div>
                        <Badge variant={adjustment.accuracyDelta >= 0 ? 'default' : 'secondary'}>
                          {adjustment.accuracyDelta >= 0 ? '+' : ''}{(adjustment.accuracyDelta * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleApplyWeights}>
                    Apply Weight Adjustments
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Market Conditions Tab */}
          <TabsContent value="conditions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance by Market Condition</CardTitle>
                <CardDescription>
                  How the system performs under different market regimes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {mockConditionPerformance.map((condition) => (
                    <div 
                      key={condition.regime}
                      className="p-4 border rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold capitalize text-lg">{condition.regime} Market</span>
                        <Badge variant={condition.accuracy >= 0.7 ? 'default' : 'secondary'}>
                          {condition.sampleSize} samples
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Accuracy</span>
                          <span className={`font-bold ${condition.accuracy >= 0.7 ? 'text-green-600' : 'text-orange-600'}`}>
                            {(condition.accuracy * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={condition.accuracy * 100} className="h-3" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
