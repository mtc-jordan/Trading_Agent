import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  Users, 
  Bot, 
  DollarSign, 
  Activity,
  Shield,
  TrendingUp,
  BarChart3
} from "lucide-react";
import { useLocation } from "wouter";

export default function Admin() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect non-admins
  if (!loading && user?.role !== "admin") {
    setLocation("/dashboard");
    return null;
  }

  const { data: stats } = trpc.admin.getStats.useQuery(undefined, {
    enabled: user?.role === "admin",
  }) as { data: any };

  const { data: users } = trpc.admin.getUsers.useQuery({ limit: 20 }, {
    enabled: user?.role === "admin",
  }) as { data: any[] | undefined };

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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-muted-foreground">
              Platform management and analytics
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Users</span>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {stats?.totalUsers || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Active Bots</span>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {stats?.activeBots || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Volume</span>
              </div>
              <p className="text-3xl font-bold text-foreground">
                ${((stats?.totalVolume || 0) / 1000000).toFixed(1)}M
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Trades Today</span>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {stats?.tradesToday || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Users
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Subscriptions
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">User Management</CardTitle>
                <CardDescription>View and manage platform users</CardDescription>
              </CardHeader>
              <CardContent>
                {users && users.length > 0 ? (
                  <div className="space-y-3">
                    {users.map((u: any) => (
                      <div key={u.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-primary font-medium">
                              {u.name?.charAt(0) || u.email?.charAt(0) || "U"}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{u.name || "Unknown"}</p>
                            <p className="text-sm text-muted-foreground">{u.email || "No email"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            u.subscriptionTier === "elite" ? "bg-purple-500/20 text-purple-400" :
                            u.subscriptionTier === "pro" ? "bg-blue-500/20 text-blue-400" :
                            u.subscriptionTier === "starter" ? "bg-green-500/20 text-green-400" :
                            "bg-gray-500/20 text-gray-400"
                          }`}>
                            {u.subscriptionTier || "free"}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            u.role === "admin" ? "bg-red-500/20 text-red-400" : "bg-muted text-muted-foreground"
                          }`}>
                            {u.role}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No users found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { tier: "Free", count: stats?.subscriptionBreakdown?.free || 0, color: "bg-gray-500/20 text-gray-400" },
                { tier: "Starter", count: stats?.subscriptionBreakdown?.starter || 0, color: "bg-green-500/20 text-green-400" },
                { tier: "Pro", count: stats?.subscriptionBreakdown?.pro || 0, color: "bg-blue-500/20 text-blue-400" },
                { tier: "Elite", count: stats?.subscriptionBreakdown?.elite || 0, color: "bg-purple-500/20 text-purple-400" },
              ].map((item) => (
                <Card key={item.tier} className="bg-card border-border">
                  <CardContent className="p-6">
                    <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${item.color} mb-3`}>
                      {item.tier}
                    </div>
                    <p className="text-3xl font-bold text-foreground">{item.count}</p>
                    <p className="text-sm text-muted-foreground">subscribers</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Revenue Overview</CardTitle>
                <CardDescription>Monthly recurring revenue by tier</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { tier: "Starter", price: 29, count: stats?.subscriptionBreakdown?.starter || 0 },
                    { tier: "Pro", price: 79, count: stats?.subscriptionBreakdown?.pro || 0 },
                    { tier: "Elite", price: 199, count: stats?.subscriptionBreakdown?.elite || 0 },
                  ].map((item) => (
                    <div key={item.tier} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                      <div>
                        <p className="font-medium text-foreground">{item.tier}</p>
                        <p className="text-sm text-muted-foreground">{item.count} subscribers × ${item.price}/mo</p>
                      </div>
                      <p className="text-xl font-bold text-profit">
                        ${(item.count * item.price).toLocaleString()}/mo
                      </p>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="font-medium text-foreground">Total MRR</p>
                    <p className="text-2xl font-bold text-primary">
                      ${(
                        ((stats?.subscriptionBreakdown?.starter || 0) * 29) +
                        ((stats?.subscriptionBreakdown?.pro || 0) * 79) +
                        ((stats?.subscriptionBreakdown?.elite || 0) * 199)
                      ).toLocaleString()}/mo
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Platform Growth
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between p-3 rounded-lg bg-secondary/50">
                      <span className="text-muted-foreground">New Users (30d)</span>
                      <span className="font-medium text-foreground">{stats?.newUsers30d || 0}</span>
                    </div>
                    <div className="flex justify-between p-3 rounded-lg bg-secondary/50">
                      <span className="text-muted-foreground">Active Users (7d)</span>
                      <span className="font-medium text-foreground">{stats?.activeUsers7d || 0}</span>
                    </div>
                    <div className="flex justify-between p-3 rounded-lg bg-secondary/50">
                      <span className="text-muted-foreground">Bots Created (30d)</span>
                      <span className="font-medium text-foreground">{stats?.botsCreated30d || 0}</span>
                    </div>
                    <div className="flex justify-between p-3 rounded-lg bg-secondary/50">
                      <span className="text-muted-foreground">Backtests Run (30d)</span>
                      <span className="font-medium text-foreground">{stats?.backtestsRun30d || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Trading Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between p-3 rounded-lg bg-secondary/50">
                      <span className="text-muted-foreground">Total Trades</span>
                      <span className="font-medium text-foreground">{stats?.totalTrades || 0}</span>
                    </div>
                    <div className="flex justify-between p-3 rounded-lg bg-secondary/50">
                      <span className="text-muted-foreground">Avg Trades/User</span>
                      <span className="font-medium text-foreground">
                        {stats?.totalUsers ? ((stats?.totalTrades || 0) / stats.totalUsers).toFixed(1) : 0}
                      </span>
                    </div>
                    <div className="flex justify-between p-3 rounded-lg bg-secondary/50">
                      <span className="text-muted-foreground">Platform Win Rate</span>
                      <span className="font-medium text-foreground">{stats?.platformWinRate || "N/A"}%</span>
                    </div>
                    <div className="flex justify-between p-3 rounded-lg bg-secondary/50">
                      <span className="text-muted-foreground">Marketplace Listings</span>
                      <span className="font-medium text-foreground">{stats?.marketplaceListings || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
