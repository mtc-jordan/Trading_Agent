/**
 * AI Command Center Dashboard
 * 
 * Unified intelligent dashboard that combines all AI analysis capabilities
 * into a single cohesive interface with voice commands and real-time updates.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Brain, 
  Mic, 
  MicOff, 
  Send, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Shield, 
  Zap, 
  Target, 
  BarChart3, 
  PieChart, 
  Wallet, 
  Bot, 
  MessageSquare, 
  Settings, 
  RefreshCw,
  ChevronRight,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Radio,
  Cpu,
  Network,
  Eye,
  Volume2,
  Loader2
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

// Types for chat messages
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  data?: unknown;
}

export default function AICommandCenter() {
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [isListening, setIsListening] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Welcome to the AI Command Center. I can help you analyze markets, execute trades, and manage your portfolio. Try asking "What\'s the market status?" or "Show me opportunities".',
      timestamp: new Date()
    }
  ]);
  const [autoExecute, setAutoExecute] = useState(false);
  const [isStreaming, setIsStreaming] = useState(true);
  const [signalFilters, setSignalFilters] = useState<{
    assetClass?: string;
    direction?: 'bullish' | 'bearish' | 'neutral';
    minConfidence?: number;
  }>({});
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // tRPC queries
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = trpc.commandCenter.getSummary.useQuery(
    undefined,
    { refetchInterval: isStreaming ? 10000 : false }
  );

  const { data: agents, isLoading: agentsLoading, refetch: refetchAgents } = trpc.commandCenter.getAgentStatuses.useQuery(
    undefined,
    { refetchInterval: isStreaming ? 15000 : false }
  );

  const { data: signals, isLoading: signalsLoading, refetch: refetchSignals } = trpc.commandCenter.getSignals.useQuery(
    signalFilters,
    { refetchInterval: isStreaming ? 10000 : false }
  );

  const { data: portfolio, isLoading: portfolioLoading, refetch: refetchPortfolio } = trpc.commandCenter.getPortfolioMetrics.useQuery(
    undefined,
    { refetchInterval: isStreaming ? 30000 : false }
  );

  const { data: pendingActions, isLoading: actionsLoading, refetch: refetchActions } = trpc.commandCenter.getPendingActions.useQuery(
    undefined,
    { refetchInterval: isStreaming ? 5000 : false }
  );

  // tRPC mutations
  const voiceCommandMutation = trpc.commandCenter.processVoiceCommand.useMutation({
    onSuccess: (result) => {
      const response: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: result.response,
        timestamp: new Date(),
        data: result.data
      };
      setMessages(prev => [...prev, response]);
      
      if (result.executedAction) {
        toast.success(result.executedAction);
      }
    },
    onError: (error) => {
      toast.error('Failed to process command: ' + error.message);
    }
  });

  const executeSignalMutation = trpc.commandCenter.executeSignal.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
        refetchSignals();
      } else {
        toast.error(result.message);
      }
    }
  });

  const approveActionMutation = trpc.commandCenter.approveAction.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      refetchActions();
      setMessages(prev => [...prev, {
        id: `msg_${Date.now()}`,
        role: 'system',
        content: `✅ ${result.message}`,
        timestamp: new Date()
      }]);
    }
  });

  const rejectActionMutation = trpc.commandCenter.rejectAction.useMutation({
    onSuccess: (result) => {
      toast.info(result.message);
      refetchActions();
      setMessages(prev => [...prev, {
        id: `msg_${Date.now()}`,
        role: 'system',
        content: `❌ ${result.message}`,
        timestamp: new Date()
      }]);
    }
  });

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle chat submission
  const handleSendMessage = useCallback(() => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setChatInput('');

    // Send to backend for processing
    voiceCommandMutation.mutate({ command: chatInput });
  }, [chatInput, voiceCommandMutation]);

  // Toggle voice listening
  const toggleVoice = () => {
    setIsListening(!isListening);
    if (!isListening) {
      toast.info('Voice recognition activated. Speak your command.');
      // In production, integrate Web Speech API here
    }
  };

  // Refresh all data
  const refreshAll = () => {
    refetchSummary();
    refetchAgents();
    refetchSignals();
    refetchPortfolio();
    refetchActions();
    toast.success('Data refreshed');
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'processing': return 'bg-yellow-500 animate-pulse';
      case 'idle': return 'bg-gray-400';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  // Get direction icon
  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'bullish': return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case 'bearish': return <ArrowDownRight className="h-4 w-4 text-red-500" />;
      case 'neutral': return <Activity className="h-4 w-4 text-gray-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get risk badge
  const getRiskBadge = (level: string) => {
    const colors: Record<string, string> = {
      low: 'bg-green-100 text-green-800',
      moderate: 'bg-yellow-100 text-yellow-800',
      elevated: 'bg-orange-100 text-orange-800',
      high: 'bg-red-100 text-red-800'
    };
    return colors[level] || colors.moderate;
  };

  // Get strength color
  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'strong': return 'text-green-500';
      case 'moderate': return 'text-yellow-500';
      case 'weak': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Brain className="h-10 w-10 text-cyan-400" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  AI Command Center
                </h1>
                <p className="text-sm text-slate-400">Unified Intelligence Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Live indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full">
                <Radio className={`h-4 w-4 ${isStreaming ? 'text-green-500 animate-pulse' : 'text-gray-500'}`} />
                <span className="text-sm">{isStreaming ? 'Live' : 'Paused'}</span>
                <Switch checked={isStreaming} onCheckedChange={setIsStreaming} />
              </div>

              {/* Auto-execute toggle */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full">
                <Zap className={`h-4 w-4 ${autoExecute ? 'text-yellow-500' : 'text-gray-500'}`} />
                <span className="text-sm">Auto-Execute</span>
                <Switch checked={autoExecute} onCheckedChange={setAutoExecute} />
              </div>

              {/* Refresh */}
              <Button variant="ghost" size="icon" onClick={refreshAll} className="text-slate-400 hover:text-white">
                <RefreshCw className="h-5 w-5" />
              </Button>

              {/* Settings */}
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Panel - Chat & Voice */}
          <div className="col-span-4">
            <Card className="bg-slate-800/50 border-slate-700 h-[calc(100vh-180px)] flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-cyan-400" />
                    AI Assistant
                  </CardTitle>
                  <Button
                    variant={isListening ? 'default' : 'outline'}
                    size="sm"
                    onClick={toggleVoice}
                    className={isListening ? 'bg-red-500 hover:bg-red-600' : ''}
                  >
                    {isListening ? <MicOff className="h-4 w-4 mr-1" /> : <Mic className="h-4 w-4 mr-1" />}
                    {isListening ? 'Stop' : 'Voice'}
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col overflow-hidden">
                {/* Chat messages */}
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-4 py-2 ${
                            msg.role === 'user'
                              ? 'bg-cyan-600 text-white'
                              : msg.role === 'system'
                              ? 'bg-slate-700 text-slate-300'
                              : 'bg-slate-700/50 text-slate-200'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className="text-xs opacity-50 mt-1">
                            {msg.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>

                {/* Voice indicator */}
                {isListening && (
                  <div className="flex items-center justify-center gap-2 py-3 bg-slate-700/30 rounded-lg mb-3">
                    <Volume2 className="h-5 w-5 text-red-500 animate-pulse" />
                    <span className="text-sm text-slate-300">Listening...</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className="w-1 bg-cyan-500 rounded-full animate-pulse"
                          style={{
                            height: `${Math.random() * 20 + 10}px`,
                            animationDelay: `${i * 0.1}s`
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Processing indicator */}
                {voiceCommandMutation.isPending && (
                  <div className="flex items-center justify-center gap-2 py-3 bg-slate-700/30 rounded-lg mb-3">
                    <Loader2 className="h-5 w-5 text-cyan-500 animate-spin" />
                    <span className="text-sm text-slate-300">Processing...</span>
                  </div>
                )}

                {/* Input */}
                <div className="flex gap-2 mt-auto pt-4">
                  <Input
                    ref={inputRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask anything about markets, trades, or portfolio..."
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    disabled={voiceCommandMutation.isPending}
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    className="bg-cyan-600 hover:bg-cyan-700"
                    disabled={voiceCommandMutation.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="col-span-8">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-slate-800 border-slate-700 mb-4">
                <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-600">
                  <Eye className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="signals" className="data-[state=active]:bg-cyan-600">
                  <Target className="h-4 w-4 mr-2" />
                  Signals
                  {signals && signals.length > 0 && (
                    <Badge className="ml-2 bg-cyan-500">{signals.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="agents" className="data-[state=active]:bg-cyan-600">
                  <Bot className="h-4 w-4 mr-2" />
                  Agents
                  {agents && (
                    <Badge className="ml-2 bg-green-500">
                      {agents.filter(a => a.status === 'active').length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="portfolio" className="data-[state=active]:bg-cyan-600">
                  <Wallet className="h-4 w-4 mr-2" />
                  Portfolio
                </TabsTrigger>
                <TabsTrigger value="actions" className="data-[state=active]:bg-cyan-600">
                  <Zap className="h-4 w-4 mr-2" />
                  Actions
                  {pendingActions && pendingActions.length > 0 && (
                    <Badge className="ml-2 bg-orange-500">{pendingActions.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                {summaryLoading ? (
                  <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                      <Card key={i} className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                          <Skeleton className="h-4 w-24 mb-2" />
                          <Skeleton className="h-8 w-16" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : summary && (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-4 gap-4">
                      <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-slate-400">Market Regime</p>
                              <p className="text-2xl font-bold capitalize">
                                {summary.marketRegime.current.replace('_', ' ')}
                              </p>
                              <p className="text-xs text-slate-500">
                                {summary.marketRegime.confidence}% confidence
                              </p>
                            </div>
                            <Activity className={`h-8 w-8 ${
                              summary.marketRegime.current === 'risk_on' ? 'text-green-500' :
                              summary.marketRegime.current === 'risk_off' ? 'text-red-500' :
                              'text-yellow-500'
                            }`} />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-slate-400">Active Signals</p>
                              <p className="text-2xl font-bold">{summary.signalSummary.total}</p>
                              <p className="text-xs text-green-500">
                                {summary.signalSummary.highConviction} high conviction
                              </p>
                            </div>
                            <Target className="h-8 w-8 text-cyan-500" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-slate-400">Portfolio Value</p>
                              <p className="text-2xl font-bold">
                                ${summary.portfolioSummary.totalValue.toLocaleString()}
                              </p>
                              <p className={`text-xs ${summary.portfolioSummary.dayPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {summary.portfolioSummary.dayPnL >= 0 ? '+' : ''}
                                ${summary.portfolioSummary.dayPnL.toLocaleString()} today
                              </p>
                            </div>
                            <DollarSign className="h-8 w-8 text-green-500" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-slate-400">Active Agents</p>
                              <p className="text-2xl font-bold">
                                {summary.agentSummary.active}/{summary.agentSummary.total}
                              </p>
                              <p className="text-xs text-slate-500">
                                {summary.agentSummary.avgAccuracy.toFixed(1)}% avg accuracy
                              </p>
                            </div>
                            <Bot className="h-8 w-8 text-purple-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Signal Distribution */}
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                          <CardTitle className="text-lg">Signal Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <ArrowUpRight className="h-4 w-4 text-green-500" />
                                Bullish
                              </span>
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={(summary.signalSummary.bullish / summary.signalSummary.total) * 100} 
                                  className="w-32 h-2"
                                />
                                <span className="text-sm font-medium">{summary.signalSummary.bullish}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <ArrowDownRight className="h-4 w-4 text-red-500" />
                                Bearish
                              </span>
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={(summary.signalSummary.bearish / summary.signalSummary.total) * 100} 
                                  className="w-32 h-2"
                                />
                                <span className="text-sm font-medium">{summary.signalSummary.bearish}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-gray-500" />
                                Neutral
                              </span>
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={(summary.signalSummary.neutral / summary.signalSummary.total) * 100} 
                                  className="w-32 h-2"
                                />
                                <span className="text-sm font-medium">{summary.signalSummary.neutral}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                          <CardTitle className="text-lg">Risk Assessment</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-400">Overall Risk Level</span>
                            <Badge className={getRiskBadge(summary.portfolioSummary.riskLevel)}>
                              {summary.portfolioSummary.riskLevel.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-400">Pending Actions</span>
                              <span className="font-medium">{summary.pendingActions}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-400">Active Alerts</span>
                              <span className="font-medium">{summary.alertCount}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-400">Top Performer</span>
                              <span className="font-medium text-cyan-400">{summary.agentSummary.topPerformer}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Signals Tab */}
              <TabsContent value="signals" className="space-y-4">
                {/* Filters */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-slate-400">Direction:</Label>
                        <select
                          className="bg-slate-700 border-slate-600 rounded px-2 py-1 text-sm"
                          value={signalFilters.direction || ''}
                          onChange={(e) => setSignalFilters(prev => ({
                            ...prev,
                            direction: e.target.value as 'bullish' | 'bearish' | 'neutral' | undefined || undefined
                          }))}
                        >
                          <option value="">All</option>
                          <option value="bullish">Bullish</option>
                          <option value="bearish">Bearish</option>
                          <option value="neutral">Neutral</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-slate-400">Min Confidence:</Label>
                        <select
                          className="bg-slate-700 border-slate-600 rounded px-2 py-1 text-sm"
                          value={signalFilters.minConfidence || ''}
                          onChange={(e) => setSignalFilters(prev => ({
                            ...prev,
                            minConfidence: e.target.value ? parseInt(e.target.value) : undefined
                          }))}
                        >
                          <option value="">Any</option>
                          <option value="60">60%+</option>
                          <option value="70">70%+</option>
                          <option value="80">80%+</option>
                          <option value="90">90%+</option>
                        </select>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSignalFilters({})}
                        className="ml-auto"
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Signals List */}
                {signalsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Card key={i} className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                          <Skeleton className="h-16 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : signals && signals.length > 0 ? (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {signals.map((signal) => (
                        <Card key={signal.id} className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                {getDirectionIcon(signal.direction)}
                                <div>
                                  <p className="font-bold text-lg">{signal.asset}</p>
                                  <p className="text-sm text-slate-400">{signal.source}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className={`font-bold ${getStrengthColor(signal.strength)}`}>
                                    {signal.strength.toUpperCase()}
                                  </p>
                                  <p className="text-sm text-slate-400">{signal.confidence}% confidence</p>
                                </div>
                                {signal.actionable && signal.suggestedAction && (
                                  <Button
                                    size="sm"
                                    className="bg-cyan-600 hover:bg-cyan-700"
                                    onClick={() => executeSignalMutation.mutate({
                                      signalId: signal.id,
                                      size: signal.suggestedAction?.size,
                                      orderType: 'market'
                                    })}
                                    disabled={executeSignalMutation.isPending}
                                  >
                                    {executeSignalMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <Play className="h-4 w-4 mr-1" />
                                        Execute
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="mt-2">
                              <p className="text-sm text-slate-300">
                                {signal.reasoning.join(' • ')}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-8 text-center">
                      <Target className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400">No signals match your filters</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Agents Tab */}
              <TabsContent value="agents" className="space-y-4">
                {agentsLoading ? (
                  <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <Card key={i} className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                          <Skeleton className="h-20 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : agents && (
                  <div className="grid grid-cols-2 gap-4">
                    {agents.map((agent) => (
                      <Card key={agent.id} className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)}`} />
                              <div>
                                <p className="font-medium">{agent.name}</p>
                                <p className="text-sm text-slate-400 capitalize">{agent.type} Agent</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="capitalize">
                              {agent.status}
                            </Badge>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-slate-400">Accuracy</p>
                              <p className="font-medium">{agent.accuracy.toFixed(1)}%</p>
                            </div>
                            <div>
                              <p className="text-slate-400">Confidence</p>
                              <p className="font-medium">{agent.confidence.toFixed(1)}%</p>
                            </div>
                            <div>
                              <p className="text-slate-400">Signals</p>
                              <p className="font-medium">{agent.signalCount}</p>
                            </div>
                            <div>
                              <p className="text-slate-400">Last Signal</p>
                              <p className="font-medium">
                                {agent.lastSignal 
                                  ? new Date(agent.lastSignal).toLocaleTimeString()
                                  : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Portfolio Tab */}
              <TabsContent value="portfolio" className="space-y-4">
                {portfolioLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : portfolio && (
                  <>
                    {/* Portfolio Summary */}
                    <div className="grid grid-cols-4 gap-4">
                      <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                          <p className="text-sm text-slate-400">Total Value</p>
                          <p className="text-2xl font-bold">${portfolio.totalValue.toLocaleString()}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                          <p className="text-sm text-slate-400">Day P&L</p>
                          <p className={`text-2xl font-bold ${portfolio.dayPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {portfolio.dayPnL >= 0 ? '+' : ''}${portfolio.dayPnL.toLocaleString()}
                          </p>
                          <p className={`text-sm ${portfolio.dayPnLPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {portfolio.dayPnLPercent >= 0 ? '+' : ''}{portfolio.dayPnLPercent.toFixed(2)}%
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                          <p className="text-sm text-slate-400">Cash Available</p>
                          <p className="text-2xl font-bold">${portfolio.cashAvailable.toLocaleString()}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                          <p className="text-sm text-slate-400">Buying Power</p>
                          <p className="text-2xl font-bold">${portfolio.buyingPower.toLocaleString()}</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Positions */}
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardHeader>
                        <CardTitle>Positions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {portfolio.positions.map((position) => (
                            <div key={position.symbol} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                              <div className="flex items-center gap-4">
                                <div>
                                  <p className="font-bold">{position.symbol}</p>
                                  <p className="text-sm text-slate-400">{position.quantity} shares @ ${position.avgCost.toFixed(2)}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">${position.marketValue.toLocaleString()}</p>
                                <p className={`text-sm ${position.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {position.unrealizedPnL >= 0 ? '+' : ''}${position.unrealizedPnL.toFixed(2)} ({position.unrealizedPnLPercent.toFixed(2)}%)
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Risk Metrics */}
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardHeader>
                        <CardTitle>Risk Metrics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-5 gap-4">
                          <div>
                            <p className="text-sm text-slate-400">Sharpe Ratio</p>
                            <p className="text-xl font-bold">{portfolio.riskMetrics.sharpeRatio.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-400">Max Drawdown</p>
                            <p className="text-xl font-bold text-red-500">{portfolio.riskMetrics.maxDrawdown.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-400">Volatility</p>
                            <p className="text-xl font-bold">{portfolio.riskMetrics.volatility.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-400">Beta</p>
                            <p className="text-xl font-bold">{portfolio.riskMetrics.beta.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-400">VaR (95%)</p>
                            <p className="text-xl font-bold">${portfolio.riskMetrics.var95.toLocaleString()}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>

              {/* Actions Tab */}
              <TabsContent value="actions" className="space-y-4">
                {actionsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <Card key={i} className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                          <Skeleton className="h-24 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : pendingActions && pendingActions.length > 0 ? (
                  <div className="space-y-2">
                    {pendingActions.map((action) => (
                      <Card key={action.id} className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge className={
                                  action.priority === 'high' ? 'bg-red-500' :
                                  action.priority === 'medium' ? 'bg-yellow-500' :
                                  'bg-gray-500'
                                }>
                                  {action.priority.toUpperCase()}
                                </Badge>
                                <span className="font-bold">{action.action} {action.asset}</span>
                              </div>
                              <p className="text-sm text-slate-400 mt-1">{action.description}</p>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <span className="text-slate-400">Source: {action.source}</span>
                                <span className="text-slate-400">Confidence: {action.confidence}%</span>
                              </div>
                            </div>
                            {action.requiresApproval && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => approveActionMutation.mutate({ actionId: action.id })}
                                  disabled={approveActionMutation.isPending}
                                >
                                  {approveActionMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <CheckCircle2 className="h-4 w-4 mr-1" />
                                      Approve
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-500 text-red-500 hover:bg-red-500/10"
                                  onClick={() => rejectActionMutation.mutate({ actionId: action.id })}
                                  disabled={rejectActionMutation.isPending}
                                >
                                  {rejectActionMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Reject
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="mt-3 p-2 bg-slate-700/30 rounded text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Expected Return</span>
                              <span className="text-green-500">+{action.estimatedImpact.expectedReturn.toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Risk Level</span>
                              <span className="capitalize">{action.estimatedImpact.riskLevel}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Time Horizon</span>
                              <span>{action.estimatedImpact.timeHorizon}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-8 text-center">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <p className="text-slate-400">No pending actions</p>
                      <p className="text-sm text-slate-500 mt-1">All caught up! Check back later for new recommendations.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
