import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  TrendingUp,
  Users,
  Bot,
  Zap,
  Activity,
  Clock,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminAnalytics() {
  const { data: stats } = trpc.admin.getStats.useQuery();

  // Mock analytics data
  const weeklyData = [
    { day: "Mon", users: 12, analyses: 145, bots: 8 },
    { day: "Tue", users: 18, analyses: 189, bots: 12 },
    { day: "Wed", users: 15, analyses: 167, bots: 10 },
    { day: "Thu", users: 22, analyses: 234, bots: 15 },
    { day: "Fri", users: 28, analyses: 278, bots: 18 },
    { day: "Sat", users: 14, analyses: 156, bots: 9 },
    { day: "Sun", users: 10, analyses: 123, bots: 6 },
  ];

  const topFeatures = [
    { name: "AI Analysis", usage: 45, change: 12 },
    { name: "Trading Bots", usage: 28, change: 8 },
    { name: "Backtesting", usage: 15, change: -3 },
    { name: "Portfolio Tracking", usage: 8, change: 5 },
    { name: "Marketplace", usage: 4, change: 2 },
  ];

  const agentUsage = [
    { name: "Technical Analyst", count: 1234, percentage: 35 },
    { name: "Fundamental Analyst", count: 987, percentage: 28 },
    { name: "Sentiment Analyst", count: 654, percentage: 19 },
    { name: "Risk Manager", count: 432, percentage: 12 },
    { name: "Macro Analyst", count: 210, percentage: 6 },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Analytics</h1>
          <p className="text-zinc-400">Detailed insights into platform usage and performance</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Total Users</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats?.totalUsers || 0}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-500">+15%</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Active Bots</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats?.totalBots || 0}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-500">+23%</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Bot className="h-6 w-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Total Trades</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats?.totalTrades || 0}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-500">+8%</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Backtests Run</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats?.totalBacktests || 0}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-500">-5%</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different analytics views */}
        <Tabs defaultValue="usage" className="space-y-4">
          <TabsList className="bg-zinc-800 border-zinc-700">
            <TabsTrigger value="usage" className="data-[state=active]:bg-green-500">Usage</TabsTrigger>
            <TabsTrigger value="features" className="data-[state=active]:bg-green-500">Features</TabsTrigger>
            <TabsTrigger value="agents" className="data-[state=active]:bg-green-500">AI Agents</TabsTrigger>
          </TabsList>

          <TabsContent value="usage" className="space-y-4">
            {/* Weekly Activity Chart (simplified) */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Weekly Activity</CardTitle>
                <CardDescription>User signups, analyses, and bot creations this week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {weeklyData.map((day) => (
                    <div key={day.day} className="flex items-center gap-4">
                      <span className="w-10 text-sm text-zinc-400">{day.day}</span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: `${(day.users / 30) * 100}%` }}
                          />
                        </div>
                        <span className="w-8 text-xs text-zinc-500">{day.users}</span>
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full" 
                            style={{ width: `${(day.analyses / 300) * 100}%` }}
                          />
                        </div>
                        <span className="w-8 text-xs text-zinc-500">{day.analyses}</span>
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-purple-500 rounded-full" 
                            style={{ width: `${(day.bots / 20) * 100}%` }}
                          />
                        </div>
                        <span className="w-8 text-xs text-zinc-500">{day.bots}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-6 mt-4 pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    <span className="text-sm text-zinc-400">New Users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-sm text-zinc-400">Analyses</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-purple-500" />
                    <span className="text-sm text-zinc-400">Bots Created</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Feature Usage</CardTitle>
                <CardDescription>Most used features on the platform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {topFeatures.map((feature) => (
                  <div key={feature.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">{feature.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400">{feature.usage}%</span>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            feature.change > 0 
                              ? "border-green-500 text-green-500" 
                              : "border-red-500 text-red-500"
                          )}
                        >
                          {feature.change > 0 ? "+" : ""}{feature.change}%
                        </Badge>
                      </div>
                    </div>
                    <Progress value={feature.usage} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents" className="space-y-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">AI Agent Usage</CardTitle>
                <CardDescription>Distribution of AI agent usage across analyses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {agentUsage.map((agent) => (
                  <div key={agent.name} className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-medium">{agent.name}</span>
                        <span className="text-zinc-400">{agent.count.toLocaleString()} uses</span>
                      </div>
                      <Progress value={agent.percentage} className="h-2" />
                    </div>
                    <Badge variant="outline" className="border-zinc-600 text-zinc-400">
                      {agent.percentage}%
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Response Times</CardTitle>
              <CardDescription>Average API response times</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-zinc-400" />
                  <span className="text-white">AI Analysis</span>
                </div>
                <span className="text-zinc-400">2.3s avg</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-zinc-400" />
                  <span className="text-white">Market Data</span>
                </div>
                <span className="text-zinc-400">145ms avg</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-zinc-400" />
                  <span className="text-white">Bot Execution</span>
                </div>
                <span className="text-zinc-400">890ms avg</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-zinc-400" />
                  <span className="text-white">Backtesting</span>
                </div>
                <span className="text-zinc-400">4.7s avg</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Success Rates</CardTitle>
              <CardDescription>Operation success metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-green-500" />
                  <span className="text-white">API Requests</span>
                </div>
                <Badge variant="outline" className="border-green-500 text-green-500">99.8%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-green-500" />
                  <span className="text-white">Bot Executions</span>
                </div>
                <Badge variant="outline" className="border-green-500 text-green-500">98.5%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-yellow-500" />
                  <span className="text-white">Email Delivery</span>
                </div>
                <Badge variant="outline" className="border-yellow-500 text-yellow-500">96.2%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-green-500" />
                  <span className="text-white">WebSocket Connections</span>
                </div>
                <Badge variant="outline" className="border-green-500 text-green-500">99.1%</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
