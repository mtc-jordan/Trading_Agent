import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  LayoutDashboard,
  Bell,
  User,
  Brain,
  History,
  Target,
  MessageSquare,
  Trophy,
  Network,
  TrendingUp,
  Bitcoin,
  Copy,
  AlertCircle,
  BookOpen,
  Wand2,
  TestTube,
  Clock,
  Bot,
  Calendar,
  Store,
  Link,
  Building2,
  BarChart3,
  PieChart,
  Scale,
  Activity,
  Zap,
  Settings,
  Users,
  Shield,
  Command,
  ArrowRight,
  Star,
  Sparkles,
} from "lucide-react";

// Define all searchable items
interface SearchItem {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  category: "navigation" | "feature" | "action" | "symbol";
  keywords: string[];
}

const SEARCH_ITEMS: SearchItem[] = [
  // Overview
  { id: "dashboard", title: "Dashboard", description: "Main dashboard overview", path: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" />, category: "navigation", keywords: ["home", "main", "overview"] },
  { id: "notifications", title: "Notifications", description: "View all notifications", path: "/notifications", icon: <Bell className="h-4 w-4" />, category: "navigation", keywords: ["alerts", "messages", "updates"] },
  { id: "profile", title: "Profile", description: "Your profile settings", path: "/profile", icon: <User className="h-4 w-4" />, category: "navigation", keywords: ["account", "user", "settings"] },
  
  // AI Analysis
  { id: "analysis", title: "AI Analysis", description: "Run AI-powered stock analysis", path: "/analysis", icon: <Brain className="h-4 w-4" />, category: "navigation", keywords: ["ai", "analyze", "stock", "prediction"] },
  { id: "analysis-history", title: "Analysis History", description: "View past analyses", path: "/analysis-history", icon: <History className="h-4 w-4" />, category: "navigation", keywords: ["past", "previous", "history"] },
  { id: "accuracy", title: "Prediction Accuracy", description: "Track AI prediction accuracy", path: "/accuracy", icon: <Target className="h-4 w-4" />, category: "navigation", keywords: ["accuracy", "performance", "predictions"] },
  { id: "social-sentiment", title: "Social Sentiment", description: "Twitter/Reddit sentiment analysis", path: "/social-sentiment", icon: <MessageSquare className="h-4 w-4" />, category: "navigation", keywords: ["twitter", "reddit", "social", "sentiment"] },
  { id: "agent-leaderboard", title: "Agent Leaderboard", description: "Compare AI agent performance", path: "/agent-leaderboard", icon: <Trophy className="h-4 w-4" />, category: "navigation", keywords: ["agents", "ranking", "performance"] },
  { id: "agent-hub", title: "Agent Hub", description: "Real-time agent communication", path: "/agent-hub", icon: <Network className="h-4 w-4" />, category: "navigation", keywords: ["agents", "communication", "hub"] },
  
  // Trading
  { id: "paper-trading", title: "Paper Trading", description: "Practice trading with virtual money", path: "/paper-trading", icon: <TrendingUp className="h-4 w-4" />, category: "navigation", keywords: ["practice", "simulation", "virtual"] },
  { id: "crypto", title: "Crypto Trading", description: "Trade cryptocurrencies", path: "/crypto", icon: <Bitcoin className="h-4 w-4" />, category: "navigation", keywords: ["bitcoin", "ethereum", "crypto"] },
  { id: "copy-trading", title: "Copy Trading", description: "Copy successful traders", path: "/copy-trading", icon: <Copy className="h-4 w-4" />, category: "navigation", keywords: ["copy", "follow", "traders"] },
  { id: "alerts", title: "Price Alerts", description: "Set price alerts", path: "/alerts", icon: <AlertCircle className="h-4 w-4" />, category: "navigation", keywords: ["alerts", "price", "notifications"] },
  { id: "journal", title: "Trading Journal", description: "Track your trades", path: "/journal", icon: <BookOpen className="h-4 w-4" />, category: "navigation", keywords: ["journal", "diary", "trades"] },
  
  // Strategies
  { id: "strategy-generator", title: "Strategy Generator", description: "Generate custom trading strategies", path: "/strategy-generator", icon: <Wand2 className="h-4 w-4" />, category: "navigation", keywords: ["strategy", "generate", "create"] },
  { id: "backtest", title: "Strategy Backtester", description: "Backtest trading strategies", path: "/backtest", icon: <TestTube className="h-4 w-4" />, category: "navigation", keywords: ["backtest", "test", "historical"] },
  { id: "strategy-alerts", title: "Strategy Alerts", description: "Alerts for strategy conditions", path: "/strategy-alerts", icon: <Clock className="h-4 w-4" />, category: "navigation", keywords: ["strategy", "alerts", "conditions"] },
  { id: "template-performance", title: "Template Rankings", description: "View strategy template rankings", path: "/template-performance", icon: <Trophy className="h-4 w-4" />, category: "navigation", keywords: ["templates", "rankings", "performance"] },
  
  // Portfolio
  { id: "portfolio", title: "Portfolio Overview", description: "View your portfolio", path: "/portfolio", icon: <PieChart className="h-4 w-4" />, category: "navigation", keywords: ["portfolio", "holdings", "positions"] },
  { id: "rebalancing", title: "Portfolio Rebalancing", description: "Rebalance your portfolio", path: "/rebalancing", icon: <Scale className="h-4 w-4" />, category: "navigation", keywords: ["rebalance", "allocate", "optimize"] },
  { id: "stress-testing", title: "Stress Testing", description: "Portfolio stress tests", path: "/stress-testing", icon: <Activity className="h-4 w-4" />, category: "navigation", keywords: ["stress", "test", "risk"] },
  { id: "correlation-engine", title: "Correlation Engine", description: "Multi-asset correlations", path: "/correlation-engine", icon: <Zap className="h-4 w-4" />, category: "navigation", keywords: ["correlation", "assets", "diversification"] },
  
  // Trading Bots
  { id: "bots", title: "Trading Bots", description: "Manage your trading bots", path: "/bots", icon: <Bot className="h-4 w-4" />, category: "navigation", keywords: ["bots", "automated", "trading"] },
  { id: "schedules", title: "Bot Schedules", description: "Schedule bot operations", path: "/schedules", icon: <Calendar className="h-4 w-4" />, category: "navigation", keywords: ["schedule", "timing", "automation"] },
  { id: "marketplace", title: "Bot Marketplace", description: "Browse and buy bots", path: "/marketplace", icon: <Store className="h-4 w-4" />, category: "navigation", keywords: ["marketplace", "buy", "sell", "bots"] },
  
  // Connections
  { id: "brokers", title: "Brokers", description: "Connect your broker accounts", path: "/brokers", icon: <Building2 className="h-4 w-4" />, category: "navigation", keywords: ["broker", "connect", "account"] },
  { id: "exchanges", title: "Exchanges", description: "Connect crypto exchanges", path: "/exchanges", icon: <Link className="h-4 w-4" />, category: "navigation", keywords: ["exchange", "crypto", "connect"] },
  { id: "order-history", title: "Order History", description: "View order history", path: "/order-history", icon: <History className="h-4 w-4" />, category: "navigation", keywords: ["orders", "history", "trades"] },
  { id: "broker-analytics", title: "Broker Analytics", description: "Analyze broker performance", path: "/broker-analytics", icon: <BarChart3 className="h-4 w-4" />, category: "navigation", keywords: ["analytics", "broker", "performance"] },
  
  // Settings
  { id: "settings", title: "Settings", description: "App settings", path: "/settings", icon: <Settings className="h-4 w-4" />, category: "navigation", keywords: ["settings", "preferences", "config"] },
  { id: "community", title: "Community", description: "Join the community", path: "/community", icon: <Users className="h-4 w-4" />, category: "navigation", keywords: ["community", "social", "forum"] },
  
  // Admin
  { id: "admin", title: "Admin Dashboard", description: "Admin controls", path: "/admin/dashboard", icon: <Shield className="h-4 w-4" />, category: "navigation", keywords: ["admin", "manage", "control"] },
  
  // Popular Symbols
  { id: "symbol-aapl", title: "AAPL - Apple Inc.", description: "Analyze Apple stock", path: "/analysis?symbol=AAPL", icon: <TrendingUp className="h-4 w-4" />, category: "symbol", keywords: ["apple", "aapl", "tech"] },
  { id: "symbol-msft", title: "MSFT - Microsoft", description: "Analyze Microsoft stock", path: "/analysis?symbol=MSFT", icon: <TrendingUp className="h-4 w-4" />, category: "symbol", keywords: ["microsoft", "msft", "tech"] },
  { id: "symbol-googl", title: "GOOGL - Alphabet", description: "Analyze Google stock", path: "/analysis?symbol=GOOGL", icon: <TrendingUp className="h-4 w-4" />, category: "symbol", keywords: ["google", "googl", "alphabet", "tech"] },
  { id: "symbol-tsla", title: "TSLA - Tesla", description: "Analyze Tesla stock", path: "/analysis?symbol=TSLA", icon: <TrendingUp className="h-4 w-4" />, category: "symbol", keywords: ["tesla", "tsla", "ev", "electric"] },
  { id: "symbol-nvda", title: "NVDA - NVIDIA", description: "Analyze NVIDIA stock", path: "/analysis?symbol=NVDA", icon: <TrendingUp className="h-4 w-4" />, category: "symbol", keywords: ["nvidia", "nvda", "gpu", "ai"] },
  { id: "symbol-amzn", title: "AMZN - Amazon", description: "Analyze Amazon stock", path: "/analysis?symbol=AMZN", icon: <TrendingUp className="h-4 w-4" />, category: "symbol", keywords: ["amazon", "amzn", "ecommerce"] },
  { id: "symbol-meta", title: "META - Meta Platforms", description: "Analyze Meta stock", path: "/analysis?symbol=META", icon: <TrendingUp className="h-4 w-4" />, category: "symbol", keywords: ["meta", "facebook", "social"] },
  { id: "symbol-btc", title: "BTC - Bitcoin", description: "Analyze Bitcoin", path: "/crypto?symbol=BTC", icon: <Bitcoin className="h-4 w-4" />, category: "symbol", keywords: ["bitcoin", "btc", "crypto"] },
  { id: "symbol-eth", title: "ETH - Ethereum", description: "Analyze Ethereum", path: "/crypto?symbol=ETH", icon: <Bitcoin className="h-4 w-4" />, category: "symbol", keywords: ["ethereum", "eth", "crypto"] },
];

// Recent searches storage key
const RECENT_SEARCHES_KEY = "tradoverse-recent-searches";
const MAX_RECENT_SEARCHES = 5;

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {
        setRecentSearches([]);
      }
    }
  }, []);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      // Show recent searches first, then popular items
      const recentItems = recentSearches
        .map(id => SEARCH_ITEMS.find(item => item.id === id))
        .filter(Boolean) as SearchItem[];
      
      const popularItems = SEARCH_ITEMS.filter(
        item => !recentSearches.includes(item.id)
      ).slice(0, 10);
      
      return { recent: recentItems, results: popularItems };
    }

    const lowerQuery = query.toLowerCase();
    const results = SEARCH_ITEMS.filter(item => {
      const matchTitle = item.title.toLowerCase().includes(lowerQuery);
      const matchDescription = item.description.toLowerCase().includes(lowerQuery);
      const matchKeywords = item.keywords.some(kw => kw.includes(lowerQuery));
      return matchTitle || matchDescription || matchKeywords;
    });

    return { recent: [], results };
  }, [query, recentSearches]);

  const allItems = [...filteredItems.recent, ...filteredItems.results];

  // Save recent search
  const saveRecentSearch = useCallback((id: string) => {
    const updated = [id, ...recentSearches.filter(s => s !== id)].slice(0, MAX_RECENT_SEARCHES);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  }, [recentSearches]);

  // Handle item selection
  const handleSelect = useCallback((item: SearchItem) => {
    saveRecentSearch(item.id);
    onOpenChange(false);
    setLocation(item.path);
  }, [saveRecentSearch, onOpenChange, setLocation]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, allItems.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (allItems[selectedIndex]) {
          handleSelect(allItems[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        onOpenChange(false);
        break;
    }
  }, [allItems, selectedIndex, handleSelect, onOpenChange]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedElement?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const getCategoryBadge = (category: SearchItem["category"]) => {
    switch (category) {
      case "navigation":
        return <Badge variant="secondary" className="text-xs">Page</Badge>;
      case "feature":
        return <Badge variant="outline" className="text-xs">Feature</Badge>;
      case "action":
        return <Badge className="text-xs bg-green-500/20 text-green-500">Action</Badge>;
      case "symbol":
        return <Badge className="text-xs bg-blue-500/20 text-blue-500">Symbol</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center border-b px-4 py-3">
          <Search className="h-5 w-5 text-muted-foreground mr-3" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, symbols, or features..."
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base placeholder:text-muted-foreground/60"
          />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">ESC</kbd>
            <span>to close</span>
          </div>
        </div>

        {/* Results */}
        <ScrollArea className="max-h-[400px]" ref={listRef}>
          <div className="p-2">
            {/* Recent Searches */}
            {filteredItems.recent.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  <History className="h-3 w-3" />
                  Recent
                </div>
                {filteredItems.recent.map((item, index) => (
                  <button
                    key={item.id}
                    data-index={index}
                    onClick={() => handleSelect(item)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      selectedIndex === index
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className={`p-2 rounded-md ${
                      selectedIndex === index ? "bg-primary/20" : "bg-muted"
                    }`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </div>
                    </div>
                    {getCategoryBadge(item.category)}
                    {selectedIndex === index && (
                      <ArrowRight className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Search Results */}
            {filteredItems.results.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  {query ? (
                    <>
                      <Search className="h-3 w-3" />
                      Results
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                      Popular
                    </>
                  )}
                </div>
                {filteredItems.results.map((item, index) => {
                  const actualIndex = filteredItems.recent.length + index;
                  return (
                    <button
                      key={item.id}
                      data-index={actualIndex}
                      onClick={() => handleSelect(item)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        selectedIndex === actualIndex
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className={`p-2 rounded-md ${
                        selectedIndex === actualIndex ? "bg-primary/20" : "bg-muted"
                      }`}>
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {item.description}
                        </div>
                      </div>
                      {getCategoryBadge(item.category)}
                      {selectedIndex === actualIndex && (
                        <ArrowRight className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* No Results */}
            {allItems.length === 0 && query && (
              <div className="py-12 text-center">
                <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No results found for "{query}"</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Try searching for pages, symbols, or features
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground bg-muted/30">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↓</kbd>
              <span>to navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↵</kbd>
              <span>to select</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Command className="h-3 w-3" />
            <span>K to open anytime</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to handle global keyboard shortcut
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { open, setOpen };
}

export default CommandPalette;
