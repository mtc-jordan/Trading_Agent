/**
 * SEC Filings Dashboard - Live SEC EDGAR Integration
 * 
 * Provides access to real SEC filings (10-K, 10-Q, 8-K) with RAG-based analysis
 */

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import {
  FileText,
  Search,
  Building2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  MessageSquare,
  Loader2,
  ExternalLink,
  Calendar,
  DollarSign,
  BarChart3,
  FileQuestion,
  Brain,
  Target,
  Shield,
  Lightbulb,
} from 'lucide-react';

export default function SECFilingsDashboard() {
  const [ticker, setTicker] = useState('');
  const [searchedTicker, setSearchedTicker] = useState('');
  const [question, setQuestion] = useState('');
  const [activeTab, setActiveTab] = useState('filings');

  // Queries
  const filingsQuery = trpc.secFilings.list.useQuery(
    { ticker: searchedTicker, limit: 20 },
    { enabled: !!searchedTicker }
  );

  const summaryQuery = trpc.secFilings.getSummary.useQuery(
    { ticker: searchedTicker, filingType: '10-K' },
    { enabled: !!searchedTicker }
  );

  const metricsQuery = trpc.secFilings.getMetrics.useQuery(
    { ticker: searchedTicker },
    { enabled: !!searchedTicker }
  );

  const companyInfoQuery = trpc.secFilings.getCompanyInfo.useQuery(
    { ticker: searchedTicker },
    { enabled: !!searchedTicker }
  );

  // Mutations
  const analyzeMutation = trpc.secFilings.analyze.useMutation({
    onSuccess: () => {
      toast.success('Analysis completed');
    },
    onError: (error) => {
      toast.error(`Analysis failed: ${error.message}`);
    },
  });

  const askQuestionMutation = trpc.secFilings.askQuestion.useMutation({
    onSuccess: () => {
      toast.success('Question answered');
    },
    onError: (error) => {
      toast.error(`Failed to answer: ${error.message}`);
    },
  });

  const deepDiveMutation = trpc.secFilings.deepDive.useMutation({
    onSuccess: () => {
      toast.success('Deep dive completed');
    },
    onError: (error) => {
      toast.error(`Deep dive failed: ${error.message}`);
    },
  });

  const handleSearch = () => {
    if (!ticker.trim()) {
      toast.error('Please enter a ticker symbol');
      return;
    }
    setSearchedTicker(ticker.toUpperCase());
  };

  const handleAnalyze = () => {
    if (!searchedTicker) return;
    analyzeMutation.mutate({ ticker: searchedTicker });
  };

  const handleAskQuestion = () => {
    if (!searchedTicker || !question.trim()) {
      toast.error('Please enter a question');
      return;
    }
    askQuestionMutation.mutate({ ticker: searchedTicker, question });
  };

  const handleDeepDive = (areas: ('risk_factors' | 'mda' | 'business' | 'financials' | 'compensation')[]) => {
    if (!searchedTicker) return;
    deepDiveMutation.mutate({
      ticker: searchedTicker,
      focusAreas: areas,
      compareYoY: true,
    });
  };

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'bullish': return 'text-green-500';
      case 'bearish': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'bullish': return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'bearish': return <TrendingDown className="h-5 w-5 text-red-500" />;
      default: return <Target className="h-5 w-5 text-yellow-500" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">SEC Filings Analysis</h1>
            <p className="text-muted-foreground">
              Live SEC EDGAR integration with RAG-based fundamental analysis
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Enter ticker (e.g., AAPL)"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-40"
            />
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </div>

        {/* Company Info Card */}
        {companyInfoQuery.data && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-2xl">{companyInfoQuery.data.name}</CardTitle>
                    <CardDescription>
                      {searchedTicker} • CIK: {companyInfoQuery.data.cik}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">{companyInfoQuery.data.sicDescription}</Badge>
                  <Badge>{companyInfoQuery.data.stateOfIncorporation}</Badge>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Main Content */}
        {searchedTicker && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="filings">
                <FileText className="h-4 w-4 mr-2" />
                Filings
              </TabsTrigger>
              <TabsTrigger value="summary">
                <BarChart3 className="h-4 w-4 mr-2" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="metrics">
                <DollarSign className="h-4 w-4 mr-2" />
                Metrics
              </TabsTrigger>
              <TabsTrigger value="analysis">
                <Brain className="h-4 w-4 mr-2" />
                AI Analysis
              </TabsTrigger>
              <TabsTrigger value="qa">
                <MessageSquare className="h-4 w-4 mr-2" />
                Q&A
              </TabsTrigger>
            </TabsList>

            {/* Filings Tab */}
            <TabsContent value="filings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent SEC Filings</CardTitle>
                  <CardDescription>
                    10-K, 10-Q, and 8-K filings from SEC EDGAR
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filingsQuery.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : filingsQuery.data && filingsQuery.data.length > 0 ? (
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-3">
                        {filingsQuery.data.map((filing, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <FileText className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <div className="font-medium">{filing.form}</div>
                                <div className="text-sm text-muted-foreground">
                                  {filing.primaryDocDescription || 'SEC Filing'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="flex items-center gap-1 text-sm">
                                  <Calendar className="h-3 w-3" />
                                  {filing.filingDate}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Accession: {filing.accessionNumber}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(filing.primaryDocument, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No filings found for {searchedTicker}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Summary Tab */}
            <TabsContent value="summary" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Filing Summary</CardTitle>
                  <CardDescription>
                    AI-generated summary of the latest 10-K filing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {summaryQuery.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : summaryQuery.data ? (
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-semibold mb-2">Executive Summary</h3>
                        <p className="text-muted-foreground">
                          {summaryQuery.data.executiveSummary}
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-yellow-500" />
                          Key Highlights
                        </h3>
                        <ul className="space-y-2">
                          {summaryQuery.data.keyHighlights.map((highlight, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-primary">•</span>
                              <span className="text-sm">{highlight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          Risk Factors
                        </h3>
                        <ul className="space-y-2">
                          {summaryQuery.data.riskFactors.map((risk, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-red-500">•</span>
                              <span className="text-sm">{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Management Outlook</h3>
                        <p className="text-muted-foreground">
                          {summaryQuery.data.managementOutlook}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No summary available. Click "Analyze" to generate one.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Metrics Tab */}
            <TabsContent value="metrics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>XBRL Financial Metrics</CardTitle>
                  <CardDescription>
                    Key financial data extracted from SEC XBRL filings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {metricsQuery.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : metricsQuery.data ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {Object.entries(metricsQuery.data).map(([key, data]: [string, any]) => (
                        <div key={key} className="p-4 rounded-lg border">
                          <div className="text-sm text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                          <div className="text-2xl font-bold">
                            {typeof data.value === 'number'
                              ? data.value >= 1000000000
                                ? `$${(data.value / 1000000000).toFixed(2)}B`
                                : data.value >= 1000000
                                ? `$${(data.value / 1000000).toFixed(2)}M`
                                : data.value.toLocaleString()
                              : data.value || 'N/A'}
                          </div>
                          {data.period && (
                            <div className="text-xs text-muted-foreground">
                              {data.period}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No XBRL metrics available for {searchedTicker}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Analysis Tab */}
            <TabsContent value="analysis" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Run Analysis Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      Enhanced Fundamental Analysis
                    </CardTitle>
                    <CardDescription>
                      AI-powered analysis of SEC filings with RAG
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      onClick={handleAnalyze}
                      disabled={analyzeMutation.isPending}
                      className="w-full"
                    >
                      {analyzeMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4 mr-2" />
                          Run Full Analysis
                        </>
                      )}
                    </Button>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeepDive(['risk_factors'])}
                        disabled={deepDiveMutation.isPending}
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        Risk Factors
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeepDive(['mda'])}
                        disabled={deepDiveMutation.isPending}
                      >
                        <BarChart3 className="h-4 w-4 mr-1" />
                        MD&A
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeepDive(['business'])}
                        disabled={deepDiveMutation.isPending}
                      >
                        <Building2 className="h-4 w-4 mr-1" />
                        Business
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeepDive(['financials'])}
                        disabled={deepDiveMutation.isPending}
                      >
                        <DollarSign className="h-4 w-4 mr-1" />
                        Financials
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Analysis Results */}
                <Card>
                  <CardHeader>
                    <CardTitle>Analysis Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analyzeMutation.isPending || deepDiveMutation.isPending ? (
                      <div className="flex flex-col items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                        <p className="text-muted-foreground">Analyzing SEC filings...</p>
                        <p className="text-xs text-muted-foreground">This may take a minute</p>
                      </div>
                    ) : analyzeMutation.data ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            {getSignalIcon(analyzeMutation.data.signal)}
                            <div>
                              <div className={`font-bold text-lg capitalize ${getSignalColor(analyzeMutation.data.signal)}`}>
                                {analyzeMutation.data.signal}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Confidence: {analyzeMutation.data.confidence}%
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline">
                            {analyzeMutation.data.secAnalysis.latestFilingType}
                          </Badge>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">Rationale</h4>
                          <p className="text-sm text-muted-foreground">
                            {analyzeMutation.data.rationale}
                          </p>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2 text-green-600">Key Findings</h4>
                          <ul className="space-y-1">
                            {analyzeMutation.data.keyFindings.map((finding, i) => (
                              <li key={i} className="text-sm flex items-start gap-2">
                                <span className="text-green-500">✓</span>
                                {finding}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2 text-red-600">Risks</h4>
                          <ul className="space-y-1">
                            {analyzeMutation.data.risks.map((risk, i) => (
                              <li key={i} className="text-sm flex items-start gap-2">
                                <span className="text-red-500">⚠</span>
                                {risk}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : deepDiveMutation.data ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            {getSignalIcon(deepDiveMutation.data.overallAssessment.signal)}
                            <div>
                              <div className={`font-bold text-lg capitalize ${getSignalColor(deepDiveMutation.data.overallAssessment.signal)}`}>
                                {deepDiveMutation.data.overallAssessment.signal}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Confidence: {deepDiveMutation.data.overallAssessment.confidence}%
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">Investment Thesis</h4>
                          <p className="text-sm text-muted-foreground">
                            {deepDiveMutation.data.overallAssessment.investmentThesis}
                          </p>
                        </div>

                        {deepDiveMutation.data.sectionAnalysis.map((section, i) => (
                          <div key={i}>
                            <h4 className="font-semibold mb-2">{section.section}</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              {section.analysis}
                            </p>
                            {section.concerns.length > 0 && (
                              <ul className="space-y-1">
                                {section.concerns.map((concern, j) => (
                                  <li key={j} className="text-sm text-red-500 flex items-start gap-2">
                                    <AlertTriangle className="h-3 w-3 mt-0.5" />
                                    {concern}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Click "Run Full Analysis" to analyze SEC filings</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Q&A Tab */}
            <TabsContent value="qa" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileQuestion className="h-5 w-5 text-primary" />
                    Ask Questions About Filings
                  </CardTitle>
                  <CardDescription>
                    Use RAG to ask specific questions about {searchedTicker}'s SEC filings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Ask a question about the company's SEC filings... (e.g., 'What are the main risk factors?', 'How has revenue changed?', 'What is the debt structure?')"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                  <Button
                    onClick={handleAskQuestion}
                    disabled={askQuestionMutation.isPending || !question.trim()}
                    className="w-full"
                  >
                    {askQuestionMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Searching filings...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Ask Question
                      </>
                    )}
                  </Button>

                  {/* Quick Questions */}
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground">Quick questions:</span>
                    {[
                      'What are the main risk factors?',
                      'How has revenue changed YoY?',
                      'What is the debt structure?',
                      'What are the growth drivers?',
                    ].map((q) => (
                      <Button
                        key={q}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setQuestion(q);
                          askQuestionMutation.mutate({ ticker: searchedTicker, question: q });
                        }}
                        disabled={askQuestionMutation.isPending}
                      >
                        {q}
                      </Button>
                    ))}
                  </div>

                  {/* Answer Display */}
                  {askQuestionMutation.data && (
                    <Card className="mt-4">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Answer</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            Confidence: {(askQuestionMutation.data.confidence * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground mb-4">
                          {askQuestionMutation.data.answer}
                        </p>
                        {askQuestionMutation.data.sources.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Sources:</h4>
                            <ul className="space-y-1">
                              {askQuestionMutation.data.sources.map((source: any, i: number) => (
                                <li key={i} className="text-xs text-muted-foreground">
                                  • {typeof source === 'string' ? source : source.section || JSON.stringify(source)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Empty State */}
        {!searchedTicker && (
          <Card className="py-12">
            <CardContent className="text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Search for a Company</h3>
              <p className="text-muted-foreground mb-4">
                Enter a ticker symbol to view SEC filings and run AI-powered analysis
              </p>
              <div className="flex justify-center gap-2">
                {['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'].map((t) => (
                  <Button
                    key={t}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTicker(t);
                      setSearchedTicker(t);
                    }}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
