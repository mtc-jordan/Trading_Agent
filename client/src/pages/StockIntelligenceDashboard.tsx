import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Search,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Target,
  Shield,
  BarChart3,
  Activity,
  Zap,
  Eye,
  ThumbsUp,
  ThumbsDown,
  RefreshCw
} from 'lucide-react';

// Types
interface AgentVote {
  agent: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  rationale: string;
  keyFindings: string[];
}

interface CounterThesis {
  severity: 'low' | 'medium' | 'high' | 'critical';
  killSwitchPrice: number;
  counterArguments: string[];
  blindSpots: string[];
  vetoRecommended: boolean;
}

interface InvestmentThesis {
  id: string;
  ticker: string;
  companyName: string;
  recommendation: string;
  targetPrice: number;
  currentPrice: number;
  upside: number;
  confidence: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  generatedAt: string;
  agentVotes: AgentVote[];
  counterThesis: CounterThesis;
  markdownContent: string;
}

// Mock data for demonstration
const mockAgentVotes: AgentVote[] = [
  {
    agent: 'Fundamental Analyst',
    signal: 'bullish',
    confidence: 78,
    rationale: 'Strong free cash flow growth and improving margins. P/E ratio below sector average.',
    keyFindings: ['FCF up 23% YoY', 'Debt/Equity at 0.4', 'ROE of 18%']
  },
  {
    agent: 'Technical Analyst',
    signal: 'bullish',
    confidence: 72,
    rationale: 'Price above 50 and 200 DMA. RSI at 58 showing momentum without overbought conditions.',
    keyFindings: ['Golden cross formed', 'Support at $145', 'Volume increasing']
  },
  {
    agent: 'Sentiment Harvester',
    signal: 'neutral',
    confidence: 55,
    rationale: 'Mixed sentiment on social media. Analyst ratings are split.',
    keyFindings: ['Reddit sentiment: 0.3', 'News sentiment: 0.1', '12 Buy, 8 Hold ratings']
  },
  {
    agent: 'Macro Linker',
    signal: 'bullish',
    confidence: 65,
    rationale: 'Sector benefits from current rate environment. Dollar weakness supports earnings.',
    keyFindings: ['Positive sector correlation', 'Low beta to rates', 'Export tailwind']
  },
  {
    agent: 'Portfolio Manager',
    signal: 'bullish',
    confidence: 70,
    rationale: 'Consensus bullish with acceptable risk profile. Position sizing at 3% recommended.',
    keyFindings: ['4/5 agents bullish', 'Risk/reward favorable', 'Fits portfolio allocation']
  }
];

const mockCounterThesis: CounterThesis = {
  severity: 'medium',
  killSwitchPrice: 138.50,
  counterArguments: [
    'Valuation stretched compared to historical average',
    'Competition increasing in core market',
    'Management guidance may be overly optimistic'
  ],
  blindSpots: [
    'Regulatory risk in key markets',
    'Customer concentration risk'
  ],
  vetoRecommended: false
};

export default function StockIntelligenceDashboard() {
  const [ticker, setTicker] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentThesis, setCurrentThesis] = useState<InvestmentThesis | null>(null);
  const [recentTheses, setRecentTheses] = useState<InvestmentThesis[]>([]);

  const handleAnalyze = async () => {
    if (!ticker) {
      toast.error('Please enter a ticker symbol');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);

    // Simulate analysis progress
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 500);

    // Simulate API call
    setTimeout(() => {
      clearInterval(progressInterval);
      setAnalysisProgress(100);
      
      const thesis: InvestmentThesis = {
        id: `thesis-${Date.now()}`,
        ticker: ticker.toUpperCase(),
        companyName: `${ticker.toUpperCase()} Inc.`,
        recommendation: 'buy',
        targetPrice: 185.00,
        currentPrice: 158.50,
        upside: 16.7,
        confidence: 72,
        status: 'draft',
        generatedAt: new Date().toISOString(),
        agentVotes: mockAgentVotes,
        counterThesis: mockCounterThesis,
        markdownContent: '# Investment Thesis\n\nGenerated thesis content...'
      };

      setCurrentThesis(thesis);
      setRecentTheses(prev => [thesis, ...prev].slice(0, 10));
      setIsAnalyzing(false);
      toast.success(`Analysis complete for ${ticker.toUpperCase()}`);
    }, 5000);
  };

  const handleApprove = (thesisId: string) => {
    setCurrentThesis(prev => prev ? { ...prev, status: 'approved' } : null);
    toast.success('Thesis approved');
  };

  const handleReject = (thesisId: string) => {
    setCurrentThesis(prev => prev ? { ...prev, status: 'rejected' } : null);
    toast.error('Thesis rejected');
  };

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'bullish':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'bearish':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'bullish':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'bearish':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'bg-green-500/10 text-green-500';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'high':
        return 'bg-orange-500/10 text-orange-500';
      case 'critical':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-500"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      case 'pending_approval':
        return <Badge className="bg-yellow-500/10 text-yellow-500"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge className="bg-gray-500/10 text-gray-500"><FileText className="h-3 w-3 mr-1" /> Draft</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              Stock Intelligence
            </h1>
            <p className="text-muted-foreground mt-1">
              Multi-Agent Analysis with Institutional Investment Thesis Generation
            </p>
          </div>
        </div>

        {/* Analysis Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Analyze Stock
            </CardTitle>
            <CardDescription>
              Enter a ticker symbol to run full multi-agent analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Enter ticker (e.g., AAPL, MSFT, GOOGL)"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                className="max-w-xs"
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              />
              <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Run Analysis
                  </>
                )}
              </Button>
            </div>

            {isAnalyzing && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Analysis Progress</span>
                  <span>{analysisProgress}%</span>
                </div>
                <Progress value={analysisProgress} />
                <div className="text-xs text-muted-foreground">
                  {analysisProgress < 20 && 'Initializing agents...'}
                  {analysisProgress >= 20 && analysisProgress < 40 && 'Running fundamental analysis...'}
                  {analysisProgress >= 40 && analysisProgress < 60 && 'Analyzing technical patterns...'}
                  {analysisProgress >= 60 && analysisProgress < 80 && 'Harvesting sentiment data...'}
                  {analysisProgress >= 80 && analysisProgress < 100 && 'Generating investment thesis...'}
                  {analysisProgress === 100 && 'Analysis complete!'}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analysis Results */}
        {currentThesis && (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="agents">Agent Votes</TabsTrigger>
              <TabsTrigger value="devils-advocate">Devil's Advocate</TabsTrigger>
              <TabsTrigger value="thesis">Investment Thesis</TabsTrigger>
              <TabsTrigger value="approval">Approval</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Recommendation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-lg px-3 py-1 ${
                        currentThesis.recommendation === 'buy' || currentThesis.recommendation === 'strong_buy'
                          ? 'bg-green-500/10 text-green-500'
                          : currentThesis.recommendation === 'sell' || currentThesis.recommendation === 'strong_sell'
                          ? 'bg-red-500/10 text-red-500'
                          : 'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {currentThesis.recommendation.toUpperCase().replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Target Price
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${currentThesis.targetPrice.toFixed(2)}</div>
                    <div className="text-sm text-green-500">
                      +{currentThesis.upside.toFixed(1)}% upside
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Confidence
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{currentThesis.confidence}%</div>
                    <Progress value={currentThesis.confidence} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {getStatusBadge(currentThesis.status)}
                  </CardContent>
                </Card>
              </div>

              {/* Agent Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Agent Consensus
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-4">
                    {currentThesis.agentVotes.map((vote) => (
                      <div key={vote.agent} className="text-center p-4 rounded-lg bg-muted/50">
                        <div className="flex justify-center mb-2">
                          {getSignalIcon(vote.signal)}
                        </div>
                        <div className="text-xs font-medium truncate">{vote.agent}</div>
                        <Badge className={`mt-1 ${getSignalColor(vote.signal)}`}>
                          {vote.signal}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {vote.confidence}%
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Agent Votes Tab */}
            <TabsContent value="agents" className="space-y-4">
              {currentThesis.agentVotes.map((vote) => (
                <Card key={vote.agent}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {getSignalIcon(vote.signal)}
                        {vote.agent}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={getSignalColor(vote.signal)}>
                          {vote.signal.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">{vote.confidence}% confidence</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{vote.rationale}</p>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Key Findings:</div>
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        {vote.keyFindings.map((finding, i) => (
                          <li key={i}>{finding}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Devil's Advocate Tab */}
            <TabsContent value="devils-advocate" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      Devil's Advocate Analysis
                    </CardTitle>
                    <Badge className={getSeverityColor(currentThesis.counterThesis.severity)}>
                      {currentThesis.counterThesis.severity.toUpperCase()} RISK
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {currentThesis.counterThesis.vetoRecommended && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-center gap-2 text-red-500 font-medium">
                        <XCircle className="h-5 w-5" />
                        VETO RECOMMENDED
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        The Devil's Advocate recommends vetoing this trade due to critical risks.
                      </p>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4" />
                      <span className="font-medium">Kill Switch Price</span>
                    </div>
                    <div className="text-2xl font-bold text-red-500">
                      ${currentThesis.counterThesis.killSwitchPrice.toFixed(2)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Exit position if price falls below this level
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="h-4 w-4" />
                      <span className="font-medium">Counter-Arguments</span>
                    </div>
                    <ul className="space-y-2">
                      {currentThesis.counterThesis.counterArguments.map((arg, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-orange-500 mt-1">•</span>
                          <span>{arg}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Separator />

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Eye className="h-4 w-4" />
                      <span className="font-medium">Blind Spots</span>
                    </div>
                    <ul className="space-y-2">
                      {currentThesis.counterThesis.blindSpots.map((spot, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-yellow-500 mt-1">⚠</span>
                          <span>{spot}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Investment Thesis Tab */}
            <TabsContent value="thesis" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Investment Thesis Document
                  </CardTitle>
                  <CardDescription>
                    Institutional-grade investment thesis for {currentThesis.ticker}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px] w-full rounded-md border p-4">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <h1>Investment Thesis: {currentThesis.ticker}</h1>
                      <h2>{currentThesis.companyName}</h2>
                      
                      <h3>Executive Summary</h3>
                      <table>
                        <tbody>
                          <tr>
                            <td><strong>Recommendation</strong></td>
                            <td>{currentThesis.recommendation.toUpperCase()}</td>
                          </tr>
                          <tr>
                            <td><strong>Current Price</strong></td>
                            <td>${currentThesis.currentPrice.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td><strong>Target Price</strong></td>
                            <td>${currentThesis.targetPrice.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td><strong>Upside</strong></td>
                            <td>+{currentThesis.upside.toFixed(1)}%</td>
                          </tr>
                          <tr>
                            <td><strong>Confidence</strong></td>
                            <td>{currentThesis.confidence}%</td>
                          </tr>
                        </tbody>
                      </table>

                      <h3>Agent Analysis Summary</h3>
                      {currentThesis.agentVotes.map((vote) => (
                        <div key={vote.agent}>
                          <h4>{vote.agent}</h4>
                          <p><strong>Signal:</strong> {vote.signal} ({vote.confidence}%)</p>
                          <p>{vote.rationale}</p>
                        </div>
                      ))}

                      <h3>Risk Assessment</h3>
                      <p><strong>Overall Risk:</strong> {currentThesis.counterThesis.severity}</p>
                      <p><strong>Kill Switch Price:</strong> ${currentThesis.counterThesis.killSwitchPrice.toFixed(2)}</p>
                      
                      <h4>Key Risks</h4>
                      <ul>
                        {currentThesis.counterThesis.counterArguments.map((arg, i) => (
                          <li key={i}>{arg}</li>
                        ))}
                      </ul>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Approval Tab */}
            <TabsContent value="approval" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Approval Workflow
                  </CardTitle>
                  <CardDescription>
                    Review and approve the investment thesis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <div className="font-medium">{currentThesis.ticker}</div>
                      <div className="text-sm text-muted-foreground">
                        Generated {new Date(currentThesis.generatedAt).toLocaleString()}
                      </div>
                    </div>
                    {getStatusBadge(currentThesis.status)}
                  </div>

                  {currentThesis.status === 'draft' && (
                    <div className="flex gap-4">
                      <Button 
                        className="flex-1" 
                        variant="default"
                        onClick={() => handleApprove(currentThesis.id)}
                      >
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        Approve Thesis
                      </Button>
                      <Button 
                        className="flex-1" 
                        variant="destructive"
                        onClick={() => handleReject(currentThesis.id)}
                      >
                        <ThumbsDown className="h-4 w-4 mr-2" />
                        Reject Thesis
                      </Button>
                    </div>
                  )}

                  {currentThesis.status === 'approved' && (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="flex items-center gap-2 text-green-500 font-medium">
                        <CheckCircle className="h-5 w-5" />
                        Thesis Approved
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        This investment thesis has been approved and is ready for execution.
                      </p>
                    </div>
                  )}

                  {currentThesis.status === 'rejected' && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-center gap-2 text-red-500 font-medium">
                        <XCircle className="h-5 w-5" />
                        Thesis Rejected
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        This investment thesis has been rejected and will not be executed.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Recent Analyses */}
        {recentTheses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Recent Analyses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentTheses.map((thesis) => (
                  <div 
                    key={thesis.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors"
                    onClick={() => setCurrentThesis(thesis)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="font-medium">{thesis.ticker}</div>
                      <Badge className={
                        thesis.recommendation === 'buy' || thesis.recommendation === 'strong_buy'
                          ? 'bg-green-500/10 text-green-500'
                          : thesis.recommendation === 'sell' || thesis.recommendation === 'strong_sell'
                          ? 'bg-red-500/10 text-red-500'
                          : 'bg-yellow-500/10 text-yellow-500'
                      }>
                        {thesis.recommendation.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground">
                        {new Date(thesis.generatedAt).toLocaleDateString()}
                      </div>
                      {getStatusBadge(thesis.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
