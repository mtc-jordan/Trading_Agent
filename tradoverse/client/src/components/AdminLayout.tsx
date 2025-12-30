import { useState, useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Bot,
  BarChart3,
  Mail,
  Clock,
  Settings,
  Shield,
  LogOut,
  ChevronLeft,
  Menu,
  Bell,
  Search,
  Activity,
  Database,
  FileText,
  AlertTriangle,
  TrendingUp,
  Store,
  MessageSquare,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  description?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout, loading: isLoading } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Redirect non-admin users
  useEffect(() => {
    if (!isLoading && user && user.role !== "admin") {
      window.location.href = "/dashboard";
    }
  }, [user, isLoading]);

  const navSections: NavSection[] = [
    {
      title: "Overview",
      items: [
        {
          title: "Dashboard",
          href: "/admin",
          icon: LayoutDashboard,
          description: "Platform overview and KPIs",
        },
        {
          title: "Analytics",
          href: "/admin/analytics",
          icon: BarChart3,
          description: "Detailed platform analytics",
        },
        {
          title: "Activity Log",
          href: "/admin/activity",
          icon: Activity,
          description: "Recent platform activity",
        },
      ],
    },
    {
      title: "User Management",
      items: [
        {
          title: "Users",
          href: "/admin/users",
          icon: Users,
          description: "Manage platform users",
        },
        {
          title: "Subscriptions",
          href: "/admin/subscriptions",
          icon: CreditCard,
          description: "Subscription management",
        },
      ],
    },
    {
      title: "Platform",
      items: [
        {
          title: "Bots & Marketplace",
          href: "/admin/bots",
          icon: Bot,
          description: "Manage trading bots",
        },
        {
          title: "AI Agents",
          href: "/admin/agents",
          icon: Zap,
          description: "AI agent configuration",
        },
        {
          title: "Marketplace",
          href: "/admin/marketplace",
          icon: Store,
          description: "Marketplace listings",
        },
      ],
    },
    {
      title: "System",
      items: [
        {
          title: "Email Settings",
          href: "/admin/email",
          icon: Mail,
          description: "Email configuration",
        },
        {
          title: "Job Monitor",
          href: "/admin/jobs",
          icon: Clock,
          description: "Scheduled jobs",
        },
        {
          title: "Database",
          href: "/admin/database",
          icon: Database,
          description: "Database management",
        },
        {
          title: "Logs",
          href: "/admin/logs",
          icon: FileText,
          description: "System logs",
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          title: "Support Tickets",
          href: "/admin/support",
          icon: MessageSquare,
          description: "User support requests",
        },
        {
          title: "Alerts",
          href: "/admin/alerts",
          icon: AlertTriangle,
          description: "System alerts",
        },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === "/admin") {
      return location === "/admin";
    }
    return location.startsWith(href);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="mx-auto h-16 w-16 text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access the admin panel.
          </p>
          <Button asChild>
            <Link href="/dashboard">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-zinc-950">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-zinc-800 bg-zinc-900 transition-all duration-300",
            sidebarOpen ? "w-64" : "w-16",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          )}
        >
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-zinc-800">
            {sidebarOpen ? (
              <Link href="/admin" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="font-bold text-white">TradoVerse</span>
                  <Badge variant="outline" className="ml-2 text-xs border-green-500 text-green-500">
                    Admin
                  </Badge>
                </div>
              </Link>
            ) : (
              <Link href="/admin" className="mx-auto">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500">
                  <Shield className="h-5 w-5 text-white" />
                </div>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex text-zinc-400 hover:text-white"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <ChevronLeft className={cn("h-4 w-4 transition-transform", !sidebarOpen && "rotate-180")} />
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-4">
            <nav className="space-y-6 px-2">
              {navSections.map((section) => (
                <div key={section.title}>
                  {sidebarOpen && (
                    <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      {section.title}
                    </h3>
                  )}
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);

                      if (!sidebarOpen) {
                        return (
                          <Tooltip key={item.href} delayDuration={0}>
                            <TooltipTrigger asChild>
                              <Link href={item.href}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    "w-full justify-center",
                                    active
                                      ? "bg-green-500/10 text-green-500"
                                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                                  )}
                                >
                                  <Icon className="h-5 w-5" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="bg-zinc-800 border-zinc-700">
                              <p className="font-medium">{item.title}</p>
                              {item.description && (
                                <p className="text-xs text-zinc-400">{item.description}</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        );
                      }

                      return (
                        <Link key={item.href} href={item.href}>
                          <Button
                            variant="ghost"
                            className={cn(
                              "w-full justify-start gap-3",
                              active
                                ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                            )}
                          >
                            <Icon className="h-5 w-5" />
                            <span>{item.title}</span>
                            {item.badge && (
                              <Badge
                                variant="secondary"
                                className="ml-auto bg-green-500/20 text-green-500"
                              >
                                {item.badge}
                              </Badge>
                            )}
                          </Button>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </ScrollArea>

          {/* User Section */}
          <div className="border-t border-zinc-800 p-4">
            {sidebarOpen ? (
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={undefined} />
                  <AvatarFallback className="bg-green-500 text-white">
                    {user.name?.charAt(0) || "A"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.name}</p>
                  <p className="text-xs text-zinc-500 truncate">Administrator</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-zinc-800">
                    <DropdownMenuLabel className="text-zinc-400">My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuItem asChild className="text-zinc-300 focus:bg-zinc-800 focus:text-white">
                      <Link href="/dashboard">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        User Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="text-zinc-300 focus:bg-zinc-800 focus:text-white">
                      <Link href="/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuItem
                      onClick={() => logout()}
                      className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Avatar className="h-9 w-9 mx-auto cursor-pointer">
                    <AvatarImage src={undefined} />
                    <AvatarFallback className="bg-green-500 text-white">
                      {user.name?.charAt(0) || "A"}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-zinc-800 border-zinc-700">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-zinc-400">Administrator</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Main Content */}
        <main
          className={cn(
            "flex-1 transition-all duration-300",
            sidebarOpen ? "md:ml-64" : "md:ml-16"
          )}
        >
          {/* Top Header */}
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur px-4 md:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-zinc-400"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  placeholder="Search users, bots, logs..."
                  className="pl-9 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-green-500"
                />
              </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
              </Button>
              <Separator orientation="vertical" className="h-6 bg-zinc-700" />
              <Button variant="outline" size="sm" asChild className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  User View
                </Link>
              </Button>
            </div>
          </header>

          {/* Page Content */}
          <div className="p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

export default AdminLayout;
