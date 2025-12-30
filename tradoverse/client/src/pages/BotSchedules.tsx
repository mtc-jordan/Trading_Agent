import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Clock, 
  Plus, 
  Calendar, 
  Play, 
  Pause, 
  Trash2, 
  Edit2, 
  Bot, 
  History,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronRight
} from "lucide-react";
import { ScheduleBuilder, ScheduleConfig, ScheduleFrequency } from "@/components/ScheduleBuilder";
import { cn } from "@/lib/utils";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function BotSchedules() {
  const { user } = useAuth();
  const [selectedBotId, setSelectedBotId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState("schedules");

  // Fetch user's bots
  const { data: bots, isLoading: botsLoading } = trpc.bot.list.useQuery();

  // Fetch schedules - use first bot if none selected
  const defaultBotId = bots?.[0]?.id || 0;
  const activeBotId = selectedBotId || defaultBotId;
  
  const { data: schedules, isLoading: schedulesLoading, refetch: refetchSchedules } = 
    trpc.botSchedule.list.useQuery(
      { botId: activeBotId },
      { enabled: !!user && activeBotId > 0 }
    );

  // Fetch execution logs
  const { data: executionLogs, isLoading: logsLoading, refetch: refetchLogs } = 
    trpc.botSchedule.getExecutionLogs.useQuery(
      { botId: selectedBotId || undefined, limit: 50 },
      { enabled: !!user && activeTab === "history" }
    );

  // Mutations
  const createSchedule = trpc.botSchedule.create.useMutation({
    onSuccess: () => {
      toast.success("Schedule created successfully");
      setIsCreateOpen(false);
      refetchSchedules();
    },
    onError: (error) => {
      toast.error(`Failed to create schedule: ${error.message}`);
    },
  });

  const updateSchedule = trpc.botSchedule.update.useMutation({
    onSuccess: () => {
      toast.success("Schedule updated successfully");
      setEditingSchedule(null);
      refetchSchedules();
    },
    onError: (error) => {
      toast.error(`Failed to update schedule: ${error.message}`);
    },
  });

  const deleteSchedule = trpc.botSchedule.delete.useMutation({
    onSuccess: () => {
      toast.success("Schedule deleted");
      refetchSchedules();
    },
    onError: (error) => {
      toast.error(`Failed to delete schedule: ${error.message}`);
    },
  });

  const toggleSchedule = trpc.botSchedule.toggle.useMutation({
    onSuccess: () => {
      refetchSchedules();
    },
    onError: (error: any) => {
      toast.error(`Failed to toggle schedule: ${error.message}`);
    },
  });

  const handleSaveSchedule = (config: ScheduleConfig) => {
    // Convert frequency to scheduleType
    const scheduleType = config.frequency === 'custom' ? 'cron' as const : 
                         config.frequency === 'hourly' ? 'daily' as const : 
                         config.frequency as 'once' | 'daily' | 'weekly' | 'monthly';
    const runTime = `${config.hour.toString().padStart(2, '0')}:${config.minute.toString().padStart(2, '0')}`;
    
    if (editingSchedule) {
      updateSchedule.mutate({
        id: editingSchedule.id,
        name: config.name,
        isActive: config.enabled,
        runTime: runTime,
        daysOfWeek: config.daysOfWeek,
        timezone: config.timezone,
      });
    } else {
      createSchedule.mutate({
        botId: config.botId,
        name: config.name,
        scheduleType: scheduleType,
        runTime: runTime,
        daysOfWeek: config.daysOfWeek,
        dayOfMonth: config.dayOfMonth,
        timezone: config.timezone,
      });
    }
  };

  const formatNextRun = (nextRun: string | Date | null): string => {
    if (!nextRun) return "Not scheduled";
    const date = new Date(nextRun);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 0) return "Overdue";
    if (diffMins < 60) return `in ${diffMins}m`;
    if (diffHours < 24) return `in ${diffHours}h`;
    if (diffDays < 7) return `in ${diffDays}d`;
    
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getScheduleDescription = (schedule: any): string => {
    const time = schedule.runTime || "09:00";
    
    switch (schedule.scheduleType) {
      case "once":
        return `Once at ${time}`;
      case "daily":
        return `Daily at ${time}`;
      case "weekly":
        const daysArr = Array.isArray(schedule.daysOfWeek) ? schedule.daysOfWeek : [];
        const days = daysArr.map((d: number) => DAYS_OF_WEEK[d]).join(", ");
        return `${days || "No days"} at ${time}`;
      case "monthly":
        return `Day ${schedule.dayOfMonth || 1} at ${time}`;
      case "cron":
        return `Cron: ${schedule.cronExpression || "Not set"}`;
      default:
        return "Unknown schedule";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Success</Badge>;
      case "failed":
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case "running":
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Running</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Please log in to manage bot schedules</p>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Clock className="w-8 h-8 text-primary" />
            Bot Schedules
          </h1>
          <p className="text-muted-foreground mt-1">
            Automate your trading bots with scheduled runs
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button disabled={!bots || bots.length === 0}>
              <Plus className="w-4 h-4 mr-2" />
              New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Schedule</DialogTitle>
            </DialogHeader>
            {bots && bots.length > 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Bot</label>
                  <Select
                    value={selectedBotId?.toString() || ""}
                    onValueChange={(v) => setSelectedBotId(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a bot to schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      {bots.map((bot) => (
                        <SelectItem key={bot.id} value={bot.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4" />
                            {bot.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedBotId && (
                  <ScheduleBuilder
                    botId={selectedBotId}
                    onSave={handleSaveSchedule}
                    onCancel={() => setIsCreateOpen(false)}
                  />
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Bot Filter */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Filter by bot:</span>
            <Select
              value={selectedBotId?.toString() || "all"}
              onValueChange={(v) => setSelectedBotId(v === "all" ? null : parseInt(v))}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="All bots" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All bots</SelectItem>
                {bots?.map((bot) => (
                  <SelectItem key={bot.id} value={bot.id.toString()}>
                    {bot.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="schedules" className="gap-2">
            <Calendar className="w-4 h-4" />
            Schedules
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            Execution History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedules" className="mt-6">
          {schedulesLoading ? (
            <div className="flex items-center justify-center h-48">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : schedules && schedules.length > 0 ? (
            <div className="space-y-4">
              {schedules.map((schedule) => (
                <Card key={schedule.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-3 h-3 rounded-full",
                          schedule.isActive ? "bg-green-500" : "bg-muted-foreground"
                        )} />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{schedule.name}</h3>
                            <Badge variant="outline" className="text-xs">
                              {schedule.scheduleType}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {getScheduleDescription(schedule)}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Bot className="w-3 h-3" />
                              {bots?.find(b => b.id === schedule.botId)?.name || `Bot #${schedule.botId}`}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Next: {formatNextRun(schedule.nextRunAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={schedule.isActive}
                          onCheckedChange={(isActive) => 
                            toggleSchedule.mutate({ id: schedule.id, enabled: isActive })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingSchedule(schedule)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this schedule?")) {
                              deleteSchedule.mutate({ id: schedule.id });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No schedules yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first schedule to automate your trading bots
                </p>
                <Button onClick={() => setIsCreateOpen(true)} disabled={!bots || bots.length === 0}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Schedule
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {logsLoading ? (
            <div className="flex items-center justify-center h-48">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : executionLogs && executionLogs.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Executions</CardTitle>
                <CardDescription>
                  History of scheduled bot runs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {executionLogs.map((log: any) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {getStatusBadge(log.status)}
                        <div>
                          <p className="font-medium">
                            {bots?.find(b => b.id === log.botId)?.name || `Bot #${log.botId}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(log.executedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {log.tradesExecuted !== null && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">Trades:</span>{" "}
                            <span className="font-medium">{log.tradesExecuted}</span>
                          </p>
                        )}
                        {log.duration && (
                          <p className="text-xs text-muted-foreground">
                            Duration: {(log.duration / 1000).toFixed(1)}s
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No execution history</h3>
                <p className="text-muted-foreground">
                  Scheduled bot runs will appear here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Schedule Dialog */}
      <Dialog open={!!editingSchedule} onOpenChange={(open) => !open && setEditingSchedule(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
          </DialogHeader>
          {editingSchedule && (
            <ScheduleBuilder
              botId={editingSchedule.botId}
              initialConfig={{
                id: editingSchedule.id,
                name: editingSchedule.name,
                frequency: (editingSchedule.scheduleType === 'cron' ? 'custom' : editingSchedule.scheduleType) as ScheduleFrequency,
                enabled: editingSchedule.isActive,
                hour: editingSchedule.runTime ? parseInt(editingSchedule.runTime.split(':')[0]) : 9,
                minute: editingSchedule.runTime ? parseInt(editingSchedule.runTime.split(':')[1]) : 0,
                daysOfWeek: Array.isArray(editingSchedule.daysOfWeek) ? editingSchedule.daysOfWeek : [1, 2, 3, 4, 5],
                dayOfMonth: editingSchedule.dayOfMonth || 1,
                customIntervalMinutes: 60,
                timezone: editingSchedule.timezone || "America/New_York",
              }}
              onSave={handleSaveSchedule}
              onCancel={() => setEditingSchedule(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
