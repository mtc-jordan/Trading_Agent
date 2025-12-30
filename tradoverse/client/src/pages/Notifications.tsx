import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useNotificationSubscription } from "@/hooks/useSocket";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, 
  BellOff, 
  Check, 
  CheckCheck, 
  Trash2, 
  Info, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Activity,
  Users,
  CreditCard,
  Settings
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function Notifications() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  
  const utils = trpc.useUtils();
  
  const { data: notifications, isLoading } = trpc.notifications.list.useQuery({
    unreadOnly: filter === "unread",
  });
  
  const { data: unreadCount } = trpc.notifications.getUnreadCount.useQuery();
  
  // Real-time notification subscription
  const { notifications: realtimeNotifications } = useNotificationSubscription();
  
  // Refresh notifications when new real-time notification arrives
  useEffect(() => {
    if (realtimeNotifications.length > 0) {
      utils.notifications.list.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    }
  }, [realtimeNotifications.length]);
  
  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
  });
  
  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.getUnreadCount.invalidate();
      toast.success("All notifications marked as read");
    },
  });
  
  const deleteMutation = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.getUnreadCount.invalidate();
      toast.success("Notification deleted");
    },
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "info": return <Info className="h-4 w-4 text-blue-500" />;
      case "success": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "error": return <XCircle className="h-4 w-4 text-red-500" />;
      case "trade": return <TrendingUp className="h-4 w-4 text-purple-500" />;
      case "analysis": return <Activity className="h-4 w-4 text-cyan-500" />;
      case "social": return <Users className="h-4 w-4 text-pink-500" />;
      case "alert": return <Bell className="h-4 w-4 text-orange-500" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "system": return <Settings className="h-3 w-3" />;
      case "trading": return <TrendingUp className="h-3 w-3" />;
      case "analysis": return <Activity className="h-3 w-3" />;
      case "social": return <Users className="h-3 w-3" />;
      case "billing": return <CreditCard className="h-3 w-3" />;
      default: return null;
    }
  };

  const handleMarkRead = (id: number) => {
    markReadMutation.mutate({ id });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-64 bg-muted rounded" />
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-24 bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Bell className="h-8 w-8" />
            Notifications
            {unreadCount && unreadCount > 0 && (
              <Badge variant="destructive" className="text-sm">
                {unreadCount} new
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            Stay updated with your trading activity and alerts
          </p>
        </div>
        
        {unreadCount && unreadCount > 0 && (
          <Button 
            variant="outline" 
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
        <TabsList>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            All
          </TabsTrigger>
          <TabsTrigger value="unread" className="flex items-center gap-2">
            <BellOff className="h-4 w-4" />
            Unread
            {unreadCount && unreadCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {filter === "all" ? "All Notifications" : "Unread Notifications"}
              </CardTitle>
              <CardDescription>
                {notifications?.length || 0} notification{notifications?.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {notifications && notifications.length > 0 ? (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-4">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border rounded-lg transition-colors ${
                          !notification.isRead 
                            ? "bg-primary/5 border-primary/20" 
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="mt-1">
                            {getTypeIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">
                                {notification.title}
                              </h4>
                              {!notification.isRead && (
                                <Badge variant="default" className="text-xs">
                                  New
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                {getCategoryIcon(notification.category)}
                                <span className="capitalize">{notification.category}</span>
                              </span>
                              <span>
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            {notification.actionUrl && (
                              <Button 
                                variant="link" 
                                className="p-0 h-auto mt-2 text-sm"
                                asChild
                              >
                                <a href={notification.actionUrl}>
                                  {notification.actionLabel || "View Details"} →
                                </a>
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleMarkRead(notification.id)}
                                disabled={markReadMutation.isPending}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(notification.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="py-12 text-center">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No notifications</h3>
                  <p className="text-muted-foreground">
                    {filter === "unread" 
                      ? "You're all caught up! No unread notifications."
                      : "You don't have any notifications yet."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Notification Settings Info */}
      <Card className="bg-muted/50">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Notification Settings</h3>
              <p className="text-sm text-muted-foreground">
                Configure your notification preferences in the Settings page. You can choose 
                which types of notifications you want to receive via email, push, or in-app.
              </p>
              <Button variant="link" className="p-0 h-auto mt-2" asChild>
                <a href="/settings">Go to Settings →</a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  );
}
