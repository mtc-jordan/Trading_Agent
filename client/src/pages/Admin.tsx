import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { 
  Users, 
  Bot, 
  DollarSign, 
  Activity,
  Shield,
  TrendingUp,
  BarChart3,
  Search,
  Filter,
  MoreHorizontal,
  UserCog,
  Mail,
  Calendar,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  RefreshCw,
  Settings,
  Bell,
  FileText,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Ban,
  Unlock,
  Crown,
  Zap,
  Globe,
  Server,
  Database,
  HardDrive,
  Cpu,
  MemoryStick,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  LayoutDashboard,
  Store,
  MessageSquare,
  Ticket,
  History,
  PieChart,
  LineChart,
  Target,
  Award
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

// Types
interface User {
  id: number;
  name: string | null;
  email: string | null;
  role: "user" | "admin";
  subscriptionTier: string;
  status?: "active" | "suspended" | "pending";
  createdAt: string;
  lastSignedIn: string;
  totalBots?: number;
  totalTrades?: number;
}

interface ActivityLog {
  id: number;
  userId: number;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
  type: "user" | "system" | "security" | "payment";
}

interface SupportTicket {
  id: number;
  userId: number;
  userName: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  createdAt: string;
  lastUpdated: string;
}

// Mock data for demonstration
const mockActivityLogs: ActivityLog[] = [
  { id: 1, userId: 1, userName: "John Doe", action: "User Login", details: "Logged in from Chrome on Windows", timestamp: new Date().toISOString(), type: "user" },
  { id: 2, userId: 2, userName: "Jane Smith", action: "Subscription Upgraded", details: "Upgraded from Starter to Pro", timestamp: new Date(Date.now() - 3600000).toISOString(), type: "payment" },
  { id: 3, userId: 3, userName: "System", action: "Backup Completed", details: "Daily database backup successful", timestamp: new Date(Date.now() - 7200000).toISOString(), type: "system" },
  { id: 4, userId: 4, userName: "Mike Johnson", action: "Bot Created", details: "Created new trading bot 'Alpha Trader'", timestamp: new Date(Date.now() - 10800000).toISOString(), type: "user" },
  { id: 5, userId: 5, userName: "Security", action: "Failed Login Attempt", details: "3 failed login attempts from IP 192.168.1.1", timestamp: new Date(Date.now() - 14400000).toISOString(), type: "security" },
];

const mockSupportTickets: SupportTicket[] = [
  { id: 1, userId: 1, userName: "John Doe", subject: "Cannot connect trading account", status: "open", priority: "high", createdAt: new Date().toISOString(), lastUpdated: new Date().toISOString() },
  { id: 2, userId: 2, userName: "Jane Smith", subject: "Billing question", status: "in_progress", priority: "medium", createdAt: new Date(Date.now() - 86400000).toISOString(), lastUpdated: new Date(Date.now() - 3600000).toISOString() },
  { id: 3, userId: 3, userName: "Mike Johnson", subject: "Feature request: Dark mode", status: "resolved", priority: "low", createdAt: new Date(Date.now() - 172800000).toISOString(), lastUpdated: new Date(Date.now() - 86400000).toISOString() },
];

const revenueData = [
  { month: "Jul", mrr: 12400, users: 156 },
  { month: "Aug", mrr: 15800, users: 198 },
  { month: "Sep", mrr: 19200, users: 245 },
  { month: "Oct", mrr: 24500, users: 312 },
  { month: "Nov", mrr: 31200, users: 398 },
  { month: "Dec", mrr: 38900, users: 487 },
];

const userGrowthData = [
  { date: "Mon", newUsers: 12, activeUsers: 245 },
  { date: "Tue", newUsers: 19, activeUsers: 267 },
  { date: "Wed", newUsers: 15, activeUsers: 289 },
  { date: "Thu", newUsers: 22, activeUsers: 312 },
  { date: "Fri", newUsers: 28, activeUsers: 345 },
  { date: "Sat", newUsers: 8, activeUsers: 298 },
  { date: "Sun", newUsers: 5, activeUsers: 276 },
];

const COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#6b7280'];

export default function Admin() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Redirect non-admins
  if (!loading && user?.role !== "admin") {
    setLocation("/dashboard");
    return null;
  }

  const { data: stats, refetch: refetchStats } = trpc.admin.getStats.useQuery(undefined, {
    enabled: user?.role === "admin",
  }) as { data: any; refetch: () => void };

  const { data: users, refetch: refetchUsers } = trpc.admin.getUsers.useQuery({ limit: 100 }, {
    enabled: user?.role === "admin",
  }) as { data: User[] | undefined; refetch: () => void };

  // Filter users
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u: User) => {
      const matchesSearch = 
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTier = filterTier === "all" || u.subscriptionTier === filterTier;
      const matchesStatus = filterStatus === "all" || u.status === filterStatus;
      return matchesSearch && matchesTier && matchesStatus;
    });
  }, [users, searchQuery, filterTier, filterStatus]);

  // Calculate stats
  const totalMRR = useMemo(() => {
    if (!stats?.subscriptionBreakdown) return 0;
    return (
      (stats.subscriptionBreakdown.starter || 0) * 29 +
      (stats.subscriptionBreakdown.pro || 0) * 79 +
      (stats.subscriptionBreakdown.elite || 0) * 199
    );
  }, [stats]);

  const subscriptionData = useMemo(() => {
    if (!stats?.subscriptionBreakdown) return [];
    return [
      { name: "Free", value: stats.subscriptionBreakdown.free || 0 },
      { name: "Starter", value: stats.subscriptionBreakdown.starter || 0 },
      { name: "Pro", value: stats.subscriptionBreakdown.pro || 0 },
      { name: "Elite", value: stats.subscriptionBreakdown.elite || 0 },
    ];
  }, [stats]);

  const handleUserAction = (action: string, userId: number) => {
    switch (action) {
      case "suspend":
        toast.success("User suspended successfully");
        break;
      case "activate":
        toast.success("User activated successfully");
        break;
      case "delete":
        toast.success("User deleted successfully");
        break;
      case "upgrade":
        toast.success("User upgraded successfully");
        break;
      default:
        break;
    }
    refetchUsers();
  };

  const handleExportData = (type: string) => {
    toast.success(`Exporting ${type} data...`);
    // In production, this would trigger a download
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground text-sm">
                Platform management and analytics
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { refetchStats(); refetchUsers(); }}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExportData("users")}>
                  <Users className="w-4 h-4 mr-2" />
                  Export Users (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportData("revenue")}>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Export Revenue (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportData("report")}>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Report (PDF)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-card to-card/50 border-border hover:border-primary/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-5 h-5 text-blue-400" />
                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/20">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  12%
                </Badge>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats?.totalUsers || 0}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-card/50 border-border hover:border-primary/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/20">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  24%
                </Badge>
              </div>
              <p className="text-2xl font-bold text-foreground">${totalMRR.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Monthly Revenue</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-card/50 border-border hover:border-primary/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Bot className="w-5 h-5 text-purple-400" />
                <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  8%
                </Badge>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats?.activeBots || 0}</p>
              <p className="text-xs text-muted-foreground">Active Bots</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-card/50 border-border hover:border-primary/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-5 h-5 text-orange-400" />
                <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-400 border-orange-500/20">
                  Live
                </Badge>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats?.tradesToday || 0}</p>
              <p className="text-xs text-muted-foreground">Trades Today</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-card/50 border-border hover:border-primary/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Store className="w-5 h-5 text-cyan-400" />
                <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  15%
                </Badge>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats?.marketplaceListings || 0}</p>
              <p className="text-xs text-muted-foreground">Marketplace</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-card/50 border-border hover:border-primary/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Ticket className="w-5 h-5 text-red-400" />
                <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/20">
                  3 Open
                </Badge>
              </div>
              <p className="text-2xl font-bold text-foreground">{mockSupportTickets.filter(t => t.status === "open").length}</p>
              <p className="text-xs text-muted-foreground">Support Tickets</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-secondary/50 p-1 flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CreditCard className="w-4 h-4 mr-2" />
              Subscriptions
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Store className="w-4 h-4 mr-2" />
              Marketplace
            </TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <History className="w-4 h-4 mr-2" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="support" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <MessageSquare className="w-4 h-4 mr-2" />
              Support
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Revenue Chart */}
              <Card className="lg:col-span-2 bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Revenue Growth
                  </CardTitle>
                  <CardDescription>Monthly recurring revenue over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueData}>
                        <defs>
                          <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="month" stroke="#666" />
                        <YAxis stroke="#666" tickFormatter={(value) => `$${value / 1000}k`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                          formatter={(value: number) => [`$${value.toLocaleString()}`, 'MRR']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="mrr" 
                          stroke="#22c55e" 
                          fillOpacity={1} 
                          fill="url(#colorMrr)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Subscription Distribution */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-primary" />
                    Subscription Tiers
                  </CardTitle>
                  <CardDescription>Distribution by plan</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={subscriptionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {subscriptionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                        />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions & Recent Activity */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Quick Actions</CardTitle>
                  <CardDescription>Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={() => setActiveTab("users")}>
                    <UserPlus className="w-5 h-5 text-blue-400" />
                    <span className="text-xs">Add User</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={() => handleExportData("report")}>
                    <FileText className="w-5 h-5 text-green-400" />
                    <span className="text-xs">Generate Report</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={() => setActiveTab("support")}>
                    <MessageSquare className="w-5 h-5 text-orange-400" />
                    <span className="text-xs">View Tickets</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={() => setActiveTab("settings")}>
                    <Settings className="w-5 h-5 text-purple-400" />
                    <span className="text-xs">Settings</span>
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground">Recent Activity</CardTitle>
                    <CardDescription>Latest platform events</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("activity")}>
                    View All
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-3">
                      {mockActivityLogs.slice(0, 5).map((log) => (
                        <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            log.type === "user" ? "bg-blue-500/20" :
                            log.type === "payment" ? "bg-green-500/20" :
                            log.type === "security" ? "bg-red-500/20" :
                            "bg-gray-500/20"
                          }`}>
                            {log.type === "user" && <Users className="w-4 h-4 text-blue-400" />}
                            {log.type === "payment" && <DollarSign className="w-4 h-4 text-green-400" />}
                            {log.type === "security" && <Shield className="w-4 h-4 text-red-400" />}
                            {log.type === "system" && <Server className="w-4 h-4 text-gray-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{log.action}</p>
                            <p className="text-xs text-muted-foreground truncate">{log.details}</p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle className="text-foreground">User Management</CardTitle>
                    <CardDescription>View, search, and manage all platform users</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        className="pl-9 w-[200px] bg-secondary/50"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <Select value={filterTier} onValueChange={setFilterTier}>
                      <SelectTrigger className="w-[130px] bg-secondary/50">
                        <SelectValue placeholder="All Tiers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tiers</SelectItem>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="elite">Elite</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon">
                      <Filter className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-secondary/50">
                        <tr>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">User</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Subscription</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Role</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Joined</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Last Active</th>
                          <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map((u: User) => (
                            <tr key={u.id} className="border-t border-border hover:bg-secondary/30 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                                    <span className="text-primary font-medium">
                                      {u.name?.charAt(0) || u.email?.charAt(0) || "U"}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-foreground">{u.name || "Unknown"}</p>
                                    <p className="text-sm text-muted-foreground">{u.email || "No email"}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <Badge className={`${
                                  u.subscriptionTier === "elite" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" :
                                  u.subscriptionTier === "pro" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                                  u.subscriptionTier === "starter" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                                  "bg-gray-500/20 text-gray-400 border-gray-500/30"
                                }`}>
                                  {u.subscriptionTier === "elite" && <Crown className="w-3 h-3 mr-1" />}
                                  {u.subscriptionTier === "pro" && <Zap className="w-3 h-3 mr-1" />}
                                  {u.subscriptionTier || "free"}
                                </Badge>
                              </td>
                              <td className="p-4">
                                <Badge variant={u.role === "admin" ? "destructive" : "secondary"}>
                                  {u.role === "admin" && <Shield className="w-3 h-3 mr-1" />}
                                  {u.role}
                                </Badge>
                              </td>
                              <td className="p-4">
                                <Badge variant="outline" className={`${
                                  u.status === "suspended" ? "bg-red-500/10 text-red-400 border-red-500/30" :
                                  u.status === "pending" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" :
                                  "bg-green-500/10 text-green-400 border-green-500/30"
                                }`}>
                                  {u.status === "suspended" ? <XCircle className="w-3 h-3 mr-1" /> :
                                   u.status === "pending" ? <Clock className="w-3 h-3 mr-1" /> :
                                   <CheckCircle className="w-3 h-3 mr-1" />}
                                  {u.status || "active"}
                                </Badge>
                              </td>
                              <td className="p-4 text-sm text-muted-foreground">
                                {new Date(u.createdAt).toLocaleDateString()}
                              </td>
                              <td className="p-4 text-sm text-muted-foreground">
                                {new Date(u.lastSignedIn).toLocaleDateString()}
                              </td>
                              <td className="p-4 text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => { setSelectedUser(u); setIsEditDialogOpen(true); }}>
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setSelectedUser(u); setIsEditDialogOpen(true); }}>
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit User
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUserAction("upgrade", u.id)}>
                                      <TrendingUp className="w-4 h-4 mr-2" />
                                      Change Subscription
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {u.status === "suspended" ? (
                                      <DropdownMenuItem onClick={() => handleUserAction("activate", u.id)}>
                                        <Unlock className="w-4 h-4 mr-2" />
                                        Activate User
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem onClick={() => handleUserAction("suspend", u.id)} className="text-yellow-400">
                                        <Ban className="w-4 h-4 mr-2" />
                                        Suspend User
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => handleUserAction("delete", u.id)} className="text-red-400">
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete User
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="p-8 text-center">
                              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                              <p className="text-muted-foreground">No users found</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredUsers.length} of {users?.length || 0} users
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled>Previous</Button>
                    <Button variant="outline" size="sm" disabled>Next</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="space-y-6">
            {/* Revenue Overview */}
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { tier: "Free", count: stats?.subscriptionBreakdown?.free || 0, price: 0, color: "gray" },
                { tier: "Starter", count: stats?.subscriptionBreakdown?.starter || 0, price: 29, color: "green" },
                { tier: "Pro", count: stats?.subscriptionBreakdown?.pro || 0, price: 79, color: "blue" },
                { tier: "Elite", count: stats?.subscriptionBreakdown?.elite || 0, price: 199, color: "purple" },
              ].map((item) => (
                <Card key={item.tier} className="bg-card border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Badge className={`bg-${item.color}-500/20 text-${item.color}-400 border-${item.color}-500/30`}>
                        {item.tier}
                      </Badge>
                      {item.price > 0 && (
                        <span className="text-sm text-muted-foreground">${item.price}/mo</span>
                      )}
                    </div>
                    <p className="text-3xl font-bold text-foreground">{item.count}</p>
                    <p className="text-sm text-muted-foreground">subscribers</p>
                    {item.price > 0 && (
                      <p className="text-sm text-profit mt-2">
                        ${(item.count * item.price).toLocaleString()}/mo revenue
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* MRR Summary */}
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Monthly Recurring Revenue</p>
                    <p className="text-4xl font-bold text-foreground">${totalMRR.toLocaleString()}</p>
                    <p className="text-sm text-profit flex items-center gap-1 mt-1">
                      <ArrowUpRight className="w-4 h-4" />
                      +24% from last month
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">Annual Run Rate:</span>
                      <span className="font-bold text-foreground">${(totalMRR * 12).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">Avg Revenue Per User:</span>
                      <span className="font-bold text-foreground">
                        ${stats?.totalUsers ? (totalMRR / stats.totalUsers).toFixed(2) : "0.00"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Chart */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Revenue Trend</CardTitle>
                <CardDescription>Monthly revenue and user growth</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="month" stroke="#666" />
                      <YAxis yAxisId="left" stroke="#666" tickFormatter={(value) => `$${value / 1000}k`} />
                      <YAxis yAxisId="right" orientation="right" stroke="#666" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="mrr" name="MRR ($)" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="users" name="Users" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* User Growth */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <LineChart className="w-5 h-5 text-primary" />
                    User Activity
                  </CardTitle>
                  <CardDescription>Daily new and active users</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={userGrowthData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="date" stroke="#666" />
                        <YAxis stroke="#666" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="newUsers" name="New Users" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} />
                        <Line type="monotone" dataKey="activeUsers" name="Active Users" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Platform Metrics */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Key Metrics
                  </CardTitle>
                  <CardDescription>Platform performance indicators</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "User Retention (30d)", value: "87%", change: "+5%", positive: true },
                    { label: "Conversion Rate", value: "12.4%", change: "+2.1%", positive: true },
                    { label: "Churn Rate", value: "3.2%", change: "-0.8%", positive: true },
                    { label: "Avg Session Duration", value: "24m", change: "+3m", positive: true },
                    { label: "Bot Success Rate", value: "78%", change: "+4%", positive: true },
                    { label: "Support Response Time", value: "2.4h", change: "-0.5h", positive: true },
                  ].map((metric, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <span className="text-muted-foreground">{metric.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-foreground">{metric.value}</span>
                        <Badge variant="outline" className={metric.positive ? "text-green-400 border-green-500/30" : "text-red-400 border-red-500/30"}>
                          {metric.positive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                          {metric.change}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* System Health */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Server className="w-5 h-5 text-primary" />
                  System Health
                </CardTitle>
                <CardDescription>Infrastructure and service status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  {[
                    { label: "API Server", status: "operational", icon: Server, uptime: "99.99%" },
                    { label: "Database", status: "operational", icon: Database, uptime: "99.95%" },
                    { label: "Trading Engine", status: "operational", icon: Cpu, uptime: "99.98%" },
                    { label: "AI Services", status: "operational", icon: Zap, uptime: "99.90%" },
                  ].map((service, index) => (
                    <div key={index} className="p-4 rounded-lg bg-secondary/50 border border-border">
                      <div className="flex items-center justify-between mb-3">
                        <service.icon className="w-5 h-5 text-muted-foreground" />
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {service.status}
                        </Badge>
                      </div>
                      <p className="font-medium text-foreground">{service.label}</p>
                      <p className="text-sm text-muted-foreground">Uptime: {service.uptime}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Marketplace Tab */}
          <TabsContent value="marketplace" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Marketplace Management</CardTitle>
                <CardDescription>Manage bot listings, reviews, and featured content</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Store className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Marketplace Management</h3>
                  <p className="text-muted-foreground mb-4">
                    Review and approve bot listings, manage featured content, and monitor marketplace activity.
                  </p>
                  <Button onClick={() => toast.info("Feature coming soon")}>
                    View Pending Listings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground">Activity Logs</CardTitle>
                    <CardDescription>Platform-wide activity and audit trail</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select defaultValue="all">
                      <SelectTrigger className="w-[150px] bg-secondary/50">
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Activities</SelectItem>
                        <SelectItem value="user">User Actions</SelectItem>
                        <SelectItem value="payment">Payments</SelectItem>
                        <SelectItem value="security">Security</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {mockActivityLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-4 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          log.type === "user" ? "bg-blue-500/20" :
                          log.type === "payment" ? "bg-green-500/20" :
                          log.type === "security" ? "bg-red-500/20" :
                          "bg-gray-500/20"
                        }`}>
                          {log.type === "user" && <Users className="w-5 h-5 text-blue-400" />}
                          {log.type === "payment" && <DollarSign className="w-5 h-5 text-green-400" />}
                          {log.type === "security" && <Shield className="w-5 h-5 text-red-400" />}
                          {log.type === "system" && <Server className="w-5 h-5 text-gray-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-foreground">{log.action}</p>
                            <Badge variant="outline" className="text-xs">
                              {log.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{log.details}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            by {log.userName} • {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support" className="space-y-6">
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { label: "Open Tickets", count: mockSupportTickets.filter(t => t.status === "open").length, color: "red" },
                { label: "In Progress", count: mockSupportTickets.filter(t => t.status === "in_progress").length, color: "yellow" },
                { label: "Resolved", count: mockSupportTickets.filter(t => t.status === "resolved").length, color: "green" },
                { label: "Avg Response", value: "2.4h", color: "blue" },
              ].map((stat, index) => (
                <Card key={index} className="bg-card border-border">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.count ?? stat.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Support Tickets</CardTitle>
                <CardDescription>Manage customer support requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockSupportTickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${
                          ticket.priority === "urgent" ? "bg-red-500" :
                          ticket.priority === "high" ? "bg-orange-500" :
                          ticket.priority === "medium" ? "bg-yellow-500" :
                          "bg-gray-500"
                        }`} />
                        <div>
                          <p className="font-medium text-foreground">{ticket.subject}</p>
                          <p className="text-sm text-muted-foreground">
                            {ticket.userName} • {new Date(ticket.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={`${
                          ticket.status === "open" ? "bg-red-500/10 text-red-400 border-red-500/30" :
                          ticket.status === "in_progress" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" :
                          ticket.status === "resolved" ? "bg-green-500/10 text-green-400 border-green-500/30" :
                          "bg-gray-500/10 text-gray-400 border-gray-500/30"
                        }`}>
                          {ticket.status.replace("_", " ")}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          View
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* General Settings */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">General Settings</CardTitle>
                  <CardDescription>Platform-wide configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">Maintenance Mode</Label>
                      <p className="text-sm text-muted-foreground">Temporarily disable user access</p>
                    </div>
                    <Switch />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">New User Registration</Label>
                      <p className="text-sm text-muted-foreground">Allow new users to sign up</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">Live Trading</Label>
                      <p className="text-sm text-muted-foreground">Enable live trading features</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">AI Analysis</Label>
                      <p className="text-sm text-muted-foreground">Enable AI-powered analysis</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>

              {/* Notification Settings */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Admin Notifications</CardTitle>
                  <CardDescription>Configure admin alert preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">New User Signups</Label>
                      <p className="text-sm text-muted-foreground">Get notified of new registrations</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">Subscription Changes</Label>
                      <p className="text-sm text-muted-foreground">Upgrades, downgrades, and cancellations</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">Security Alerts</Label>
                      <p className="text-sm text-muted-foreground">Failed logins and suspicious activity</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">Support Tickets</Label>
                      <p className="text-sm text-muted-foreground">New and urgent support requests</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>

              {/* API Settings */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">API Configuration</CardTitle>
                  <CardDescription>Manage API keys and rate limits</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-foreground">API Rate Limit</Label>
                    <Select defaultValue="1000">
                      <SelectTrigger className="mt-2 bg-secondary/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100">100 requests/min</SelectItem>
                        <SelectItem value="500">500 requests/min</SelectItem>
                        <SelectItem value="1000">1000 requests/min</SelectItem>
                        <SelectItem value="unlimited">Unlimited</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-foreground">Webhook URL</Label>
                    <Input className="mt-2 bg-secondary/50" placeholder="https://your-webhook.com/endpoint" />
                  </div>
                  <Button className="w-full" onClick={() => toast.success("Settings saved")}>
                    Save API Settings
                  </Button>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="bg-card border-red-500/20">
                <CardHeader>
                  <CardTitle className="text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription>Irreversible and destructive actions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-sm text-foreground mb-3">Clear all cached data</p>
                    <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => toast.success("Cache cleared")}>
                      Clear Cache
                    </Button>
                  </div>
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-sm text-foreground mb-3">Reset platform analytics</p>
                    <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => toast.warning("This action requires confirmation")}>
                      Reset Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information and permissions
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary font-bold text-lg">
                      {selectedUser.name?.charAt(0) || "U"}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{selectedUser.name || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
                </div>
                <div className="grid gap-4">
                  <div>
                    <Label>Role</Label>
                    <Select defaultValue={selectedUser.role}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subscription Tier</Label>
                    <Select defaultValue={selectedUser.subscriptionTier || "free"}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="elite">Elite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select defaultValue={selectedUser.status || "active"}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => { toast.success("User updated successfully"); setIsEditDialogOpen(false); }}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
