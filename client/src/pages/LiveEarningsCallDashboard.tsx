import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, Pause, Radio, Calendar, Bell, TrendingUp, TrendingDown, 
  AlertTriangle, CheckCircle, Clock, Users, Mic, Volume2,
  ChevronRight, RefreshCw, Search, Star, StarOff
} from 'lucide-react';
import { toast } from 'sonner';

// Types
interface LiveTranscriptSegment {
  speaker: string;
  role: string;
  text: string;
  timestamp: number;
  sentiment?: number;
}

interface ToneAnalysis {
  overallSentiment: number;
  confidence: number;
  managementTone: {
    optimism: number;
    defensiveness: number;
    confidence: number;
    uncertainty: number;
  };
  keywordAlerts: { keyword: string; category: string; sentiment: number }[];
  momentum: 'improving' | 'declining' | 'stable';
}

interface EarningsEvent {
  id: string;
  symbol: string;
  companyName: string;
  date: string;
  time: string;
  status: 'upcoming' | 'live' | 'completed';
  estimatedEPS: number | null;
  actualEPS: number | null;
}

export default function LiveEarningsCallDashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [transcript, setTranscript] = useState<LiveTranscriptSegment[]>([]);
  const [toneAnalysis, setToneAnalysis] = useState<ToneAnalysis | null>(null);
  const [todaysEarnings, setTodaysEarnings] = useState<EarningsEvent[]>([]);
  const [weekEarnings, setWeekEarnings] = useState<EarningsEvent[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>(['AAPL', 'MSFT', 'GOOGL', 'NVDA']);
  const [sentimentHistory, setSentimentHistory] = useState<{ time: number; value: number }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Simulated data for demo
  useEffect(() => {
    // Simulate today's earnings
    setTodaysEarnings([
      { id: '1', symbol: 'AAPL', companyName: 'Apple Inc.', date: new Date().toISOString(), time: 'AMC', status: 'live', estimatedEPS: 2.35, actualEPS: null },
      { id: '2', symbol: 'MSFT', companyName: 'Microsoft Corp.', date: new Date().toISOString(), time: 'AMC', status: 'upcoming', estimatedEPS: 2.89, actualEPS: null },
      { id: '3', symbol: 'TSLA', companyName: 'Tesla Inc.', date: new Date().toISOString(), time: 'AMC', status: 'completed', estimatedEPS: 0.73, actualEPS: 0.85 },
    ]);

    // Simulate week earnings
    const weekDates = Array.from({ length: 5 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d.toISOString();
    });
    
    setWeekEarnings([
      { id: '4', symbol: 'META', companyName: 'Meta Platforms', date: weekDates[1], time: 'AMC', status: 'upcoming', estimatedEPS: 4.25, actualEPS: null },
      { id: '5', symbol: 'AMZN', companyName: 'Amazon.com', date: weekDates[2], time: 'AMC', status: 'upcoming', estimatedEPS: 1.15, actualEPS: null },
      { id: '6', symbol: 'GOOGL', companyName: 'Alphabet Inc.', date: weekDates[3], time: 'AMC', status: 'upcoming', estimatedEPS: 1.85, actualEPS: null },
    ]);
  }, []);

  // Simulate live transcript when watching a call
  useEffect(() => {
    if (!isLive || !selectedSymbol) return;

    const sampleSegments: LiveTranscriptSegment[] = [
      { speaker: 'Tim Cook', role: 'CEO', text: 'Good afternoon, everyone. Thank you for joining us today.', timestamp: Date.now(), sentiment: 0.3 },
      { speaker: 'Tim Cook', role: 'CEO', text: 'We are pleased to report another strong quarter with record revenue in our Services segment.', timestamp: Date.now() + 5000, sentiment: 0.7 },
      { speaker: 'Luca Maestri', role: 'CFO', text: 'Total revenue for the quarter was $94.8 billion, up 8% year over year.', timestamp: Date.now() + 10000, sentiment: 0.6 },
      { speaker: 'Analyst', role: 'analyst', text: 'Can you provide more color on the China market performance?', timestamp: Date.now() + 15000, sentiment: 0 },
      { speaker: 'Tim Cook', role: 'CEO', text: 'We continue to see strong demand in China, though we are monitoring the macro environment closely.', timestamp: Date.now() + 20000, sentiment: 0.2 },
    ];

    let index = 0;
    const interval = setInterval(() => {
      if (index < sampleSegments.length) {
        setTranscript(prev => [...prev, sampleSegments[index]]);
        
        // Update sentiment history
        setSentimentHistory(prev => [
          ...prev,
          { time: Date.now(), value: sampleSegments[index].sentiment || 0 }
        ]);
        
        index++;
      }
    }, 3000);

    // Simulate tone analysis updates
    const toneInterval = setInterval(() => {
      setToneAnalysis({
        overallSentiment: 0.4 + Math.random() * 0.3,
        confidence: 0.7 + Math.random() * 0.2,
        managementTone: {
          optimism: 0.6 + Math.random() * 0.2,
          defensiveness: 0.2 + Math.random() * 0.1,
          confidence: 0.7 + Math.random() * 0.2,
          uncertainty: 0.2 + Math.random() * 0.1
        },
        keywordAlerts: [
          { keyword: 'record revenue', category: 'growth', sentiment: 0.8 },
          { keyword: 'strong demand', category: 'growth', sentiment: 0.6 },
          { keyword: 'monitoring', category: 'concern', sentiment: -0.2 }
        ],
        momentum: 'improving'
      });
    }, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(toneInterval);
    };
  }, [isLive, selectedSymbol]);

  // Auto-scroll transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const startWatching = (symbol: string) => {
    setSelectedSymbol(symbol);
    setIsLive(true);
    setTranscript([]);
    setSentimentHistory([]);
    toast.success(`Now watching ${symbol} earnings call`);
  };

  const stopWatching = () => {
    setIsLive(false);
    toast.info('Stopped watching earnings call');
  };

  const toggleWatchlist = (symbol: string) => {
    if (watchlist.includes(symbol)) {
      setWatchlist(prev => prev.filter(s => s !== symbol));
      toast.info(`Removed ${symbol} from watchlist`);
    } else {
      setWatchlist(prev => [...prev, symbol]);
      toast.success(`Added ${symbol} to watchlist`);
    }
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.3) return 'text-green-500';
    if (sentiment < -0.3) return 'text-red-500';
    return 'text-yellow-500';
  };

  const getSentimentBg = (sentiment: number) => {
    if (sentiment > 0.3) return 'bg-green-500/10 border-green-500/20';
    if (sentiment < -0.3) return 'bg-red-500/10 border-red-500/20';
    return 'bg-yellow-500/10 border-yellow-500/20';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Live Earnings Calls</h1>
            <p className="text-muted-foreground">
              Real-time transcript analysis with AI-powered tone detection
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button variant="outline" onClick={() => toast.info('Refreshing calendar...')}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Live Call Section */}
        {isLive && selectedSymbol && (
          <Card className="border-2 border-green-500/50 bg-green-500/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Radio className="h-6 w-6 text-green-500" />
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{selectedSymbol} Earnings Call - LIVE</CardTitle>
                    <CardDescription>Real-time transcript with AI tone analysis</CardDescription>
                  </div>
                </div>
                <Button variant="destructive" onClick={stopWatching}>
                  <Pause className="h-4 w-4 mr-2" />
                  Stop Watching
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Transcript */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Mic className="h-4 w-4" />
                        Live Transcript
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px]" ref={scrollRef}>
                        <div className="space-y-4 pr-4">
                          {transcript.map((segment, idx) => (
                            <div 
                              key={idx} 
                              className={`p-3 rounded-lg border ${getSentimentBg(segment.sentiment || 0)}`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-sm">
                                  {segment.speaker}
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {segment.role}
                                  </Badge>
                                </span>
                                {segment.sentiment !== undefined && (
                                  <span className={`text-xs font-medium ${getSentimentColor(segment.sentiment)}`}>
                                    {segment.sentiment > 0 ? '+' : ''}{(segment.sentiment * 100).toFixed(0)}%
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{segment.text}</p>
                            </div>
                          ))}
                          {transcript.length === 0 && (
                            <div className="text-center text-muted-foreground py-8">
                              <Volume2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>Waiting for transcript...</p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>

                {/* Tone Analysis Panel */}
                <div className="space-y-4">
                  {/* Overall Sentiment */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Overall Sentiment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {toneAnalysis ? (
                        <div className="space-y-4">
                          <div className="text-center">
                            <div className={`text-4xl font-bold ${getSentimentColor(toneAnalysis.overallSentiment)}`}>
                              {toneAnalysis.overallSentiment > 0 ? '+' : ''}
                              {(toneAnalysis.overallSentiment * 100).toFixed(0)}%
                            </div>
                            <div className="flex items-center justify-center gap-2 mt-1">
                              {toneAnalysis.momentum === 'improving' && (
                                <Badge className="bg-green-500">
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  Improving
                                </Badge>
                              )}
                              {toneAnalysis.momentum === 'declining' && (
                                <Badge className="bg-red-500">
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                  Declining
                                </Badge>
                              )}
                              {toneAnalysis.momentum === 'stable' && (
                                <Badge variant="secondary">Stable</Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground text-center">
                            Confidence: {(toneAnalysis.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground py-4">
                          Analyzing...
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Management Tone */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Management Tone</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {toneAnalysis ? (
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span>Optimism</span>
                              <span>{(toneAnalysis.managementTone.optimism * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={toneAnalysis.managementTone.optimism * 100} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span>Confidence</span>
                              <span>{(toneAnalysis.managementTone.confidence * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={toneAnalysis.managementTone.confidence * 100} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span>Defensiveness</span>
                              <span>{(toneAnalysis.managementTone.defensiveness * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={toneAnalysis.managementTone.defensiveness * 100} className="h-2 [&>div]:bg-orange-500" />
                          </div>
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span>Uncertainty</span>
                              <span>{(toneAnalysis.managementTone.uncertainty * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={toneAnalysis.managementTone.uncertainty * 100} className="h-2 [&>div]:bg-red-500" />
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground py-4">
                          Analyzing...
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Keyword Alerts */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Keyword Alerts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {toneAnalysis?.keywordAlerts && toneAnalysis.keywordAlerts.length > 0 ? (
                        <div className="space-y-2">
                          {toneAnalysis.keywordAlerts.map((alert, idx) => (
                            <div 
                              key={idx}
                              className={`p-2 rounded text-xs ${
                                alert.sentiment > 0 
                                  ? 'bg-green-500/10 text-green-500' 
                                  : alert.sentiment < 0 
                                    ? 'bg-red-500/10 text-red-500'
                                    : 'bg-yellow-500/10 text-yellow-500'
                              }`}
                            >
                              <span className="font-medium">"{alert.keyword}"</span>
                              <Badge variant="outline" className="ml-2 text-[10px]">
                                {alert.category}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground py-4 text-sm">
                          No alerts yet
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calendar Tabs */}
        <Tabs defaultValue="today" className="space-y-4">
          <TabsList>
            <TabsTrigger value="today" className="flex items-center gap-2">
              <Radio className="h-4 w-4" />
              Today's Calls
            </TabsTrigger>
            <TabsTrigger value="week" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              This Week
            </TabsTrigger>
            <TabsTrigger value="watchlist" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              My Watchlist
            </TabsTrigger>
          </TabsList>

          {/* Today's Earnings */}
          <TabsContent value="today">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todaysEarnings.map((event) => (
                <Card key={event.id} className={event.status === 'live' ? 'border-green-500/50' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{event.symbol}</CardTitle>
                        {event.status === 'live' && (
                          <Badge className="bg-green-500 animate-pulse">LIVE</Badge>
                        )}
                        {event.status === 'completed' && (
                          <Badge variant="secondary">Completed</Badge>
                        )}
                        {event.status === 'upcoming' && (
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            {event.time}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleWatchlist(event.symbol)}
                      >
                        {watchlist.includes(event.symbol) ? (
                          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                        ) : (
                          <StarOff className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <CardDescription>{event.companyName}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Est. EPS</span>
                        <span className="font-medium">${event.estimatedEPS?.toFixed(2) || 'N/A'}</span>
                      </div>
                      {event.actualEPS !== null && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Actual EPS</span>
                          <span className={`font-medium ${
                            event.actualEPS > (event.estimatedEPS || 0) 
                              ? 'text-green-500' 
                              : 'text-red-500'
                          }`}>
                            ${event.actualEPS.toFixed(2)}
                            {event.actualEPS > (event.estimatedEPS || 0) ? (
                              <CheckCircle className="h-3 w-3 inline ml-1" />
                            ) : (
                              <AlertTriangle className="h-3 w-3 inline ml-1" />
                            )}
                          </span>
                        </div>
                      )}
                      {event.status === 'live' && (
                        <Button 
                          className="w-full" 
                          onClick={() => startWatching(event.symbol)}
                          disabled={isLive && selectedSymbol === event.symbol}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Watch Live
                        </Button>
                      )}
                      {event.status === 'upcoming' && (
                        <Button variant="outline" className="w-full">
                          <Bell className="h-4 w-4 mr-2" />
                          Set Alert
                        </Button>
                      )}
                      {event.status === 'completed' && (
                        <Button variant="secondary" className="w-full">
                          <ChevronRight className="h-4 w-4 mr-2" />
                          View Transcript
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {todaysEarnings.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No earnings calls scheduled for today</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* This Week */}
          <TabsContent value="week">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Earnings This Week</CardTitle>
                <CardDescription>
                  Plan ahead for important earnings announcements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {weekEarnings.map((event) => (
                    <div 
                      key={event.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[60px]">
                          <div className="text-xs text-muted-foreground">
                            {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                          <div className="text-lg font-bold">
                            {new Date(event.date).getDate()}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{event.symbol}</span>
                            <Badge variant="outline">{event.time}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">{event.companyName}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Est. EPS</div>
                          <div className="font-medium">${event.estimatedEPS?.toFixed(2) || 'N/A'}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleWatchlist(event.symbol)}
                        >
                          {watchlist.includes(event.symbol) ? (
                            <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                          ) : (
                            <StarOff className="h-4 w-4" />
                          )}
                        </Button>
                        <Button variant="outline" size="sm">
                          <Bell className="h-4 w-4 mr-2" />
                          Alert
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Watchlist */}
          <TabsContent value="watchlist">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  My Earnings Watchlist
                </CardTitle>
                <CardDescription>
                  Get alerts for earnings calls from your favorite companies
                </CardDescription>
              </CardHeader>
              <CardContent>
                {watchlist.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {watchlist.map((symbol) => (
                      <Card key={symbol} className="text-center">
                        <CardContent className="pt-4">
                          <div className="font-bold text-lg">{symbol}</div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2"
                            onClick={() => toggleWatchlist(symbol)}
                          >
                            <StarOff className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No symbols in your watchlist</p>
                    <p className="text-sm">Add symbols to get earnings alerts</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Calendar className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{todaysEarnings.length}</div>
                  <div className="text-xs text-muted-foreground">Today's Calls</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Radio className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {todaysEarnings.filter(e => e.status === 'live').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Live Now</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Star className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{watchlist.length}</div>
                  <div className="text-xs text-muted-foreground">Watchlist</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Users className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{weekEarnings.length}</div>
                  <div className="text-xs text-muted-foreground">This Week</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
