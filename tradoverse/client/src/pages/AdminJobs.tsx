import { useAuth } from "@/_core/hooks/useAuth";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Settings,
  XCircle,
  Calendar,
  BarChart3,
  Timer,
  Zap,
  Mail,
  Bot,
  TrendingUp,
  FileText,
  Shield
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link, Redirect } from "wouter";

type JobStatus = "pending" | "running" | "completed" | "failed" | "paused";
type JobType = "bot_execution" | "price_tracking" | "accuracy_calculation" | "report_generation" | "email_digest";

interface ScheduledJob {
  id: number;
  name: string;
  type: JobType;
  status: JobStatus;
  cronExpression?: string;
  nextRunAt?: Date;
  lastRunAt?: Date;
  lastDuration?: number;
  successCount: number;
  failureCount: number;
  isEnabled: boolean;
}

interface JobExecution {
  id: number;
  jobId: number;
  jobName: string;
  status: "running" | "completed" | "failed";
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

// Mock data for demonstration - in production this would come from the API
const mockJobs: ScheduledJob[] = [
  {
    id: 1,
    name: "Bot Scheduler",
    type: "bot_execution",
    status: "completed",
    cronExpression: "*/5 * * * *",
    nextRunAt: new Date(Date.now() + 180000),
    lastRunAt: new Date(Date.now() - 120000),
    lastDuration: 2340,
    successCount: 1247,
    failureCount: 3,
    isEnabled: true,
  },
  {
    id: 2,
    name: "Price Tracker",
    type: "price_tracking",
    status: "running",
    cronExpression: "* * * * *",
    nextRunAt: new Date(Date.now() + 45000),
    lastRunAt: new Date(Date.now() - 15000),
    lastDuration: 890,
    successCount: 8640,
    failureCount: 12,
    isEnabled: true,
  },
  {
    id: 3,
    name: "Accuracy Calculator",
    type: "accuracy_calculation",
    status: "completed",
    cronExpression: "0 */6 * * *",
    nextRunAt: new Date(Date.now() + 14400000),
    lastRunAt: new Date(Date.now() - 7200000),
    lastDuration: 45600,
    successCount: 120,
    failureCount: 0,
    isEnabled: true,
  },
  {
    id: 4,
    name: "Weekly Report Generator",
    type: "report_generation",
    status: "completed",
    cronExpression: "0 9 * * 1",
    nextRunAt: new Date(Date.now() + 432000000),
    lastRunAt: new Date(Date.now() - 172800000),
    lastDuration: 89000,
    successCount: 52,
    failureCount: 1,
    isEnabled: true,
  },
  {
    id: 5,
    name: "Email Digest Sender",
    type: "email_digest",
    status: "paused",
    cronExpression: "0 8 * * *",
    nextRunAt: undefined,
    lastRunAt: new Date(Date.now() - 86400000),
    lastDuration: 12400,
    successCount: 365,
    failureCount: 5,
    isEnabled: false,
  },
];

const mockExecutions: JobExecution[] = [
  {
    id: 1,
    jobId: 2,
    jobName: "Price Tracker",
    status: "running",
    startedAt: new Date(Date.now() - 15000),
    metadata: { symbols: 150, updated: 148 },
  },
  {
    id: 2,
    jobId: 1,
    jobName: "Bot Scheduler",
    status: "completed",
    startedAt: new Date(Date.now() - 180000),
    completedAt: new Date(Date.now() - 120000),
    duration: 2340,
    metadata: { botsExecuted: 12, tradesPlaced: 3 },
  },
  {
    id: 3,
    jobId: 3,
    jobName: "Accuracy Calculator",
    status: "completed",
    startedAt: new Date(Date.now() - 7200000),
    completedAt: new Date(Date.now() - 7154400),
    duration: 45600,
    metadata: { predictionsAnalyzed: 1250, accuracyUpdated: 45 },
  },
  {
    id: 4,
    jobId: 1,
    jobName: "Bot Scheduler",
    status: "failed",
    startedAt: new Date(Date.now() - 3600000),
    completedAt: new Date(Date.now() - 3597000),
    duration: 3000,
    errorMessage: "Connection timeout to market data API",
  },
];

const jobTypeIcons: Record<JobType, React.ReactNode> = {
  bot_execution: <Bot className="h-4 w-4" />,
  price_tracking: <TrendingUp className="h-4 w-4" />,
  accuracy_calculation: <BarChart3 className="h-4 w-4" />,
  report_generation: <FileText className="h-4 w-4" />,
  email_digest: <Mail className="h-4 w-4" />,
};

const jobTypeColors: Record<JobType, string> = {
  bot_execution: "bg-blue-500/20 text-blue-400",
  price_tracking: "bg-green-500/20 text-green-400",
  accuracy_calculation: "bg-purple-500/20 text-purple-400",
  report_generation: "bg-orange-500/20 text-orange-400",
  email_digest: "bg-pink-500/20 text-pink-400",
};

const statusColors: Record<JobStatus | "running" | "completed" | "failed", string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  running: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
  paused: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  
  if (diff < 0) {
    // Future time
    const absDiff = Math.abs(diff);
    if (absDiff < 60000) return `in ${Math.floor(absDiff / 1000)}s`;
    if (absDiff < 3600000) return `in ${Math.floor(absDiff / 60000)}m`;
    if (absDiff < 86400000) return `in ${Math.floor(absDiff / 3600000)}h`;
    return `in ${Math.floor(absDiff / 86400000)}d`;
  }
  
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function AdminJobs() {
  const { user, loading: authLoading } = useAuth();
  const [selectedJobType, setSelectedJobType] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);

  // Check if user is admin
  if (!authLoading && user?.role !== "admin") {
    return <Redirect to="/dashboard" />;
  }

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      toast.success("Job status refreshed");
    }, 1000);
  };

  const handleToggleJob = (jobId: number, enable: boolean) => {
    toast.success(enable ? "Job enabled" : "Job paused");
  };

  const handleRunNow = (jobId: number) => {
    toast.success("Job triggered manually");
  };

  const handleRetry = (executionId: number) => {
    toast.success("Retrying failed job...");
  };

  // Filter jobs by type
  const filteredJobs = selectedJobType === "all" 
    ? mockJobs 
    : mockJobs.filter(j => j.type === selectedJobType);

  // Calculate stats
  const totalJobs = mockJobs.length;
  const activeJobs = mockJobs.filter(j => j.isEnabled).length;
  const runningJobs = mockJobs.filter(j => j.status === "running").length;
  const failedRecent = mockExecutions.filter(e => e.status === "failed").length;
  const successRate = mockJobs.reduce((acc, j) => acc + j.successCount, 0) / 
    (mockJobs.reduce((acc, j) => acc + j.successCount + j.failureCount, 0) || 1) * 100;

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold">Job Monitoring</h1>
              <Badge variant="outline" className="text-primary border-primary/30">Admin</Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Monitor and manage background jobs and scheduled tasks
            </p>
          </div>
          <Button onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalJobs}</p>
                  <p className="text-sm text-muted-foreground">Total Jobs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Play className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeJobs}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Activity className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{runningJobs}</p>
                  <p className="text-sm text-muted-foreground">Running</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{failedRecent}</p>
                  <p className="text-sm text-muted-foreground">Failed (24h)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <BarChart3 className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{successRate.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="jobs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="jobs" className="gap-2">
              <Settings className="h-4 w-4" />
              Scheduled Jobs
            </TabsTrigger>
            <TabsTrigger value="executions" className="gap-2">
              <Activity className="h-4 w-4" />
              Recent Executions
            </TabsTrigger>
            <TabsTrigger value="queue" className="gap-2">
              <Mail className="h-4 w-4" />
              Email Queue
            </TabsTrigger>
          </TabsList>

          {/* Scheduled Jobs Tab */}
          <TabsContent value="jobs" className="space-y-4">
            <div className="flex items-center justify-between">
              <Select value={selectedJobType} onValueChange={setSelectedJobType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="bot_execution">Bot Execution</SelectItem>
                  <SelectItem value="price_tracking">Price Tracking</SelectItem>
                  <SelectItem value="accuracy_calculation">Accuracy Calculation</SelectItem>
                  <SelectItem value="report_generation">Report Generation</SelectItem>
                  <SelectItem value="email_digest">Email Digest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              {filteredJobs.map((job) => (
                <Card key={job.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${jobTypeColors[job.type]}`}>
                          {jobTypeIcons[job.type]}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{job.name}</h3>
                            <Badge variant="outline" className={statusColors[job.status]}>
                              {job.status === "running" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                              {job.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {job.cronExpression}
                            </span>
                            {job.nextRunAt && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Next: {formatRelativeTime(job.nextRunAt)}
                              </span>
                            )}
                            {job.lastDuration && (
                              <span className="flex items-center gap-1">
                                <Timer className="h-3 w-3" />
                                {formatDuration(job.lastDuration)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-green-400">
                              <CheckCircle2 className="h-3 w-3 inline mr-1" />
                              {job.successCount.toLocaleString()} success
                            </span>
                            <span className="text-red-400">
                              <XCircle className="h-3 w-3 inline mr-1" />
                              {job.failureCount} failed
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRunNow(job.id)}
                          disabled={job.status === "running"}
                        >
                          <Zap className="h-4 w-4 mr-1" />
                          Run Now
                        </Button>
                        <Button
                          variant={job.isEnabled ? "outline" : "default"}
                          size="sm"
                          onClick={() => handleToggleJob(job.id, !job.isEnabled)}
                        >
                          {job.isEnabled ? (
                            <>
                              <Pause className="h-4 w-4 mr-1" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-1" />
                              Enable
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Progress bar for running jobs */}
                    {job.status === "running" && (
                      <div className="mt-4">
                        <Progress value={65} className="h-1" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Recent Executions Tab */}
          <TabsContent value="executions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Execution History</CardTitle>
                <CardDescription>Recent job executions and their results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockExecutions.map((execution) => (
                    <div
                      key={execution.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-secondary/30"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{execution.jobName}</span>
                          <Badge variant="outline" className={statusColors[execution.status]}>
                            {execution.status === "running" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                            {execution.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span>Started: {formatRelativeTime(execution.startedAt)}</span>
                          {execution.duration && (
                            <span>Duration: {formatDuration(execution.duration)}</span>
                          )}
                        </div>
                        {execution.errorMessage && (
                          <p className="text-sm text-red-400 mt-2">
                            <AlertTriangle className="h-3 w-3 inline mr-1" />
                            {execution.errorMessage}
                          </p>
                        )}
                        {execution.metadata && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {Object.entries(execution.metadata).map(([key, value]) => (
                              <Badge key={key} variant="secondary" className="text-xs">
                                {key}: {String(value)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {execution.status === "failed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetry(execution.id)}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Retry
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Queue Tab */}
          <TabsContent value="queue" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-500/20">
                      <Clock className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">24</p>
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">1,247</p>
                      <p className="text-sm text-muted-foreground">Sent (24h)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/20">
                      <XCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">3</p>
                      <p className="text-sm text-muted-foreground">Failed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <Activity className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">98.2%</p>
                      <p className="text-sm text-muted-foreground">Delivery Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Email Queue Status</CardTitle>
                <CardDescription>Pending and recently sent emails</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Sample email queue items */}
                  {[
                    { id: 1, type: "Bot Execution Alert", recipient: "user@example.com", status: "pending", scheduledFor: "Now" },
                    { id: 2, type: "Weekly Report", recipient: "trader@example.com", status: "sent", sentAt: "2m ago" },
                    { id: 3, type: "Price Alert", recipient: "investor@example.com", status: "sent", sentAt: "5m ago" },
                    { id: 4, type: "Recommendation Change", recipient: "user@example.com", status: "failed", error: "Invalid email" },
                  ].map((email) => (
                    <div
                      key={email.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                    >
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{email.type}</p>
                          <p className="text-sm text-muted-foreground">{email.recipient}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            email.status === "sent"
                              ? "text-green-400 border-green-500/30"
                              : email.status === "pending"
                              ? "text-yellow-400 border-yellow-500/30"
                              : "text-red-400 border-red-500/30"
                          }
                        >
                          {email.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {email.sentAt || email.scheduledFor || email.error}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
