import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/lib/trpc';
import { 
  MessageSquare, 
  Bot, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Play,
  Users,
  Vote,
  CheckCircle,
  Clock,
  Zap,
  Brain,
  Shield,
  BarChart3,
  Activity,
  Target
} from 'lucide-react';

// Agent icons mapping
const agentIcons: Record<string, React.ReactNode> = {
  technical: <BarChart3 className="h-4 w-4" />,
  fundamental: <Target className="h-4 w-4" />,
  sentiment: <Brain className="h-4 w-4" />,
  risk: <Shield className="h-4 w-4" />,
  regime: <Activity className="h-4 w-4" />,
  execution: <Zap className="h-4 w-4" />,
  coordinator: <Users className="h-4 w-4" />
};

// Agent colors
const agentColors: Record<string, string> = {
  technical: 'bg-blue-500',
  fundamental: 'bg-green-500',
  sentiment: 'bg-purple-500',
  risk: 'bg-red-500',
  regime: 'bg-yellow-500',
  execution: 'bg-cyan-500',
  coordinator: 'bg-emerald-500'
};

interface AgentMessage {
  id: string;
  agentType: string;
  agentName: string;
  messageType: string;
  content: string;
  confidence: number;
  timestamp: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  replyTo?: string;
}

interface DiscussionThread {
  id: string;
  symbol: string;
  assetType: string;
  topic: string;
  startedAt: number;
  status: string;
  messages: AgentMessage[];
  consensus?: {
    decision: string;
    confidence: number;
    votesFor: number;
    votesAgainst: number;
    abstentions: number;
    reasoning: string;
  };
}

export default function AgentCommunicationHub() {
  const [symbol, setSymbol] = useState('AAPL');
  const [assetType, setAssetType] = useState<'stock' | 'crypto' | 'forex' | 'commodity'>('stock');
  const [topic, setTopic] = useState('Should we buy, sell, or hold?');
  const [activeThread, setActiveThread] = useState<DiscussionThread | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const startDiscussion = trpc.broker.startAgentDiscussion.useMutation();
  const runDebate = trpc.broker.runAgentDebate.useMutation();
  const conductVoting = trpc.broker.conductAgentVoting.useMutation();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages]);

  const handleStartDiscussion = async () => {
    setIsRunning(true);
    try {
      const result = await startDiscussion.mutateAsync({
        symbol,
        assetType,
        topic
      });
      setActiveThread(result as DiscussionThread);
    } catch (error) {
      console.error('Failed to start discussion:', error);
    }
    setIsRunning(false);
  };

  const handleRunDebate = async () => {
    if (!activeThread) return;
    setIsRunning(true);
    try {
      const result = await runDebate.mutateAsync({
        threadId: activeThread.id,
        rounds: 2
      });
      setActiveThread(prev => prev ? {
        ...prev,
        messages: [...prev.messages, ...(result.messages as AgentMessage[])]
      } : null);
    } catch (error) {
      console.error('Failed to run debate:', error);
    }
    setIsRunning(false);
  };

  const handleConductVoting = async () => {
    if (!activeThread) return;
    setIsRunning(true);
    try {
      const result = await conductVoting.mutateAsync({
        threadId: activeThread.id
      });
      setActiveThread(prev => prev ? {
        ...prev,
        status: 'concluded',
        consensus: result.consensus as DiscussionThread['consensus'],
        messages: result.thread?.messages as AgentMessage[] || prev.messages
      } : null);
    } catch (error) {
      console.error('Failed to conduct voting:', error);
    }
    setIsRunning(false);
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'bearish':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'analysis':
        return <Brain className="h-3 w-3" />;
      case 'argument':
        return <TrendingUp className="h-3 w-3" />;
      case 'counter_argument':
        return <TrendingDown className="h-3 w-3" />;
      case 'vote':
        return <Vote className="h-3 w-3" />;
      case 'consensus':
        return <CheckCircle className="h-3 w-3" />;
      default:
        return <MessageSquare className="h-3 w-3" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Agent Communication Hub</h1>
            <p className="text-muted-foreground mt-1">
              Watch AI agents debate and reach consensus on trading decisions
            </p>
          </div>
          <Badge variant="outline" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            7 Agents Active
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Control Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Start Discussion
              </CardTitle>
              <CardDescription>
                Configure and launch an agent discussion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Symbol</label>
                <Input
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="AAPL, BTC, EUR/USD..."
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Asset Type</label>
                <Select value={assetType} onValueChange={(v: 'stock' | 'crypto' | 'forex' | 'commodity') => setAssetType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stock">Stock</SelectItem>
                    <SelectItem value="crypto">Cryptocurrency</SelectItem>
                    <SelectItem value="forex">Forex</SelectItem>
                    <SelectItem value="commodity">Commodity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Discussion Topic</label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="What should we analyze?"
                />
              </div>

              <div className="space-y-2 pt-4">
                <Button
                  className="w-full"
                  onClick={handleStartDiscussion}
                  disabled={isRunning || !symbol}
                >
                  {isRunning ? 'Starting...' : 'Start Discussion'}
                </Button>

                {activeThread && activeThread.status === 'active' && (
                  <>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={handleRunDebate}
                      disabled={isRunning}
                    >
                      {isRunning ? 'Debating...' : 'Run Debate Round'}
                    </Button>

                    <Button
                      className="w-full"
                      variant="default"
                      onClick={handleConductVoting}
                      disabled={isRunning}
                    >
                      {isRunning ? 'Voting...' : 'Conduct Voting'}
                    </Button>
                  </>
                )}
              </div>

              {/* Agent Legend */}
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-3">Participating Agents</h4>
                <div className="space-y-2">
                  {Object.entries(agentColors).map(([agent, color]) => (
                    <div key={agent} className="flex items-center gap-2 text-sm">
                      <div className={`w-3 h-3 rounded-full ${color}`} />
                      <span className="capitalize">{agent}</span>
                      {agentIcons[agent]}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Discussion Thread */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Discussion Thread
                </span>
                {activeThread && (
                  <Badge variant={activeThread.status === 'active' ? 'default' : 'secondary'}>
                    {activeThread.status === 'active' ? 'Live' : 'Concluded'}
                  </Badge>
                )}
              </CardTitle>
              {activeThread && (
                <CardDescription>
                  {activeThread.symbol} ({activeThread.assetType}) - {activeThread.topic}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {!activeThread ? (
                <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                  <Bot className="h-16 w-16 mb-4 opacity-50" />
                  <p>Start a discussion to see agents debate</p>
                </div>
              ) : (
                <Tabs defaultValue="messages">
                  <TabsList className="mb-4">
                    <TabsTrigger value="messages">Messages</TabsTrigger>
                    <TabsTrigger value="consensus">Consensus</TabsTrigger>
                    <TabsTrigger value="analysis">Analysis</TabsTrigger>
                  </TabsList>

                  <TabsContent value="messages">
                    <ScrollArea className="h-96 pr-4">
                      <div className="space-y-4">
                        {activeThread.messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex gap-3 p-3 rounded-lg border ${
                              message.messageType === 'consensus' 
                                ? 'bg-emerald-500/10 border-emerald-500/30' 
                                : message.messageType === 'vote'
                                ? 'bg-blue-500/10 border-blue-500/30'
                                : 'bg-card'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-full ${agentColors[message.agentType]} flex items-center justify-center text-white`}>
                              {agentIcons[message.agentType]}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{message.agentName}</span>
                                <Badge variant="outline" className="text-xs flex items-center gap-1">
                                  {getMessageTypeIcon(message.messageType)}
                                  {message.messageType.replace('_', ' ')}
                                </Badge>
                                {getSentimentIcon(message.sentiment)}
                                <span className="text-xs text-muted-foreground ml-auto">
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  {new Date(message.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-sm">{message.content}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-muted-foreground">Confidence:</span>
                                <Progress value={message.confidence} className="h-1 w-20" />
                                <span className="text-xs font-medium">{message.confidence}%</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="consensus">
                    {activeThread.consensus ? (
                      <div className="space-y-6">
                        <div className={`p-6 rounded-lg border-2 ${
                          activeThread.consensus.decision === 'buy' 
                            ? 'border-green-500 bg-green-500/10'
                            : activeThread.consensus.decision === 'sell'
                            ? 'border-red-500 bg-red-500/10'
                            : 'border-yellow-500 bg-yellow-500/10'
                        }`}>
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-2xl font-bold uppercase">
                              {activeThread.consensus.decision}
                            </h3>
                            <Badge variant="outline" className="text-lg px-4 py-1">
                              {activeThread.consensus.confidence}% Confidence
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">{activeThread.consensus.reasoning}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <Card>
                            <CardContent className="pt-6 text-center">
                              <div className="text-3xl font-bold text-green-500">
                                {activeThread.consensus.votesFor}
                              </div>
                              <p className="text-sm text-muted-foreground">Votes For</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-6 text-center">
                              <div className="text-3xl font-bold text-red-500">
                                {activeThread.consensus.votesAgainst}
                              </div>
                              <p className="text-sm text-muted-foreground">Votes Against</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-6 text-center">
                              <div className="text-3xl font-bold text-yellow-500">
                                {activeThread.consensus.abstentions}
                              </div>
                              <p className="text-sm text-muted-foreground">Abstentions</p>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <Vote className="h-12 w-12 mb-4 opacity-50" />
                        <p>Conduct voting to see consensus</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="analysis">
                    <div className="space-y-4">
                      {['technical', 'fundamental', 'sentiment', 'risk', 'regime', 'execution'].map((agentType) => {
                        const agentMessages = activeThread.messages.filter(
                          m => m.agentType === agentType && m.messageType === 'analysis'
                        );
                        const latestAnalysis = agentMessages[agentMessages.length - 1];

                        return (
                          <Card key={agentType}>
                            <CardContent className="pt-4">
                              <div className="flex items-center gap-3 mb-2">
                                <div className={`w-8 h-8 rounded-full ${agentColors[agentType]} flex items-center justify-center text-white`}>
                                  {agentIcons[agentType]}
                                </div>
                                <div>
                                  <h4 className="font-medium capitalize">{agentType} Agent</h4>
                                  {latestAnalysis && (
                                    <div className="flex items-center gap-2">
                                      {getSentimentIcon(latestAnalysis.sentiment)}
                                      <span className="text-xs text-muted-foreground capitalize">
                                        {latestAnalysis.sentiment}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {latestAnalysis && (
                                  <Badge variant="outline" className="ml-auto">
                                    {latestAnalysis.confidence}% confident
                                  </Badge>
                                )}
                              </div>
                              {latestAnalysis ? (
                                <p className="text-sm text-muted-foreground">
                                  {latestAnalysis.content}
                                </p>
                              ) : (
                                <p className="text-sm text-muted-foreground italic">
                                  No analysis yet
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
