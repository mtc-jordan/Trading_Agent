import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { AccuracyBadge, AccuracyIndicator } from "@/components/AccuracyBadge";
import { 
  Search, 
  Bot, 
  TrendingUp, 
  Star,
  Users,
  Copy,
  Trophy,
  Medal,
  Award,
  Target
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function Marketplace() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: listings, isLoading } = trpc.marketplace.list.useQuery({});

  const { data: leaderboard } = trpc.marketplace.leaderboard.useQuery({ limit: 10 });

  const copyBotMutation = trpc.marketplace.copyBot.useMutation({
    onSuccess: () => {
      toast.success("Bot copied successfully! Check your bots page.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to copy bot");
    },
  });

  const handleCopyBot = (listingId: number) => {
    copyBotMutation.mutate({ listingId, accountId: 0 }); // accountId will be selected by user
  };

  const filteredListings = listings?.filter(listing => 
    listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Award className="w-5 h-5 text-amber-600" />;
      default: return <span className="w-5 h-5 flex items-center justify-center text-muted-foreground font-medium">{rank}</span>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bot Marketplace</h1>
          <p className="text-muted-foreground">
            Discover and copy successful trading strategies from top performers
          </p>
        </div>

        <Tabs defaultValue="marketplace" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="marketplace" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Marketplace
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Leaderboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="marketplace" className="space-y-6">
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search bots..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-input border-border text-foreground"
              />
            </div>

            {/* Listings Grid */}
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="bg-card border-border">
                    <CardContent className="p-6">
                      <div className="h-48 bg-muted rounded-lg animate-pulse" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredListings && filteredListings.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredListings.map((listing) => (
                  <Card key={listing.id} className="bg-card border-border hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg text-foreground">{listing.title}</CardTitle>
                            <CardDescription>by {(listing as any).creatorName || "Anonymous"}</CardDescription>
                          </div>
                        </div>
                        {listing.isFeatured && (
                          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {listing.description || "No description provided"}
                      </p>

                      {/* Accuracy Badge */}
                      <div className="mb-4">
                        <AccuracyBadge
                          accuracyScore={(listing as any).accuracyScore}
                          totalPredictions={(listing as any).totalPredictions || 0}
                          correctPredictions={(listing as any).correctPredictions || 0}
                          size="sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-secondary/50 text-center">
                          <p className="text-xs text-muted-foreground">Return</p>
                          <p className={`font-bold ${parseFloat((listing as any).totalReturn?.toString() || "0") >= 0 ? "text-profit" : "text-loss"}`}>
                            {parseFloat((listing as any).totalReturn?.toString() || "0") >= 0 ? "+" : ""}
                            {(parseFloat((listing as any).totalReturn?.toString() || "0") * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div className="p-2 rounded-lg bg-secondary/50 text-center">
                          <p className="text-xs text-muted-foreground">Win Rate</p>
                          <p className="font-bold text-foreground">
                            {(parseFloat((listing as any).winRate?.toString() || "0") * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div className="p-2 rounded-lg bg-secondary/50 text-center">
                          <p className="text-xs text-muted-foreground">AI Accuracy</p>
                          <p className="font-bold text-foreground flex items-center justify-center gap-1">
                            <Target className="w-3 h-3" />
                            <AccuracyIndicator accuracyScore={(listing as any).accuracyScore} />
                          </p>
                        </div>
                        <div className="p-2 rounded-lg bg-secondary/50 text-center">
                          <p className="text-xs text-muted-foreground">Copies</p>
                          <p className="font-bold text-foreground flex items-center justify-center gap-1">
                            <Users className="w-3 h-3" />
                            {(listing as any).copiesCount || 0}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          listing.price === "0" || !listing.price
                            ? "bg-green-500/20 text-green-400"
                            : "bg-primary/20 text-primary"
                        }`}>
                          {listing.price === "0" || !listing.price ? "Free" : `$${listing.price}/mo`}
                        </span>
                        <Button 
                          size="sm"
                          onClick={() => handleCopyBot(listing.id)}
                          disabled={copyBotMutation.isPending}
                          className="gradient-primary text-primary-foreground"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="py-12">
                  <div className="text-center">
                    <Bot className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No Bots Found</h3>
                    <p className="text-muted-foreground">
                      {searchQuery ? "Try a different search term" : "No bots available in the marketplace yet"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  Top Performing Bots
                </CardTitle>
                <CardDescription>
                  Ranked by total return over the past 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                {leaderboard && leaderboard.length > 0 ? (
                  <div className="space-y-3">
                    {leaderboard.map((entry, index) => (
                      <div 
                        key={entry.id} 
                        className={`flex items-center justify-between p-4 rounded-lg ${
                          index < 3 ? "bg-primary/10 border border-primary/20" : "bg-secondary/50"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {getRankIcon(index + 1)}
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                              <Bot className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{entry.title}</p>
                              <p className="text-sm text-muted-foreground">by {(entry as any).creatorName || "Anonymous"}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Return</p>
                            <p className={`font-bold ${parseFloat((entry as any).totalReturn?.toString() || "0") >= 0 ? "text-profit" : "text-loss"}`}>
                              {parseFloat((entry as any).totalReturn?.toString() || "0") >= 0 ? "+" : ""}
                              {(parseFloat((entry as any).totalReturn?.toString() || "0") * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Win Rate</p>
                            <p className="font-medium text-foreground">
                              {(parseFloat((entry as any).winRate?.toString() || "0") * 100).toFixed(0)}%
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">AI Accuracy</p>
                            <AccuracyBadge
                              accuracyScore={(entry as any).accuracyScore}
                              totalPredictions={(entry as any).totalPredictions || 0}
                              correctPredictions={(entry as any).correctPredictions || 0}
                              size="sm"
                              showLabel={false}
                            />
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Copies</p>
                            <p className="font-medium text-foreground flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {(entry as any).copiesCount || 0}
                            </p>
                          </div>
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyBot(entry.id)}
                            disabled={copyBotMutation.isPending}
                            className="border-border"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No leaderboard data available yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
