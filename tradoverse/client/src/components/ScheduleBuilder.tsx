import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Clock, Calendar, Repeat, Play, Pause, Trash2, Save, AlertCircle } from "lucide-react";

export type ScheduleFrequency = "once" | "hourly" | "daily" | "weekly" | "monthly" | "custom";

export interface ScheduleConfig {
  id?: number;
  botId: number;
  name: string;
  frequency: ScheduleFrequency;
  enabled: boolean;
  // Time settings
  hour: number;
  minute: number;
  // Day settings for weekly
  daysOfWeek: number[]; // 0-6, Sunday = 0
  // Day settings for monthly
  dayOfMonth: number;
  // Custom interval in minutes
  customIntervalMinutes: number;
  // Timezone
  timezone: string;
  // Execution window
  startDate?: string;
  endDate?: string;
  // Next run calculation
  nextRun?: Date;
}

interface ScheduleBuilderProps {
  botId: number;
  initialConfig?: Partial<ScheduleConfig>;
  onSave: (config: ScheduleConfig) => void;
  onCancel?: () => void;
  className?: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun", fullLabel: "Sunday" },
  { value: 1, label: "Mon", fullLabel: "Monday" },
  { value: 2, label: "Tue", fullLabel: "Tuesday" },
  { value: 3, label: "Wed", fullLabel: "Wednesday" },
  { value: 4, label: "Thu", fullLabel: "Thursday" },
  { value: 5, label: "Fri", fullLabel: "Friday" },
  { value: 6, label: "Sat", fullLabel: "Saturday" },
];

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central European (CET)" },
  { value: "Asia/Tokyo", label: "Japan (JST)" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (HKT)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
];

const DEFAULT_CONFIG: ScheduleConfig = {
  botId: 0,
  name: "",
  frequency: "daily",
  enabled: true,
  hour: 9,
  minute: 30,
  daysOfWeek: [1, 2, 3, 4, 5], // Weekdays
  dayOfMonth: 1,
  customIntervalMinutes: 60,
  timezone: "America/New_York",
};

export function ScheduleBuilder({
  botId,
  initialConfig,
  onSave,
  onCancel,
  className,
}: ScheduleBuilderProps) {
  const [config, setConfig] = useState<ScheduleConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
    botId,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate next run time
  const calculateNextRun = (cfg: ScheduleConfig): Date | null => {
    const now = new Date();
    const targetTime = new Date();
    targetTime.setHours(cfg.hour, cfg.minute, 0, 0);

    switch (cfg.frequency) {
      case "once":
        if (cfg.startDate) {
          const startDate = new Date(cfg.startDate);
          startDate.setHours(cfg.hour, cfg.minute, 0, 0);
          return startDate > now ? startDate : null;
        }
        return targetTime > now ? targetTime : null;

      case "hourly":
        const nextHour = new Date();
        nextHour.setMinutes(cfg.minute, 0, 0);
        if (nextHour <= now) {
          nextHour.setHours(nextHour.getHours() + 1);
        }
        return nextHour;

      case "daily":
        if (targetTime <= now) {
          targetTime.setDate(targetTime.getDate() + 1);
        }
        return targetTime;

      case "weekly":
        if (cfg.daysOfWeek.length === 0) return null;
        const sortedDays = [...cfg.daysOfWeek].sort((a, b) => a - b);
        const today = now.getDay();
        
        // Find next day
        let nextDay = sortedDays.find(d => d > today || (d === today && targetTime > now));
        if (nextDay === undefined) {
          nextDay = sortedDays[0];
          targetTime.setDate(targetTime.getDate() + (7 - today + nextDay));
        } else if (nextDay !== today) {
          targetTime.setDate(targetTime.getDate() + (nextDay - today));
        }
        return targetTime;

      case "monthly":
        targetTime.setDate(cfg.dayOfMonth);
        if (targetTime <= now) {
          targetTime.setMonth(targetTime.getMonth() + 1);
        }
        return targetTime;

      case "custom":
        const nextCustom = new Date(now.getTime() + cfg.customIntervalMinutes * 60 * 1000);
        return nextCustom;

      default:
        return null;
    }
  };

  const nextRun = calculateNextRun(config);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!config.name.trim()) {
      newErrors.name = "Schedule name is required";
    }

    if (config.frequency === "weekly" && config.daysOfWeek.length === 0) {
      newErrors.daysOfWeek = "Select at least one day";
    }

    if (config.frequency === "custom" && config.customIntervalMinutes < 5) {
      newErrors.customInterval = "Minimum interval is 5 minutes";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave({
        ...config,
        nextRun: nextRun || undefined,
      });
    }
  };

  const toggleDay = (day: number) => {
    setConfig((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day].sort((a, b) => a - b),
    }));
  };

  const formatNextRun = (date: Date | null): string => {
    if (!date) return "Not scheduled";
    
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
      return `in ${diffMins} minute${diffMins !== 1 ? "s" : ""}`;
    } else if (diffHours < 24) {
      return `in ${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
    } else if (diffDays < 7) {
      return `in ${diffDays} day${diffDays !== 1 ? "s" : ""}`;
    }
    
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Schedule Configuration
        </CardTitle>
        <CardDescription>
          Configure when your trading bot should run automatically
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Schedule Name */}
        <div className="space-y-2">
          <Label htmlFor="schedule-name">Schedule Name</Label>
          <Input
            id="schedule-name"
            placeholder="e.g., Morning Market Open"
            value={config.name}
            onChange={(e) => setConfig((prev) => ({ ...prev, name: e.target.value }))}
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.name}
            </p>
          )}
        </div>

        {/* Enable/Disable */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Schedule</Label>
            <p className="text-sm text-muted-foreground">
              Turn this schedule on or off
            </p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) => setConfig((prev) => ({ ...prev, enabled }))}
          />
        </div>

        {/* Frequency Selection */}
        <div className="space-y-3">
          <Label>Frequency</Label>
          <Tabs
            value={config.frequency}
            onValueChange={(v) => setConfig((prev) => ({ ...prev, frequency: v as ScheduleFrequency }))}
          >
            <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full">
              <TabsTrigger value="once">Once</TabsTrigger>
              <TabsTrigger value="hourly">Hourly</TabsTrigger>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>

            <div className="mt-4 p-4 border rounded-lg bg-muted/30">
              <TabsContent value="once" className="mt-0">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Run the bot once at a specific date and time
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={config.startDate || ""}
                        onChange={(e) => setConfig((prev) => ({ ...prev, startDate: e.target.value }))}
                      />
                    </div>
                    <TimeSelector
                      hour={config.hour}
                      minute={config.minute}
                      onChange={(hour, minute) => setConfig((prev) => ({ ...prev, hour, minute }))}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="hourly" className="mt-0">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Run the bot every hour at a specific minute
                  </p>
                  <div className="space-y-2">
                    <Label>At minute</Label>
                    <Select
                      value={config.minute.toString()}
                      onValueChange={(v) => setConfig((prev) => ({ ...prev, minute: parseInt(v) }))}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 15, 30, 45].map((m) => (
                          <SelectItem key={m} value={m.toString()}>
                            :{m.toString().padStart(2, "0")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="daily" className="mt-0">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Run the bot every day at a specific time
                  </p>
                  <TimeSelector
                    hour={config.hour}
                    minute={config.minute}
                    onChange={(hour, minute) => setConfig((prev) => ({ ...prev, hour, minute }))}
                  />
                </div>
              </TabsContent>

              <TabsContent value="weekly" className="mt-0">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Run the bot on specific days of the week
                  </p>
                  <div className="space-y-2">
                    <Label>Days</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <Button
                          key={day.value}
                          type="button"
                          variant={config.daysOfWeek.includes(day.value) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleDay(day.value)}
                          className="w-12"
                        >
                          {day.label}
                        </Button>
                      ))}
                    </div>
                    {errors.daysOfWeek && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.daysOfWeek}
                      </p>
                    )}
                  </div>
                  <TimeSelector
                    hour={config.hour}
                    minute={config.minute}
                    onChange={(hour, minute) => setConfig((prev) => ({ ...prev, hour, minute }))}
                  />
                </div>
              </TabsContent>

              <TabsContent value="monthly" className="mt-0">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Run the bot on a specific day each month
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Day of month</Label>
                      <Select
                        value={config.dayOfMonth.toString()}
                        onValueChange={(v) => setConfig((prev) => ({ ...prev, dayOfMonth: parseInt(v) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                            <SelectItem key={d} value={d.toString()}>
                              {d}{getOrdinalSuffix(d)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <TimeSelector
                      hour={config.hour}
                      minute={config.minute}
                      onChange={(hour, minute) => setConfig((prev) => ({ ...prev, hour, minute }))}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="custom" className="mt-0">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Run the bot at a custom interval
                  </p>
                  <div className="space-y-2">
                    <Label>Run every</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={5}
                        max={1440}
                        value={config.customIntervalMinutes}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            customIntervalMinutes: parseInt(e.target.value) || 60,
                          }))
                        }
                        className={cn("w-24", errors.customInterval && "border-destructive")}
                      />
                      <span className="text-muted-foreground">minutes</span>
                    </div>
                    {errors.customInterval && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.customInterval}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Common intervals: 15 min, 30 min, 60 min (1 hour), 240 min (4 hours)
                    </p>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <Label>Timezone</Label>
          <Select
            value={config.timezone}
            onValueChange={(v) => setConfig((prev) => ({ ...prev, timezone: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Next Run Preview */}
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Next Run</p>
              <p className="text-lg font-semibold text-primary">
                {config.enabled ? formatNextRun(nextRun) : "Schedule disabled"}
              </p>
            </div>
            <Badge variant={config.enabled ? "default" : "secondary"}>
              {config.enabled ? (
                <><Play className="w-3 h-3 mr-1" /> Active</>
              ) : (
                <><Pause className="w-3 h-3 mr-1" /> Paused</>
              )}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Schedule
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Time selector sub-component
interface TimeSelectorProps {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}

function TimeSelector({ hour, minute, onChange }: TimeSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>Time</Label>
      <div className="flex items-center gap-2">
        <Select
          value={hour.toString()}
          onValueChange={(v) => onChange(parseInt(v), minute)}
        >
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 24 }, (_, i) => (
              <SelectItem key={i} value={i.toString()}>
                {i.toString().padStart(2, "0")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-lg font-bold">:</span>
        <Select
          value={minute.toString()}
          onValueChange={(v) => onChange(hour, parseInt(v))}
        >
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[0, 15, 30, 45].map((m) => (
              <SelectItem key={m} value={m.toString()}>
                {m.toString().padStart(2, "0")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

// Schedule List Component
interface ScheduleListItemProps {
  schedule: ScheduleConfig;
  onEdit: (schedule: ScheduleConfig) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number, enabled: boolean) => void;
}

export function ScheduleListItem({
  schedule,
  onEdit,
  onDelete,
  onToggle,
}: ScheduleListItemProps) {
  const getFrequencyLabel = (freq: ScheduleFrequency): string => {
    switch (freq) {
      case "once": return "One-time";
      case "hourly": return "Hourly";
      case "daily": return "Daily";
      case "weekly": return "Weekly";
      case "monthly": return "Monthly";
      case "custom": return `Every ${schedule.customIntervalMinutes} min`;
    }
  };

  const getScheduleDescription = (): string => {
    const time = `${schedule.hour.toString().padStart(2, "0")}:${schedule.minute.toString().padStart(2, "0")}`;
    
    switch (schedule.frequency) {
      case "once":
        return `Once on ${schedule.startDate || "TBD"} at ${time}`;
      case "hourly":
        return `Every hour at :${schedule.minute.toString().padStart(2, "0")}`;
      case "daily":
        return `Every day at ${time}`;
      case "weekly":
        const days = schedule.daysOfWeek
          .map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.label)
          .join(", ");
        return `${days} at ${time}`;
      case "monthly":
        return `${schedule.dayOfMonth}${getOrdinalSuffix(schedule.dayOfMonth)} of each month at ${time}`;
      case "custom":
        return `Every ${schedule.customIntervalMinutes} minutes`;
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-2 h-2 rounded-full",
          schedule.enabled ? "bg-green-500" : "bg-muted-foreground"
        )} />
        <div>
          <p className="font-medium">{schedule.name}</p>
          <p className="text-sm text-muted-foreground">{getScheduleDescription()}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline">{getFrequencyLabel(schedule.frequency)}</Badge>
        <Switch
          checked={schedule.enabled}
          onCheckedChange={(enabled) => schedule.id && onToggle(schedule.id, enabled)}
        />
        <Button variant="ghost" size="icon" onClick={() => onEdit(schedule)}>
          <Calendar className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={() => schedule.id && onDelete(schedule.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
