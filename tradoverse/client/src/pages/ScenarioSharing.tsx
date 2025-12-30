import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { 
  Share2, 
  Heart, 
  Download, 
  Eye, 
  Search, 
  TrendingUp, 
  Clock, 
  Filter,
  Plus,
  Trash2,
  User,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { toast } from 'sonner';

export default function ScenarioSharing() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'likes' | 'imports' | 'recent'>('recent');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<any>(null);

  // Form state for sharing
  const [shareName, setShareName] = useState('');
  const [shareDescription, setShareDescription] = useState('');
  const [shareCategory, setShareCategory] = useState('general');
  const [shareTags, setShareTags] = useState('');

  // Queries
  const { data: communityScenarios, isLoading: loadingCommunity, refetch: refetchCommunity } = 
    trpc.broker.getCommunityScenarios.useQuery({
      sortBy,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      limit: 20,
    });

  const { data: userScenarios, refetch: refetchUser } = 
    trpc.broker.getUserScenarios.useQuery(undefined, {
      enabled: !!user,
    });

  const { data: categories } = trpc.broker.getScenarioCategories.useQuery();

  // Mutations
  const shareMutation = trpc.broker.shareScenario.useMutation({
    onSuccess: () => {
      toast.success('Scenario shared successfully!');
      setShareDialogOpen(false);
      refetchCommunity();
      refetchUser();
      resetShareForm();
    },
    onError: (error) => {
      toast.error(`Failed to share scenario: ${error.message}`);
    },
  });

  const likeMutation = trpc.broker.likeScenario.useMutation({
    onSuccess: (result) => {
      toast.success(result.liked ? 'Scenario liked!' : 'Like removed');
      refetchCommunity();
    },
  });

  const importMutation = trpc.broker.importScenario.useMutation({
    onSuccess: (result) => {
      toast.success(`Imported ${result.trades.length} trades!`);
      refetchCommunity();
    },
  });

  const deleteMutation = trpc.broker.deleteScenario.useMutation({
    onSuccess: () => {
      toast.success('Scenario deleted');
      refetchUser();
      refetchCommunity();
    },
  });

  const resetShareForm = () => {
    setShareName('');
    setShareDescription('');
    setShareCategory('general');
    setShareTags('');
  };

  const handleShare = () => {
    if (!shareName.trim()) {
      toast.error('Please enter a scenario name');
      return;
    }

    // Demo trades for sharing
    const demoTrades = [
      { symbol: 'AAPL', side: 'buy' as const, quantity: 10, estimatedPrice: 175 },
      { symbol: 'GOOGL', side: 'buy' as const, quantity: 5, estimatedPrice: 140 },
    ];

    shareMutation.mutate({
      name: shareName,
      description: shareDescription,
      trades: demoTrades,
      category: shareCategory,
      tags: shareTags.split(',').map(t => t.trim()).filter(Boolean),
      isPublic: true,
    });
  };

  const handleViewScenario = (scenario: any) => {
    setSelectedScenario(scenario);
    setViewDialogOpen(true);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Scenario Sharing</h1>
            <p className="text-gray-400 mt-1">
              Share your trading scenarios and discover strategies from the community
            </p>
          </div>
          <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Share Scenario
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-800">
              <DialogHeader>
                <DialogTitle className="text-white">Share Your Scenario</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Share your trading scenario with the community
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label className="text-gray-300">Scenario Name</Label>
                  <Input
                    value={shareName}
                    onChange={(e) => setShareName(e.target.value)}
                    placeholder="My Trading Strategy"
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Description</Label>
                  <Textarea
                    value={shareDescription}
                    onChange={(e) => setShareDescription(e.target.value)}
                    placeholder="Describe your strategy..."
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                    rows={3}
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Category</Label>
                  <Select value={shareCategory} onValueChange={setShareCategory}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="growth">Growth</SelectItem>
                      <SelectItem value="value">Value</SelectItem>
                      <SelectItem value="momentum">Momentum</SelectItem>
                      <SelectItem value="dividend">Dividend</SelectItem>
                      <SelectItem value="sector">Sector Rotation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">Tags (comma separated)</Label>
                  <Input
                    value={shareTags}
                    onChange={(e) => setShareTags(e.target.value)}
                    placeholder="tech, growth, long-term"
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                  />
                </div>
                <Button 
                  onClick={handleShare} 
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={shareMutation.isPending}
                >
                  {shareMutation.isPending ? 'Sharing...' : 'Share Scenario'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="community" className="space-y-6">
          <TabsList className="bg-gray-800/50 border border-gray-700">
            <TabsTrigger value="community" className="data-[state=active]:bg-green-600">
              <Share2 className="w-4 h-4 mr-2" />
              Community
            </TabsTrigger>
            <TabsTrigger value="my-scenarios" className="data-[state=active]:bg-green-600">
              <User className="w-4 h-4 mr-2" />
              My Scenarios
            </TabsTrigger>
          </TabsList>

          {/* Community Tab */}
          <TabsContent value="community" className="space-y-6">
            {/* Filters */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search scenarios..."
                        className="pl-10 bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[150px] bg-gray-800 border-gray-700 text-white">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.category} value={cat.category}>
                          {cat.category} ({cat.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                    <SelectTrigger className="w-[150px] bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="recent">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          Most Recent
                        </div>
                      </SelectItem>
                      <SelectItem value="likes">
                        <div className="flex items-center">
                          <Heart className="w-4 h-4 mr-2" />
                          Most Liked
                        </div>
                      </SelectItem>
                      <SelectItem value="imports">
                        <div className="flex items-center">
                          <Download className="w-4 h-4 mr-2" />
                          Most Imported
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Scenarios Grid */}
            {loadingCommunity ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="bg-gray-900/50 border-gray-800 animate-pulse">
                    <CardContent className="p-6 h-48" />
                  </Card>
                ))}
              </div>
            ) : communityScenarios && communityScenarios.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {communityScenarios.map((scenario) => (
                  <Card 
                    key={scenario.id} 
                    className="bg-gray-900/50 border-gray-800 hover:border-green-600/50 transition-colors cursor-pointer"
                    onClick={() => handleViewScenario(scenario)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-white text-lg">{scenario.name}</CardTitle>
                          <CardDescription className="text-gray-400 text-sm">
                            by {scenario.authorName}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="border-green-600 text-green-400">
                          {scenario.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                        {scenario.description || 'No description provided'}
                      </p>
                      
                      {/* Tags */}
                      {scenario.tags && scenario.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {scenario.tags.slice(0, 3).map((tag: string, i: number) => (
                            <Badge key={i} variant="secondary" className="bg-gray-800 text-gray-300 text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Trades Preview */}
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-gray-500 text-sm">{scenario.trades?.length || 0} trades</span>
                        {scenario.trades?.slice(0, 2).map((trade: any, i: number) => (
                          <Badge 
                            key={i} 
                            className={trade.side === 'buy' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}
                          >
                            {trade.side === 'buy' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                            {trade.symbol}
                          </Badge>
                        ))}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <button 
                            className="flex items-center gap-1 text-gray-400 hover:text-red-400 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              likeMutation.mutate({ scenarioId: scenario.id });
                            }}
                          >
                            <Heart className="w-4 h-4" />
                            {scenario.likesCount}
                          </button>
                          <button 
                            className="flex items-center gap-1 text-gray-400 hover:text-green-400 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              importMutation.mutate({ scenarioId: scenario.id });
                            }}
                          >
                            <Download className="w-4 h-4" />
                            {scenario.importsCount}
                          </button>
                          <span className="flex items-center gap-1 text-gray-500">
                            <Eye className="w-4 h-4" />
                            {scenario.viewsCount}
                          </span>
                        </div>
                        <span className="text-gray-500 text-xs">
                          {formatDate(scenario.createdAt)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-12 text-center">
                  <Share2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Scenarios Yet</h3>
                  <p className="text-gray-400 mb-4">Be the first to share a trading scenario!</p>
                  <Button 
                    onClick={() => setShareDialogOpen(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Share Your First Scenario
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* My Scenarios Tab */}
          <TabsContent value="my-scenarios" className="space-y-6">
            {!user ? (
              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-12 text-center">
                  <User className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Sign In Required</h3>
                  <p className="text-gray-400">Please sign in to view your shared scenarios</p>
                </CardContent>
              </Card>
            ) : userScenarios && userScenarios.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userScenarios.map((scenario) => (
                  <Card key={scenario.id} className="bg-gray-900/50 border-gray-800">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-white text-lg">{scenario.name}</CardTitle>
                          <Badge 
                            variant="outline" 
                            className={scenario.isPublic ? 'border-green-600 text-green-400' : 'border-gray-600 text-gray-400'}
                          >
                            {scenario.isPublic ? 'Public' : 'Private'}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-400 hover:text-red-300 hover:bg-red-600/20"
                          onClick={() => deleteMutation.mutate({ scenarioId: scenario.id })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                        {scenario.description || 'No description'}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1 text-gray-400">
                            <Heart className="w-4 h-4" />
                            {scenario.likesCount}
                          </span>
                          <span className="flex items-center gap-1 text-gray-400">
                            <Download className="w-4 h-4" />
                            {scenario.importsCount}
                          </span>
                          <span className="flex items-center gap-1 text-gray-500">
                            <Eye className="w-4 h-4" />
                            {scenario.viewsCount}
                          </span>
                        </div>
                        <span className="text-gray-500 text-xs">
                          {formatDate(scenario.createdAt)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-12 text-center">
                  <Share2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Scenarios Shared</h3>
                  <p className="text-gray-400 mb-4">You haven't shared any scenarios yet</p>
                  <Button 
                    onClick={() => setShareDialogOpen(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Share Your First Scenario
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* View Scenario Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">{selectedScenario?.name}</DialogTitle>
              <DialogDescription className="text-gray-400">
                by {selectedScenario?.authorName} • {selectedScenario && formatDate(selectedScenario.createdAt)}
              </DialogDescription>
            </DialogHeader>
            {selectedScenario && (
              <div className="space-y-4 mt-4">
                <p className="text-gray-300">{selectedScenario.description || 'No description provided'}</p>
                
                <div>
                  <h4 className="text-white font-semibold mb-2">Trades</h4>
                  <div className="space-y-2">
                    {selectedScenario.trades?.map((trade: any, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge className={trade.side === 'buy' ? 'bg-green-600' : 'bg-red-600'}>
                            {trade.side.toUpperCase()}
                          </Badge>
                          <span className="text-white font-medium">{trade.symbol}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-white">{trade.quantity} shares</div>
                          <div className="text-gray-400 text-sm">@ ${trade.estimatedPrice?.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      importMutation.mutate({ scenarioId: selectedScenario.id });
                      setViewDialogOpen(false);
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Import Scenario
                  </Button>
                  <Button 
                    variant="outline"
                    className="border-gray-700 text-gray-300"
                    onClick={() => likeMutation.mutate({ scenarioId: selectedScenario.id })}
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    Like
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
