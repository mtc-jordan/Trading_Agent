import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import {
  CreditCard,
  TrendingUp,
  Users,
  DollarSign,
  Crown,
  Zap,
  Star,
  Loader2,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminSubscriptions() {
  const { data: stats } = trpc.admin.getStats.useQuery();

  // Convert usersByTier array to object
  const usersByTier = stats?.usersByTier?.reduce((acc, item) => {
    acc[item.tier] = item.count;
    return acc;
  }, {} as Record<string, number>) || {};

  const totalUsers = stats?.totalUsers || 0;
  const freeUsers = usersByTier.free || 0;
  const starterUsers = usersByTier.starter || 0;
  const proUsers = usersByTier.pro || 0;
  const eliteUsers = usersByTier.elite || 0;
  const paidUsers = starterUsers + proUsers + eliteUsers;
  const conversionRate = totalUsers > 0 ? ((paidUsers / totalUsers) * 100).toFixed(1) : "0";

  // Mock revenue data
  const monthlyRevenue = (starterUsers * 19) + (proUsers * 49) + (eliteUsers * 99);
  const projectedAnnual = monthlyRevenue * 12;

  const tiers = [
    {
      name: "Free",
      price: "$0",
      users: freeUsers,
      percentage: totalUsers > 0 ? (freeUsers / totalUsers) * 100 : 0,
      color: "zinc",
      icon: Users,
      features: ["5 AI analyses/month", "Basic market data", "1 trading bot"],
    },
    {
      name: "Starter",
      price: "$19/mo",
      users: starterUsers,
      percentage: totalUsers > 0 ? (starterUsers / totalUsers) * 100 : 0,
      color: "blue",
      icon: Zap,
      features: ["50 AI analyses/month", "Real-time data", "5 trading bots"],
    },
    {
      name: "Pro",
      price: "$49/mo",
      users: proUsers,
      percentage: totalUsers > 0 ? (proUsers / totalUsers) * 100 : 0,
      color: "purple",
      icon: Star,
      features: ["Unlimited analyses", "Advanced indicators", "20 trading bots"],
    },
    {
      name: "Elite",
      price: "$99/mo",
      users: eliteUsers,
      percentage: totalUsers > 0 ? (eliteUsers / totalUsers) * 100 : 0,
      color: "green",
      icon: Crown,
      features: ["Everything in Pro", "Priority support", "Unlimited bots"],
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Subscription Management</h1>
          <p className="text-zinc-400">Monitor subscription metrics and revenue</p>
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Monthly Revenue</p>
                  <p className="text-3xl font-bold text-white mt-1">${monthlyRevenue.toLocaleString()}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-500">+12%</span>
                    <span className="text-xs text-zinc-500">vs last month</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Projected Annual</p>
                  <p className="text-3xl font-bold text-white mt-1">${projectedAnnual.toLocaleString()}</p>
                  <p className="text-xs text-zinc-500 mt-2">Based on current MRR</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Paid Subscribers</p>
                  <p className="text-3xl font-bold text-white mt-1">{paidUsers}</p>
                  <p className="text-xs text-zinc-500 mt-2">of {totalUsers} total users</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Conversion Rate</p>
                  <p className="text-3xl font-bold text-white mt-1">{conversionRate}%</p>
                  <p className="text-xs text-zinc-500 mt-2">Free to paid</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            return (
              <Card key={tier.name} className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center",
                        tier.color === "zinc" && "bg-zinc-800",
                        tier.color === "blue" && "bg-blue-500/10",
                        tier.color === "purple" && "bg-purple-500/10",
                        tier.color === "green" && "bg-green-500/10"
                      )}>
                        <Icon className={cn(
                          "h-4 w-4",
                          tier.color === "zinc" && "text-zinc-400",
                          tier.color === "blue" && "text-blue-500",
                          tier.color === "purple" && "text-purple-500",
                          tier.color === "green" && "text-green-500"
                        )} />
                      </div>
                      <CardTitle className="text-lg text-white">{tier.name}</CardTitle>
                    </div>
                    <Badge variant="outline" className={cn(
                      tier.color === "zinc" && "border-zinc-600 text-zinc-400",
                      tier.color === "blue" && "border-blue-500 text-blue-500",
                      tier.color === "purple" && "border-purple-500 text-purple-500",
                      tier.color === "green" && "border-green-500 text-green-500"
                    )}>
                      {tier.price}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-bold text-white">{tier.users}</span>
                        <span className="text-sm text-zinc-500">{tier.percentage.toFixed(1)}%</span>
                      </div>
                      <Progress 
                        value={tier.percentage} 
                        className="h-2"
                      />
                    </div>
                    <div className="space-y-1">
                      {tier.features.map((feature, idx) => (
                        <p key={idx} className="text-xs text-zinc-500">• {feature}</p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Revenue Breakdown */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Revenue Breakdown</CardTitle>
            <CardDescription>Monthly recurring revenue by tier</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Tier</TableHead>
                  <TableHead className="text-zinc-400">Price</TableHead>
                  <TableHead className="text-zinc-400">Subscribers</TableHead>
                  <TableHead className="text-zinc-400">MRR</TableHead>
                  <TableHead className="text-zinc-400">% of Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-blue-500 text-blue-500">Starter</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-white">$19/mo</TableCell>
                  <TableCell className="text-white">{starterUsers}</TableCell>
                  <TableCell className="text-white">${(starterUsers * 19).toLocaleString()}</TableCell>
                  <TableCell className="text-zinc-400">
                    {monthlyRevenue > 0 ? ((starterUsers * 19 / monthlyRevenue) * 100).toFixed(1) : 0}%
                  </TableCell>
                </TableRow>
                <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-purple-500 text-purple-500">Pro</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-white">$49/mo</TableCell>
                  <TableCell className="text-white">{proUsers}</TableCell>
                  <TableCell className="text-white">${(proUsers * 49).toLocaleString()}</TableCell>
                  <TableCell className="text-zinc-400">
                    {monthlyRevenue > 0 ? ((proUsers * 49 / monthlyRevenue) * 100).toFixed(1) : 0}%
                  </TableCell>
                </TableRow>
                <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-green-500 text-green-500">Elite</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-white">$99/mo</TableCell>
                  <TableCell className="text-white">{eliteUsers}</TableCell>
                  <TableCell className="text-white">${(eliteUsers * 99).toLocaleString()}</TableCell>
                  <TableCell className="text-zinc-400">
                    {monthlyRevenue > 0 ? ((eliteUsers * 99 / monthlyRevenue) * 100).toFixed(1) : 0}%
                  </TableCell>
                </TableRow>
                <TableRow className="border-zinc-800 bg-zinc-800/30">
                  <TableCell className="font-semibold text-white">Total</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="font-semibold text-white">{paidUsers}</TableCell>
                  <TableCell className="font-semibold text-green-500">${monthlyRevenue.toLocaleString()}</TableCell>
                  <TableCell className="text-zinc-400">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
