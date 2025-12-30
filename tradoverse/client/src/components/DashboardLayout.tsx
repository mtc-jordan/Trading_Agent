import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { 
  LayoutDashboard, LogOut, PanelLeft, Brain, Bot, LineChart, Briefcase, 
  Store, Settings, Shield, History, Target, Bell, MessageSquare, User, 
  Clock, Activity, Sparkles, Bitcoin, Wallet, BellRing, Copy, BookOpen, 
  Building2, TrendingUp, Scale, Trophy, MessagesSquare, Layers, 
  AlertTriangle, ChevronRight, Zap, BarChart3, Link2, Users, Star,
  StarOff, GripVertical, Search, Command, Menu, X, PieChart
} from "lucide-react";
import { BrokerSelector } from "./BrokerSelector";
import { BrokerBadge } from "./BrokerBadge";
import { CSSProperties, useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { CommandPalette, useCommandPalette } from "./CommandPalette";
import { useSidebarFavorites, FavoriteItem } from "@/hooks/useSidebarFavorites";
import { useMobileSidebar } from "@/hooks/useMobileSidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Icon mapping for favorites
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Brain,
  PieChart,
  Bell,
  User,
  History,
  Target,
  MessageSquare,
  Trophy,
  MessagesSquare,
  Wallet,
  Bitcoin,
  Copy,
  BellRing,
  BookOpen,
  Sparkles,
  LineChart,
  AlertTriangle,
  Briefcase,
  Scale,
  Shield,
  Layers,
  Bot,
  Clock,
  Store,
  Building2,
  Link2,
  BarChart3,
  Settings,
  Users,
};

// Navigation structure with collapsible groups
interface NavItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  iconName: string;
  label: string;
  path: string;
  badge?: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  defaultOpen?: boolean;
}

const navigationGroups: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { id: "dashboard", icon: LayoutDashboard, iconName: "LayoutDashboard", label: "Dashboard", path: "/dashboard" },
      { id: "notifications", icon: Bell, iconName: "Bell", label: "Notifications", path: "/notifications" },
      { id: "profile", icon: User, iconName: "User", label: "Profile", path: "/profile" },
    ],
  },
  {
    id: "ai-analysis",
    label: "AI Analysis",
    icon: Brain,
    defaultOpen: true,
    items: [
      { id: "analysis", icon: Brain, iconName: "Brain", label: "AI Analysis", path: "/analysis" },
      { id: "analysis-history", icon: History, iconName: "History", label: "Analysis History", path: "/analysis-history" },
      { id: "accuracy", icon: Target, iconName: "Target", label: "Accuracy", path: "/accuracy" },
      { id: "social-sentiment", icon: MessageSquare, iconName: "MessageSquare", label: "Social Sentiment", path: "/social-sentiment" },
      { id: "agent-leaderboard", icon: Trophy, iconName: "Trophy", label: "Agent Leaderboard", path: "/agent-leaderboard" },
      { id: "agent-hub", icon: MessagesSquare, iconName: "MessagesSquare", label: "Agent Hub", path: "/agent-hub" },
    ],
  },
  {
    id: "trading",
    label: "Trading",
    icon: TrendingUp,
    defaultOpen: true,
    items: [
      { id: "paper-trading", icon: Wallet, iconName: "Wallet", label: "Paper Trading", path: "/paper-trading" },
      { id: "crypto", icon: Bitcoin, iconName: "Bitcoin", label: "Crypto Trading", path: "/crypto" },
      { id: "copy-trading", icon: Copy, iconName: "Copy", label: "Copy Trading", path: "/copy-trading" },
      { id: "alerts", icon: BellRing, iconName: "BellRing", label: "Alerts", path: "/alerts" },
      { id: "watchlist-alerts", icon: Bell, iconName: "Bell", label: "Watchlist Alerts", path: "/watchlist-alerts" },
      { id: "journal", icon: BookOpen, iconName: "BookOpen", label: "Trading Journal", path: "/journal" },
    ],
  },
  {
    id: "strategies",
    label: "Strategies",
    icon: Sparkles,
    items: [
      { id: "strategy-generator", icon: Sparkles, iconName: "Sparkles", label: "Strategy Generator", path: "/strategy-generator" },
      { id: "backtest", icon: LineChart, iconName: "LineChart", label: "Backtester", path: "/backtest" },
      { id: "strategy-alerts", icon: AlertTriangle, iconName: "AlertTriangle", label: "Strategy Alerts", path: "/strategy-alerts" },
      { id: "template-performance", icon: Trophy, iconName: "Trophy", label: "Template Rankings", path: "/template-performance" },
    ],
  },
  {
    id: "portfolio",
    label: "Portfolio",
    icon: Briefcase,
    items: [
      { id: "portfolio", icon: PieChart, iconName: "PieChart", label: "Overview", path: "/portfolio" },
      { id: "rebalancing", icon: Scale, iconName: "Scale", label: "Rebalancing", path: "/rebalancing" },
      { id: "stress-testing", icon: Shield, iconName: "Shield", label: "Stress Testing", path: "/stress-testing" },
      { id: "correlation-engine", icon: Layers, iconName: "Layers", label: "Correlation", path: "/correlation-engine" },
    ],
  },
  {
    id: "bots",
    label: "Trading Bots",
    icon: Bot,
    items: [
      { id: "bots", icon: Bot, iconName: "Bot", label: "My Bots", path: "/bots" },
      { id: "schedules", icon: Clock, iconName: "Clock", label: "Schedules", path: "/schedules" },
      { id: "marketplace", icon: Store, iconName: "Store", label: "Marketplace", path: "/marketplace" },
    ],
  },
  {
    id: "connections",
    label: "Connections",
    icon: Link2,
    items: [
      { id: "brokers", icon: Building2, iconName: "Building2", label: "Brokers", path: "/brokers" },
      { id: "order-history", icon: History, iconName: "History", label: "Order History", path: "/order-history" },
      { id: "broker-analytics", icon: BarChart3, iconName: "BarChart3", label: "Analytics", path: "/broker-analytics" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    items: [
      { id: "settings", icon: Settings, iconName: "Settings", label: "Settings", path: "/settings" },
      { id: "community", icon: Users, iconName: "Users", label: "Community", path: "/community" },
    ],
  },
];

const adminMenuItems = [
  { id: "admin-dashboard", icon: Shield, iconName: "Shield", label: "Admin Dashboard", path: "/admin/dashboard" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const SIDEBAR_GROUPS_KEY = "sidebar-groups";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication. Continue to launch the login flow.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  // Command Palette
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette();
  
  // Sidebar Favorites
  const { 
    favorites, 
    toggleFavorite, 
    isFavorite, 
    moveFavoriteUp, 
    moveFavoriteDown 
  } = useSidebarFavorites();
  
  // Mobile Sidebar
  const { 
    isOpen: mobileMenuOpen, 
    isMobile: isMobileDevice, 
    toggle: toggleMobileMenu, 
    close: closeMobileMenu 
  } = useMobileSidebar();
  
  // Track open groups
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem(SIDEBAR_GROUPS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    // Default: open groups that have defaultOpen or contain active item
    const defaults: Record<string, boolean> = {};
    navigationGroups.forEach(group => {
      const hasActiveItem = group.items.some(item => item.path === location);
      defaults[group.id] = group.defaultOpen || hasActiveItem;
    });
    return defaults;
  });

  // Save open groups to localStorage
  useEffect(() => {
    localStorage.setItem(SIDEBAR_GROUPS_KEY, JSON.stringify(openGroups));
  }, [openGroups]);

  // Find active menu item for header display
  const activeMenuItem = navigationGroups
    .flatMap(g => g.items)
    .find(item => item.path === location);

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Handle favorite toggle
  const handleToggleFavorite = useCallback((item: NavItem) => {
    const favoriteItem: FavoriteItem = {
      id: item.id,
      path: item.path,
      title: item.label,
      icon: item.iconName,
    };
    toggleFavorite(favoriteItem);
  }, [toggleFavorite]);

  // Navigate and close mobile menu
  const handleNavigate = useCallback((path: string) => {
    setLocation(path);
    if (isMobileDevice) {
      closeMobileMenu();
    }
  }, [setLocation, isMobileDevice, closeMobileMenu]);

  // Render sidebar content (shared between desktop and mobile)
  const renderSidebarContent = () => (
    <>
      {/* Favorites Section */}
      {favorites.length > 0 && !isCollapsed && (
        <div className="mb-2 pb-2 border-b border-border/50">
          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Star className="h-3 w-3 text-yellow-500" />
            Favorites
          </div>
          <SidebarMenu>
            {favorites.map((fav, index) => {
              const IconComponent = iconMap[fav.icon] || LayoutDashboard;
              const isActive = location === fav.path;
              return (
                <SidebarMenuItem key={fav.id} className="group/fav">
                  <div className="flex items-center">
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => handleNavigate(fav.path)}
                      tooltip={fav.title}
                      className="h-9 transition-all font-normal flex-1"
                    >
                      <IconComponent
                        className={cn(
                          "h-4 w-4",
                          isActive && "text-primary"
                        )}
                      />
                      <span>{fav.title}</span>
                    </SidebarMenuButton>
                    <div className="opacity-0 group-hover/fav:opacity-100 flex items-center gap-0.5 pr-1 transition-opacity">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => moveFavoriteUp(index)}
                              className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                              disabled={index === 0}
                            >
                              <ChevronRight className="h-3 w-3 -rotate-90" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">Move up</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => moveFavoriteDown(index)}
                              className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                              disabled={index === favorites.length - 1}
                            >
                              <ChevronRight className="h-3 w-3 rotate-90" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">Move down</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => toggleFavorite(fav)}
                              className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-destructive"
                            >
                              <StarOff className="h-3 w-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">Remove from favorites</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </div>
      )}

      {/* Navigation Groups */}
      {navigationGroups.map((group) => {
        const isOpen = openGroups[group.id] ?? false;
        const hasActiveItem = group.items.some(item => item.path === location);
        
        return (
          <Collapsible
            key={group.id}
            open={isCollapsed ? false : isOpen}
            onOpenChange={() => !isCollapsed && toggleGroup(group.id)}
            className="group/collapsible"
          >
            <SidebarMenu>
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={group.label}
                    className={cn(
                      "h-10 font-medium transition-all",
                      hasActiveItem && "text-primary"
                    )}
                  >
                    <group.icon className={cn(
                      "h-4 w-4",
                      hasActiveItem && "text-primary"
                    )} />
                    <span className="flex-1">{group.label}</span>
                    {!isCollapsed && (
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isOpen && "rotate-90"
                      )} />
                    )}
                  </SidebarMenuButton>
                </CollapsibleTrigger>
              </SidebarMenuItem>
            </SidebarMenu>
            
            <CollapsibleContent className="pl-4">
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = location === item.path;
                  const isFav = isFavorite(item.id);
                  return (
                    <SidebarMenuItem key={item.path} className="group/item">
                      <div className="flex items-center">
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => handleNavigate(item.path)}
                          tooltip={item.label}
                          className="h-9 transition-all font-normal flex-1"
                        >
                          <item.icon
                            className={cn(
                              "h-4 w-4",
                              isActive && "text-primary"
                            )}
                          />
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="ml-auto text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              {item.badge}
                            </span>
                          )}
                        </SidebarMenuButton>
                        {!isCollapsed && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleFavorite(item);
                                  }}
                                  className={cn(
                                    "p-1 rounded transition-all mr-1",
                                    isFav 
                                      ? "text-yellow-500 opacity-100" 
                                      : "text-muted-foreground opacity-0 group-hover/item:opacity-100 hover:text-yellow-500"
                                  )}
                                >
                                  <Star className={cn("h-3 w-3", isFav && "fill-current")} />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="text-xs">
                                {isFav ? "Remove from favorites" : "Add to favorites"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      {/* Admin Menu - only visible to admins */}
      {user?.role === "admin" && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <SidebarMenu>
            <SidebarMenuItem>
              <div className={cn(
                "px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                isCollapsed && "sr-only"
              )}>
                Admin
              </div>
            </SidebarMenuItem>
            {adminMenuItems.map((item) => {
              const isActive = location === item.path;
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={isActive}
                    onClick={() => handleNavigate(item.path)}
                    tooltip={item.label}
                    className="h-10 transition-all font-normal"
                  >
                    <item.icon
                      className={cn(
                        "h-4 w-4",
                        isActive && "text-primary"
                      )}
                    />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Command Palette */}
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />

      {/* Mobile Overlay */}
      {isMobileDevice && mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile Sidebar */}
      {isMobileDevice && (
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r transform transition-transform duration-300 ease-in-out md:hidden",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex flex-col h-full">
            {/* Mobile Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <span className="font-semibold tracking-tight text-primary">TradoVerse</span>
              </div>
              <button
                onClick={closeMobileMenu}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mobile Search Button */}
            <div className="p-3 border-b">
              <button
                onClick={() => {
                  closeMobileMenu();
                  setCommandPaletteOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-lg transition-colors"
              >
                <Search className="h-4 w-4" />
                <span>Search...</span>
                <kbd className="ml-auto text-xs bg-background px-1.5 py-0.5 rounded">⌘K</kbd>
              </button>
            </div>

            {/* Mobile Navigation */}
            <div className="flex-1 overflow-y-auto p-2">
              {renderSidebarContent()}
            </div>

            {/* Mobile Footer */}
            <div className="border-t p-3">
              <div className="flex items-center gap-3 p-2">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                    {user?.name?.slice(0, 2).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
                </div>
                <button
                  onClick={() => logout()}
                  className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="relative hidden md:block" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <Zap className="h-5 w-5 text-primary shrink-0" />
                  <span className="font-semibold tracking-tight truncate text-primary">
                    TradoVerse
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          {/* Search Button */}
          {!isCollapsed && (
            <div className="px-3 pb-2">
              <button
                onClick={() => setCommandPaletteOpen(true)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-lg transition-colors"
              >
                <Search className="h-4 w-4" />
                <span>Search...</span>
                <div className="ml-auto flex items-center gap-0.5 text-xs">
                  <kbd className="px-1.5 py-0.5 bg-background rounded text-[10px] font-mono">⌘</kbd>
                  <kbd className="px-1.5 py-0.5 bg-background rounded text-[10px] font-mono">K</kbd>
                </div>
              </button>
            </div>
          )}

          <SidebarContent className="gap-0 px-2">
            {renderSidebarContent()}
          </SidebarContent>

          <SidebarFooter className="border-t border-border/50">
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      size="lg"
                      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    >
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                          {user?.name?.slice(0, 2).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">
                          {user?.name || "User"}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {user?.email || ""}
                        </span>
                      </div>
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                    side="bottom"
                    align="end"
                    sideOffset={4}
                  >
                    <DropdownMenuItem onClick={() => handleNavigate("/profile")}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleNavigate("/settings")}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => logout()}
                      className="text-destructive focus:text-destructive"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        {!isCollapsed && !isMobile && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors z-10"
            onMouseDown={() => setIsResizing(true)}
          />
        )}
      </div>

      <SidebarInset className="flex flex-col">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <div className="flex items-center gap-2 flex-1">
            {/* Mobile hamburger menu */}
            <button
              onClick={toggleMobileMenu}
              className="p-2 hover:bg-accent rounded-lg transition-colors md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <SidebarTrigger className="-ml-1 hidden md:flex" />
            <div className="flex items-center gap-2">
              {activeMenuItem && (
                <>
                  <activeMenuItem.icon className="h-5 w-5 text-muted-foreground" />
                  <h1 className="text-lg font-semibold">{activeMenuItem.label}</h1>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Search button for mobile */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="p-2 hover:bg-accent rounded-lg transition-colors md:hidden"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>
            {/* BrokerSelector temporarily disabled to fix infinite loop */}
            {/* <BrokerSelector /> */}
            {/* <BrokerBadge /> */}
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </>
  );
}
