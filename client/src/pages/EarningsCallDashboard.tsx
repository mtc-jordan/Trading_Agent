import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Mic, 
  TrendingUp, 
  TrendingDown, 
  Search,
  RefreshCw,
  MessageSquare,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Calendar,
  Users
} from 'lucide-react';

// Mock data for demonstration
const mockTranscript = {
  ticker: 'AAPL',
  companyName: 'Apple Inc.',
  callDate: new Date('2025-01-28'),
  fiscalQuarter: 'Q1',
  fiscalYear: 2025,
  participants: [
    { name: 'Tim Cook', role: 'CEO' },
    { name: 'Luca Maestri', role: 'CFO' },
    { name: 'Katy Huberty', role: 'Analyst - Morgan Stanley' }
  ],
  toneAnalysis: {
    overallSentiment: 'positive',
    sentimentScore: 0.65,
    managementTone: { score: 0.72, label: 'Confident' },
    analystTone: { score: 0.45, label: 'Cautiously Optimistic' },
    forwardLookingScore: 0.58,
    guidanceDirection: 'raised',
    confidenceLevel: 0.78,
    positiveThemes: [
      { theme: 'Strong iPhone demand', sentiment: 'positive' },
      { theme: 'Services revenue growth', sentiment: 'positive' },
      { theme: 'AI integration momentum', sentiment: 'positive' }
    ],
    negativeThemes: [
      { theme: 'China market challenges', sentiment: 'negative' },
      { theme: 'Supply chain concerns', sentiment: 'negative' }
    ],
    confidenceIndicators: ['exceeded expectations', 'record quarter', 'strong momentum'],
    cautionIndicators: ['macroeconomic uncertainty', 'competitive pressure']
  }
};

const mockRecentCalls = [
  { ticker: 'AAPL', date: '2025-01-28', sentiment: 0.65, guidance: 'raised' },
  { ticker: 'MSFT', date: '2025-01-25', sentiment: 0.72, guidance: 'maintained' },
  { ticker: 'GOOGL', date: '2025-01-23', sentiment: 0.48, guidance: 'lowered' },
  { ticker: 'AMZN', date: '2025-01-20', sentiment: 0.55, guidance: 'maintained' },
  { ticker: 'NVDA', date: '2025-01-18', sentiment: 0.82, guidance: 'raised' }
];

export default function EarningsCallDashboard() {
  const [ticker, setTicker] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis');

  const handleAnalyze = async () => {
    if (!ticker) return;
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
  };

  const getSentimentIcon = (score: number) => {
    if (score > 0.3) return <ThumbsUp className="h-5 w-5 text-green-500" />;
    if (score < -0.3) return <ThumbsDown className="h-5 w-5 text-red-500" />;
    return <Minus className="h-5 w-5 text-yellow-500" />;
  };

  const getSentimentColor = (score: number) => {
    if (score > 0.3) return 'text-green-600';
    if (score < -0.3) return 'text-red-600';
    return 'text-yellow-600';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Earnings Call Analysis</h1>
            <p className="text-muted-foreground">
              AI-powered tone analysis and sentiment extraction from earnings calls
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Enter ticker symbol (e.g., AAPL, MSFT, GOOGL)"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                />
              </div>
              <Button onClick={handleAnalyze} disabled={isLoading || !ticker}>
                {isLoading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Analyze Call
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Calls Quick Access */}
        <div className="flex gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground self-center">Recent:</span>
          {mockRecentCalls.map((call) => (
            <Button
              key={call.ticker}
              variant="outline"
              size="sm"
              onClick={() => setTicker(call.ticker)}
              className="gap-2"
            >
              {call.ticker}
              {getSentimentIcon(call.sentiment)}
            </Button>
          ))}
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="analysis">Tone Analysis</TabsTrigger>
            <TabsTrigger value="themes">Key Themes</TabsTrigger>
            <TabsTrigger value="comparison">QoQ Comparison</TabsTrigger>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
          </TabsList>

          {/* Tone Analysis Tab */}
          <TabsContent value="analysis" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overall Sentiment</CardTitle>
                  <Mic className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold capitalize ${getSentimentColor(mockTranscript.toneAnalysis.sentimentScore)}`}>
                    {mockTranscript.toneAnalysis.overallSentiment}
                  </div>
                  <Progress 
                    value={(mockTranscript.toneAnalysis.sentimentScore + 1) * 50} 
                    className="mt-2" 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Score: {mockTranscript.toneAnalysis.sentimentScore.toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Management Tone</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {mockTranscript.toneAnalysis.managementTone.label}
                  </div>
                  <Progress 
                    value={(mockTranscript.toneAnalysis.managementTone.score + 1) * 50} 
                    className="mt-2" 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Score: {mockTranscript.toneAnalysis.managementTone.score.toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Guidance Direction</CardTitle>
                  {mockTranscript.toneAnalysis.guidanceDirection === 'raised' ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : mockTranscript.toneAnalysis.guidanceDirection === 'lowered' ? (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  ) : (
                    <Minus className="h-4 w-4 text-yellow-500" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold capitalize ${
                    mockTranscript.toneAnalysis.guidanceDirection === 'raised' ? 'text-green-600' :
                    mockTranscript.toneAnalysis.guidanceDirection === 'lowered' ? 'text-red-600' :
                    'text-yellow-600'
                  }`}>
                    {mockTranscript.toneAnalysis.guidanceDirection}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Forward-looking score: {(mockTranscript.toneAnalysis.forwardLookingScore * 100).toFixed(0)}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Confidence Level</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(mockTranscript.toneAnalysis.confidenceLevel * 100).toFixed(0)}%
                  </div>
                  <Progress 
                    value={mockTranscript.toneAnalysis.confidenceLevel * 100} 
                    className="mt-2" 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on language patterns
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Call Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Call Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Company</span>
                      <span className="font-medium">{mockTranscript.companyName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ticker</span>
                      <span className="font-medium">{mockTranscript.ticker}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Call Date</span>
                      <span className="font-medium">{mockTranscript.callDate.toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fiscal Period</span>
                      <span className="font-medium">{mockTranscript.fiscalQuarter} {mockTranscript.fiscalYear}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Participants</span>
                      <span className="font-medium">{mockTranscript.participants.length} speakers</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Analyst Tone</span>
                      <span className="font-medium">{mockTranscript.toneAnalysis.analystTone.label}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Key Themes Tab */}
          <TabsContent value="themes" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <ThumbsUp className="h-5 w-5" />
                    Positive Themes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockTranscript.toneAnalysis.positiveThemes.map((theme, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span>{theme.theme}</span>
                    </div>
                  ))}
                  <div className="pt-2">
                    <p className="text-sm text-muted-foreground mb-2">Confidence Indicators:</p>
                    <div className="flex flex-wrap gap-2">
                      {mockTranscript.toneAnalysis.confidenceIndicators.map((indicator, idx) => (
                        <Badge key={idx} variant="secondary">{indicator}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    Negative Themes & Risks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockTranscript.toneAnalysis.negativeThemes.map((theme, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      <span>{theme.theme}</span>
                    </div>
                  ))}
                  <div className="pt-2">
                    <p className="text-sm text-muted-foreground mb-2">Caution Indicators:</p>
                    <div className="flex flex-wrap gap-2">
                      {mockTranscript.toneAnalysis.cautionIndicators.map((indicator, idx) => (
                        <Badge key={idx} variant="destructive">{indicator}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* QoQ Comparison Tab */}
          <TabsContent value="comparison" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quarter-over-Quarter Comparison</CardTitle>
                <CardDescription>
                  Track how management tone and guidance has changed over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['Q1 2025', 'Q4 2024', 'Q3 2024', 'Q2 2024'].map((quarter, idx) => (
                    <div key={quarter} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <span className="font-bold">{quarter}</span>
                        <p className="text-sm text-muted-foreground">
                          {idx === 0 ? 'Current' : `${idx} quarter${idx > 1 ? 's' : ''} ago`}
                        </p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Sentiment</p>
                          <p className={`font-bold ${idx === 0 ? 'text-green-600' : idx === 2 ? 'text-red-600' : 'text-yellow-600'}`}>
                            {idx === 0 ? '+0.65' : idx === 1 ? '+0.52' : idx === 2 ? '-0.12' : '+0.38'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Guidance</p>
                          <Badge variant={idx === 0 || idx === 3 ? 'default' : idx === 2 ? 'destructive' : 'secondary'}>
                            {idx === 0 || idx === 3 ? 'Raised' : idx === 2 ? 'Lowered' : 'Maintained'}
                          </Badge>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Confidence</p>
                          <p className="font-bold">{78 - idx * 5}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transcript Tab */}
          <TabsContent value="transcript" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Call Participants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {mockTranscript.participants.map((participant, idx) => (
                    <Badge key={idx} variant="outline" className="py-2 px-3">
                      <Users className="h-3 w-3 mr-2" />
                      {participant.name} - {participant.role}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Transcript Excerpt</CardTitle>
                <CardDescription>
                  Key sections from the earnings call
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-bold text-primary mb-2">Tim Cook (CEO):</p>
                    <p className="text-muted-foreground">
                      "We're incredibly pleased with our performance this quarter. iPhone revenue exceeded our expectations, 
                      driven by strong demand for iPhone 16 Pro models. Our Services business continues to grow at a healthy pace, 
                      and we're seeing tremendous momentum with our AI initiatives across the product lineup."
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-bold text-primary mb-2">Luca Maestri (CFO):</p>
                    <p className="text-muted-foreground">
                      "Revenue for the quarter was $124 billion, up 8% year-over-year. We generated operating cash flow of 
                      $30 billion and returned over $25 billion to shareholders. Looking ahead, we expect continued strength 
                      in our product categories and are raising our guidance for the fiscal year."
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
