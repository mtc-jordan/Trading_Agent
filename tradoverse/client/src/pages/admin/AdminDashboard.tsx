import { useState } from "react";
import { Link } from "wouter";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  Users,
  Bot,
  TrendingUp,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
  BarChart3,
  Mail,
  CreditCard,
  RefreshCw,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "neutral";
  href?: string;
}

function StatCard({ title, value, change, changeLabel, icon: Icon, trend, href }: StatCardProps) {
  const content = (
    <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-zinc-400">{title}</p>
            <p className="text-3xl font-bold text-white mt-1">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                {trend === "up" ? (
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                ) : trend === "down" ? (
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                ) : null}
                <span
                  className={cn(
                    "text-sm",
                    trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-zinc-400"
                  )}
                >
                  {change > 0 ? "+" : ""}{change}%
                </span>
                {changeLabel && <span className="text-xs text-zinc-500">{changeLabel}</span>}
              </div>
            )}
          </div>
          <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-green-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  variant?: "default" | "warning" | "success";
}

function QuickAction({ title, description, icon: Icon, href, variant = "default" }: QuickActionProps) {
  return (
    <Link href={href}>
      <Card
        className={cn(
          "bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group",
          variant === "warning" && "border-yellow-500/30 hover:border-yellow-500/50",
          variant === "success" && "border-green-500/30 hover:border-green-500/50"
        )}
      >
        <CardContent className="p-4 flex items-center gap-4">
          <div
            className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center",
              variant === "default" && "bg-zinc-800",
              variant === "warning" && "bg-yellow-500/10",
              variant === "success" && "bg-green-500/10"
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5",
                variant === "default" && "text-zinc-400",
                variant === "warning" && "text-yellow-500",
                variant === "success" && "text-green-500"
              )}
            />
          </div>
          <div className="flex-1">
            <p className="font-medium text-white">{title}</p>
            <p className="text-sm text-zinc-400">{description}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
        </CardContent>
      </Card>
    </Link>
  );
}

interface ActivityItemProps {
  type: "user" | "bot" | "payment" | "alert";
  title: string;
  description: string;
  time: string;
}

function ActivityItem({ type, title, description, time }: ActivityItemProps) {
  const icons = {
    user: Users,
    bot: Bot,
    payment: DollarSign,
    alert: AlertTriangle,
  };
  const Icon = icons[type];

  return (
    <div className="flex items-start gap-3 py-3">
      <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-zinc-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-zinc-500 truncate">{description}</p>
      </div>
      <span className="text-xs text-zinc-600 flex-shrink-0">{time}</span>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading, refetch } = trpc.admin.getStats.useQuery();

  // Convert usersByTier array to object for easier access
  const usersByTier = stats?.usersByTier?.reduce((acc, item) => {
    acc[item.tier] = item.count;
    return acc;
  }, {} as Record<string, number>) || {};
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  // Mock recent activity data
  const recentActivity = [
    { type: "user" as const, title: "New user registered", description: "john.doe@example.com", time: "2m ago" },
    { type: "payment" as const, title: "Subscription upgraded", description: "Pro plan - $49/mo", time: "15m ago" },
    { type: "bot" as const, title: "Bot created", description: "AI Momentum Trader", time: "1h ago" },
    { type: "alert" as const, title: "High API usage detected", description: "Rate limit warning", time: "2h ago" },
    { type: "user" as const, title: "User verified email", description: "jane.smith@example.com", time: "3h ago" },
  ];

  // Mock system health data
  const systemHealth = [
    { name: "API Server", status: "healthy", uptime: "99.9%" },
    { name: "Database", status: "healthy", uptime: "99.8%" },
    { name: "WebSocket", status: "healthy", uptime: "99.7%" },
    { name: "Email Service", status: "warning", uptime: "98.5%" },
    { name: "Job Scheduler", status: "healthy", uptime: "99.9%" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-zinc-400">Welcome back! Here's what's happening on TradoVerse.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Users"
            value={stats?.totalUsers?.toLocaleString() || "0"}
            change={12}
            changeLabel="vs last month"
            icon={Users}
            trend="up"
            href="/admin/users"
          />
          <StatCard
            title="Active Bots"
            value={stats?.totalBots?.toLocaleString() || "0"}
            change={8}
            changeLabel="vs last month"
            icon={Bot}
            trend="up"
            href="/admin/bots"
          />
          <StatCard
            title="Monthly Revenue"
            value={`$${(0).toLocaleString()}`}
            change={15}
            changeLabel="vs last month"
            icon={DollarSign}
            trend="up"
            href="/admin/subscriptions"
          />
          <StatCard
            title="AI Analyses"
            value={stats?.totalBacktests?.toLocaleString() || "0"}
            change={23}
            changeLabel="vs last month"
            icon={Zap}
            trend="up"
            href="/admin/analytics"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Free Users</p>
                  <p className="text-xl font-bold text-white">{usersByTier.free || 0}</p>
                </div>
                <Badge variant="outline" className="border-zinc-600 text-zinc-400">Free</Badge>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Starter Users</p>
                  <p className="text-xl font-bold text-white">{usersByTier.starter || 0}</p>
                </div>
                <Badge variant="outline" className="border-blue-500 text-blue-500">Starter</Badge>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Pro Users</p>
                  <p className="text-xl font-bold text-white">{usersByTier.pro || 0}</p>
                </div>
                <Badge variant="outline" className="border-purple-500 text-purple-500">Pro</Badge>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Elite Users</p>
                  <p className="text-xl font-bold text-white">{usersByTier.elite || 0}</p>
                </div>
                <Badge variant="outline" className="border-green-500 text-green-500">Elite</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <QuickAction
                title="Manage Users"
                description="View and manage platform users"
                icon={Users}
                href="/admin/users"
              />
              <QuickAction
                title="View Subscriptions"
                description="Manage subscription plans"
                icon={CreditCard}
                href="/admin/subscriptions"
              />
              <QuickAction
                title="Email Settings"
                description="Configure email delivery"
                icon={Mail}
                href="/admin/email"
                variant="warning"
              />
              <QuickAction
                title="Job Monitor"
                description="View scheduled jobs"
                icon={Clock}
                href="/admin/jobs"
              />
              <QuickAction
                title="Platform Analytics"
                description="View detailed analytics"
                icon={BarChart3}
                href="/admin/analytics"
                variant="success"
              />
              <QuickAction
                title="Bot Management"
                description="Manage trading bots"
                icon={Bot}
                href="/admin/bots"
              />
            </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
              <Button variant="ghost" size="sm" asChild className="text-zinc-400 hover:text-white">
                <Link href="/admin/activity">View all</Link>
              </Button>
            </div>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4 divide-y divide-zinc-800">
                {recentActivity.map((activity, index) => (
                  <ActivityItem key={index} {...activity} />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* System Health & Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Health */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">System Health</CardTitle>
              <CardDescription>Current status of platform services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {systemHealth.map((service) => (
                <div key={service.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {service.status === "healthy" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : service.status === "warning" ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="text-white">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-zinc-400">{service.uptime}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        service.status === "healthy" && "border-green-500 text-green-500",
                        service.status === "warning" && "border-yellow-500 text-yellow-500",
                        service.status === "error" && "border-red-500 text-red-500"
                      )}
                    >
                      {service.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Usage Overview */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Resource Usage</CardTitle>
              <CardDescription>Platform resource utilization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">API Requests (Today)</span>
                  <span className="text-white">45,231 / 100,000</span>
                </div>
                <Progress value={45} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Database Storage</span>
                  <span className="text-white">2.4 GB / 10 GB</span>
                </div>
                <Progress value={24} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Email Quota (Daily)</span>
                  <span className="text-white">523 / 1,000</span>
                </div>
                <Progress value={52} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">WebSocket Connections</span>
                  <span className="text-white">128 / 500</span>
                </div>
                <Progress value={26} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
