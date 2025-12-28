import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Award, 
  Plus, 
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Crown,
  Target,
  Activity
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function Community() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("discussions");
  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const [newThread, setNewThread] = useState({
    title: "",
    content: "",
    threadType: "general" as "analysis" | "strategy" | "bot" | "general" | "market",
    symbol: "",
  });

  const utils = trpc.useUtils();

  const { data: discussions, isLoading: discussionsLoading } = trpc.discussion.list.useQuery({
    limit: 50,
  });

  const { data: topTraders, isLoading: tradersLoading } = trpc.profile.getTopTraders.useQuery({
    limit: 20,
  });

  const { data: activityFeed, isLoading: feedLoading } = trpc.activityFeed.getPublicFeed.useQuery({
    limit: 30,
  });

  const createThreadMutation = trpc.discussion.create.useMutation({
    onSuccess: () => {
      utils.discussion.list.invalidate();
      setNewThreadOpen(false);
      setNewThread({ title: "", content: "", threadType: "general", symbol: "" });
      toast.success("Discussion thread created!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreateThread = () => {
    if (!newThread.title.trim() || !newThread.content.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    createThreadMutation.mutate({
      title: newThread.title,
      content: newThread.content,
      threadType: newThread.threadType,
      symbol: newThread.symbol || undefined,
    });
  };

  const getThreadTypeColor = (type: string) => {
    switch (type) {
      case "analysis": return "bg-blue-500/10 text-blue-500";
      case "strategy": return "bg-purple-500/10 text-purple-500";
      case "bot": return "bg-green-500/10 text-green-500";
      case "market": return "bg-orange-500/10 text-orange-500";
      default: return "bg-gray-500/10 text-gray-500";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "trade": return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "analysis": return <Activity className="h-4 w-4 text-blue-500" />;
      case "strategy_share": return <Share2 className="h-4 w-4 text-purple-500" />;
      case "follow": return <Users className="h-4 w-4 text-pink-500" />;
      case "comment": return <MessageCircle className="h-4 w-4 text-cyan-500" />;
      case "achievement": return <Award className="h-4 w-4 text-yellow-500" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8" />
            Community
          </h1>
          <p className="text-muted-foreground mt-1">
            Connect with traders, share strategies, and learn from the community
          </p>
        </div>
        
        {user && (
          <Dialog open={newThreadOpen} onOpenChange={setNewThreadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Discussion
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Start a Discussion</DialogTitle>
                <DialogDescription>
                  Share your thoughts, ask questions, or discuss trading strategies
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    placeholder="What's on your mind?"
                    value={newThread.title}
                    onChange={(e) => setNewThread({ ...newThread, title: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select
                      value={newThread.threadType}
                      onValueChange={(v) => setNewThread({ ...newThread, threadType: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="analysis">Analysis</SelectItem>
                        <SelectItem value="strategy">Strategy</SelectItem>
                        <SelectItem value="bot">Trading Bots</SelectItem>
                        <SelectItem value="market">Market News</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Symbol (optional)</label>
                    <Input
                      placeholder="e.g., AAPL"
                      value={newThread.symbol}
                      onChange={(e) => setNewThread({ ...newThread, symbol: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Content</label>
                  <Textarea
                    placeholder="Share your thoughts..."
                    rows={6}
                    value={newThread.content}
                    onChange={(e) => setNewThread({ ...newThread, content: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNewThreadOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateThread}
                  disabled={createThreadMutation.isPending}
                >
                  {createThreadMutation.isPending ? "Creating..." : "Create Discussion"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Discussions */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="discussions" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Discussions
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Activity Feed
              </TabsTrigger>
            </TabsList>

            <TabsContent value="discussions">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Discussions</CardTitle>
                  <CardDescription>
                    Join the conversation with fellow traders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {discussionsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : discussions && discussions.length > 0 ? (
                    <ScrollArea className="h-[600px] pr-4">
                      <div className="space-y-4">
                        {discussions.map((thread) => (
                          <div
                            key={thread.id}
                            className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                          >
                            <div className="flex items-start gap-4">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>U{thread.userId}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium truncate">{thread.title}</h4>
                                  {thread.isPinned && (
                                    <Badge variant="secondary">Pinned</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={getThreadTypeColor(thread.threadType)}>
                                    {thread.threadType}
                                  </Badge>
                                  {thread.symbol && (
                                    <Badge variant="outline">{thread.symbol}</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {thread.content}
                                </p>
                                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    {thread.viewCount}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Heart className="h-3 w-3" />
                                    {thread.likeCount}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MessageCircle className="h-3 w-3" />
                                    {thread.commentCount}
                                  </span>
                                  <span>
                                    {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="py-12 text-center">
                      <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No discussions yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Be the first to start a conversation!
                      </p>
                      {user && (
                        <Button onClick={() => setNewThreadOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Start Discussion
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Activity Feed</CardTitle>
                  <CardDescription>
                    See what's happening in the community
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {feedLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : activityFeed && activityFeed.length > 0 ? (
                    <ScrollArea className="h-[600px] pr-4">
                      <div className="space-y-4">
                        {activityFeed.map((activity) => (
                          <div
                            key={activity.id}
                            className="flex items-start gap-3 p-3 border rounded-lg"
                          >
                            <div className="mt-1">
                              {getActivityIcon(activity.activityType)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{activity.title}</p>
                              {activity.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {activity.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                {activity.symbol && (
                                  <Badge variant="outline" className="text-xs">
                                    {activity.symbol}
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="py-12 text-center">
                      <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No activity yet</h3>
                      <p className="text-muted-foreground">
                        Activity from the community will appear here
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Top Traders & Leaderboard */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Top Traders
              </CardTitle>
              <CardDescription>
                Best performing traders this month
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tradersLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : topTraders && topTraders.length > 0 ? (
                <div className="space-y-4">
                  {topTraders.slice(0, 10).map((trader, index) => (
                    <div
                      key={trader.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold">
                        {index + 1}
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={trader.avatarUrl || undefined} />
                        <AvatarFallback>
                          {trader.displayName?.[0] || "T"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {trader.displayName || `Trader ${trader.userId}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {trader.totalTrades} trades
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${
                          Number(trader.totalReturn) >= 0 ? "text-green-500" : "text-red-500"
                        }`}>
                          {Number(trader.totalReturn) >= 0 ? "+" : ""}
                          {((Number(trader.totalReturn) || 0) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No top traders data yet
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-500" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Discussions</span>
                  <span className="font-bold">{discussions?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Top Traders</span>
                  <span className="font-bold">{topTraders?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Recent Activity</span>
                  <span className="font-bold">{activityFeed?.length || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Join CTA for non-logged in users */}
          {!user && (
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="py-6 text-center">
                <Users className="h-12 w-12 mx-auto text-primary mb-4" />
                <h3 className="font-semibold mb-2">Join the Community</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Sign in to participate in discussions and follow top traders
                </p>
                <Button asChild>
                  <a href="/login">Get Started</a>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
