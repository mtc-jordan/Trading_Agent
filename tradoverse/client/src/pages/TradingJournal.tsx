import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { 
  BookOpen, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Calendar as CalendarIcon,
  Search,
  Filter,
  BarChart3,
  Target,
  Brain,
  Heart,
  Lightbulb,
  Tag,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Minus
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const EMOTIONS = [
  { value: 'confident', label: 'Confident', emoji: '😎' },
  { value: 'anxious', label: 'Anxious', emoji: '😰' },
  { value: 'greedy', label: 'Greedy', emoji: '🤑' },
  { value: 'fearful', label: 'Fearful', emoji: '😨' },
  { value: 'neutral', label: 'Neutral', emoji: '😐' },
  { value: 'excited', label: 'Excited', emoji: '🤩' },
  { value: 'frustrated', label: 'Frustrated', emoji: '😤' },
  { value: 'calm', label: 'Calm', emoji: '😌' },
] as const;

const SETUPS = [
  { value: 'breakout', label: 'Breakout' },
  { value: 'pullback', label: 'Pullback' },
  { value: 'reversal', label: 'Reversal' },
  { value: 'trend_following', label: 'Trend Following' },
  { value: 'range_bound', label: 'Range Bound' },
  { value: 'news_based', label: 'News Based' },
  { value: 'technical', label: 'Technical' },
  { value: 'fundamental', label: 'Fundamental' },
  { value: 'other', label: 'Other' },
] as const;

type EmotionValue = typeof EMOTIONS[number]['value'];
type SetupValue = typeof SETUPS[number]['value'];

export default function TradingJournal() {
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSetup, setFilterSetup] = useState<SetupValue | "all">("all");
  const [filterOutcome, setFilterOutcome] = useState<"all" | "win" | "loss" | "breakeven" | "open">("all");

  // New entry form state
  const [newEntry, setNewEntry] = useState({
    symbol: "",
    side: "long" as "long" | "short",
    entryPrice: 0,
    exitPrice: undefined as number | undefined,
    quantity: 0,
    entryDate: new Date(),
    exitDate: undefined as Date | undefined,
    setup: "other" as SetupValue,
    emotionBefore: "neutral" as EmotionValue,
    emotionDuring: undefined as EmotionValue | undefined,
    emotionAfter: undefined as EmotionValue | undefined,
    confidenceLevel: 5,
    planFollowed: true,
    notes: "",
    lessonsLearned: "",
    mistakes: [] as string[],
    tags: [] as string[],
  });

  const [newTag, setNewTag] = useState("");
  const [newMistake, setNewMistake] = useState("");

  // Queries
  const { data: entries, isLoading: loadingEntries, refetch } = trpc.journal.list.useQuery({
    filters: {
      setup: filterSetup !== "all" ? filterSetup : undefined,
      outcome: filterOutcome !== "all" ? filterOutcome : undefined,
    },
    limit: 50,
  });

  const { data: stats } = trpc.journal.getStats.useQuery();
  const { data: emotionCorrelations } = trpc.journal.getEmotionCorrelations.useQuery();
  const { data: patterns } = trpc.journal.getPatterns.useQuery();
  const { data: userTags } = trpc.journal.getTags.useQuery();

  // Mutations
  const createMutation = trpc.journal.create.useMutation({
    onSuccess: () => {
      toast.success("Journal entry created!");
      setShowNewEntry(false);
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.journal.delete.useMutation({
    onSuccess: () => {
      toast.success("Entry deleted");
      refetch();
    },
  });

  const resetForm = () => {
    setNewEntry({
      symbol: "",
      side: "long",
      entryPrice: 0,
      exitPrice: undefined,
      quantity: 0,
      entryDate: new Date(),
      exitDate: undefined,
      setup: "other",
      emotionBefore: "neutral",
      emotionDuring: undefined,
      emotionAfter: undefined,
      confidenceLevel: 5,
      planFollowed: true,
      notes: "",
      lessonsLearned: "",
      mistakes: [],
      tags: [],
    });
  };

  const handleCreateEntry = () => {
    createMutation.mutate({
      ...newEntry,
      tags: newEntry.tags,
    });
  };

  const addTag = () => {
    if (newTag && !newEntry.tags.includes(newTag)) {
      setNewEntry(e => ({ ...e, tags: [...e.tags, newTag] }));
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setNewEntry(e => ({ ...e, tags: e.tags.filter(t => t !== tag) }));
  };

  const addMistake = () => {
    if (newMistake && !newEntry.mistakes.includes(newMistake)) {
      setNewEntry(e => ({ ...e, mistakes: [...e.mistakes, newMistake] }));
      setNewMistake("");
    }
  };

  const getOutcomeIcon = (outcome: string | null) => {
    switch (outcome) {
      case 'win': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'loss': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'breakeven': return <Minus className="h-4 w-4 text-yellow-500" />;
      default: return <Target className="h-4 w-4 text-blue-500" />;
    }
  };

  const getEmotionEmoji = (emotion: string) => {
    return EMOTIONS.find(e => e.value === emotion)?.emoji || '😐';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Trading Journal</h1>
            <p className="text-muted-foreground">
              Document your trades, track emotions, and learn from patterns
            </p>
          </div>
          <Dialog open={showNewEntry} onOpenChange={setShowNewEntry}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Journal Entry</DialogTitle>
                <DialogDescription>
                  Document your trade and emotional state
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Trade Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Symbol</Label>
                    <Input
                      placeholder="AAPL"
                      value={newEntry.symbol}
                      onChange={(e) => setNewEntry(s => ({ ...s, symbol: e.target.value.toUpperCase() }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Side</Label>
                    <Select 
                      value={newEntry.side}
                      onValueChange={(v) => setNewEntry(s => ({ ...s, side: v as "long" | "short" }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="long">Long</SelectItem>
                        <SelectItem value="short">Short</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Entry Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newEntry.entryPrice || ""}
                      onChange={(e) => setNewEntry(s => ({ ...s, entryPrice: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Exit Price (optional)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newEntry.exitPrice || ""}
                      onChange={(e) => setNewEntry(s => ({ ...s, exitPrice: e.target.value ? Number(e.target.value) : undefined }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={newEntry.quantity || ""}
                      onChange={(e) => setNewEntry(s => ({ ...s, quantity: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Entry Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(newEntry.entryDate, "PPP")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={newEntry.entryDate}
                          onSelect={(d) => d && setNewEntry(s => ({ ...s, entryDate: d }))}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Setup Type</Label>
                    <Select 
                      value={newEntry.setup}
                      onValueChange={(v) => setNewEntry(s => ({ ...s, setup: v as SetupValue }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SETUPS.map(setup => (
                          <SelectItem key={setup.value} value={setup.value}>{setup.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Emotions */}
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Emotional State
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Before Trade</Label>
                      <Select 
                        value={newEntry.emotionBefore}
                        onValueChange={(v) => setNewEntry(s => ({ ...s, emotionBefore: v as EmotionValue }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EMOTIONS.map(e => (
                            <SelectItem key={e.value} value={e.value}>
                              {e.emoji} {e.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>During Trade</Label>
                      <Select 
                        value={newEntry.emotionDuring || ""}
                        onValueChange={(v) => setNewEntry(s => ({ ...s, emotionDuring: v as EmotionValue }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {EMOTIONS.map(e => (
                            <SelectItem key={e.value} value={e.value}>
                              {e.emoji} {e.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>After Trade</Label>
                      <Select 
                        value={newEntry.emotionAfter || ""}
                        onValueChange={(v) => setNewEntry(s => ({ ...s, emotionAfter: v as EmotionValue }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {EMOTIONS.map(e => (
                            <SelectItem key={e.value} value={e.value}>
                              {e.emoji} {e.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Confidence Level: {newEntry.confidenceLevel}/10</Label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={newEntry.confidenceLevel}
                      onChange={(e) => setNewEntry(s => ({ ...s, confidenceLevel: Number(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Did you follow your trading plan?</Label>
                    <Switch
                      checked={newEntry.planFollowed}
                      onCheckedChange={(v) => setNewEntry(s => ({ ...s, planFollowed: v }))}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label>Trade Notes</Label>
                    <Textarea
                      placeholder="Why did you take this trade? What was your thesis?"
                      value={newEntry.notes}
                      onChange={(e) => setNewEntry(s => ({ ...s, notes: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Lessons Learned</Label>
                    <Textarea
                      placeholder="What did you learn from this trade?"
                      value={newEntry.lessonsLearned}
                      onChange={(e) => setNewEntry(s => ({ ...s, lessonsLearned: e.target.value }))}
                      rows={2}
                    />
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add tag..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" variant="outline" onClick={addTag}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newEntry.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewEntry(false)}>Cancel</Button>
                <Button onClick={handleCreateEntry} disabled={createMutation.isPending || !newEntry.symbol || !newEntry.notes}>
                  {createMutation.isPending ? "Creating..." : "Create Entry"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <BookOpen className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Entries</p>
                    <p className="text-2xl font-bold">{stats.totalEntries}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Target className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Win Rate</p>
                    <p className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stats.totalPnL >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    {stats.totalPnL >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total P&L</p>
                    <p className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ${stats.totalPnL.toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg P&L</p>
                    <p className="text-2xl font-bold">${stats.avgPnL.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <Brain className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Plan Followed</p>
                    <p className="text-2xl font-bold">{stats.planFollowedRate.toFixed(0)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue="entries" className="space-y-4">
          <TabsList>
            <TabsTrigger value="entries">
              <BookOpen className="h-4 w-4 mr-2" />
              Entries
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="patterns">
              <Lightbulb className="h-4 w-4 mr-2" />
              Patterns
            </TabsTrigger>
          </TabsList>

          {/* Entries Tab */}
          <TabsContent value="entries" className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input 
                  placeholder="Search entries..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm" 
                />
              </div>
              <Select value={filterSetup} onValueChange={(v) => setFilterSetup(v as SetupValue | "all")}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Setup" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Setups</SelectItem>
                  {SETUPS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterOutcome} onValueChange={(v) => setFilterOutcome(v as typeof filterOutcome)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Outcomes</SelectItem>
                  <SelectItem value="win">Wins</SelectItem>
                  <SelectItem value="loss">Losses</SelectItem>
                  <SelectItem value="breakeven">Breakeven</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loadingEntries ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="pt-6 h-32" />
                  </Card>
                ))}
              </div>
            ) : !entries?.entries.length ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No journal entries yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start documenting your trades to improve your performance
                  </p>
                  <Button onClick={() => setShowNewEntry(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Entry
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {entries.entries.map((entry) => (
                  <Card key={entry.id} className="hover:border-primary/50 transition-colors">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg ${entry.side === 'long' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            {entry.side === 'long' ? (
                              <TrendingUp className="h-6 w-6 text-green-500" />
                            ) : (
                              <TrendingDown className="h-6 w-6 text-red-500" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">{entry.symbol}</h3>
                              {getOutcomeIcon(entry.outcome || null)}
                              <Badge variant="outline">{entry.setup.replace('_', ' ')}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {entry.side.toUpperCase()} • {Number(entry.quantity)} shares @ ${Number(entry.entryPrice).toFixed(2)}
                              {entry.exitPrice && ` → $${Number(entry.exitPrice).toFixed(2)}`}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {format(new Date(entry.entryDate), "PPP")}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-sm">Emotions:</span>
                              <span title="Before">{getEmotionEmoji(entry.emotionBefore)}</span>
                              {entry.emotionDuring && <span title="During">{getEmotionEmoji(entry.emotionDuring)}</span>}
                              {entry.emotionAfter && <span title="After">{getEmotionEmoji(entry.emotionAfter)}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {entry.pnl !== null && (
                            <p className={`text-xl font-bold ${Number(entry.pnl) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {Number(entry.pnl) >= 0 ? '+' : ''}${Number(entry.pnl).toFixed(2)}
                            </p>
                          )}
                          {entry.pnlPercent !== null && (
                            <p className={`text-sm ${Number(entry.pnlPercent) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {Number(entry.pnlPercent) >= 0 ? '+' : ''}{Number(entry.pnlPercent).toFixed(2)}%
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => deleteMutation.mutate({ entryId: entry.id })}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      {entry.notes && (
                        <p className="mt-4 text-sm text-muted-foreground line-clamp-2">{entry.notes}</p>
                      )}
                      {entry.tags && (entry.tags as string[]).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(entry.tags as string[]).map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Emotion Correlations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Emotion-Performance Correlation
                  </CardTitle>
                  <CardDescription>
                    How your emotions affect trading outcomes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {emotionCorrelations?.length ? (
                    <div className="space-y-3">
                      {emotionCorrelations.map((corr) => (
                        <div key={corr.emotion} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>{getEmotionEmoji(corr.emotion)}</span>
                            <span className="capitalize">{corr.emotion}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${corr.winRate >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{ width: `${corr.winRate}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-12 text-right">{corr.winRate.toFixed(0)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Not enough data yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Setup Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Setup Performance
                  </CardTitle>
                  <CardDescription>
                    Win rate by trade setup type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stats?.setupBreakdown ? (
                    <div className="space-y-3">
                      {Object.entries(stats.setupBreakdown).map(([setup, data]) => (
                        <div key={setup} className="flex items-center justify-between">
                          <span className="capitalize">{setup.replace('_', ' ')}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{(data as { count: number }).count} trades</span>
                            <Badge variant={(data as { winRate: number }).winRate >= 50 ? 'default' : 'destructive'}>
                              {(data as { winRate: number }).winRate.toFixed(0)}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Not enough data yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Patterns Tab */}
          <TabsContent value="patterns" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Detected Trading Patterns
                </CardTitle>
                <CardDescription>
                  AI-identified patterns in your trading behavior
                </CardDescription>
              </CardHeader>
              <CardContent>
                {patterns?.length ? (
                  <div className="space-y-4">
                    {patterns.map((pattern, i) => (
                      <div key={i} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{pattern.pattern}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{pattern.description}</p>
                          </div>
                          <Badge variant={pattern.impact === 'positive' ? 'default' : pattern.impact === 'negative' ? 'destructive' : 'secondary'}>
                            {pattern.impact}
                          </Badge>
                        </div>
                        {pattern.suggestion && (
                          <p className="text-sm mt-2 p-2 bg-muted rounded">
                            💡 {pattern.suggestion}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Add more journal entries to detect patterns
                    </p>
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
