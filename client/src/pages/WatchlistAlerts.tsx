/**
 * Watchlist Alerts Page
 * 
 * Allows users to create and manage alerts for:
 * - AI recommendation changes
 * - Confidence level changes
 * - Price targets (high/low)
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Bell,
  BellOff,
  Plus,
  Trash2,
  Edit,
  TrendingUp,
  TrendingDown,
  Target,
  Mail,
  Smartphone,
  History,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Type for watchlist alert
type WatchlistAlertType = {
  id: number;
  symbol: string;
  alertOnRecommendationChange: boolean;
  alertOnConfidenceChange: boolean;
  confidenceThreshold: string | null;
  alertOnPriceTarget: boolean;
  priceTargetHigh: string | null;
  priceTargetLow: string | null;
  emailNotification: boolean;
  pushNotification: boolean;
  isActive: boolean;
  lastAlertAt: Date | null;
  createdAt: Date;
};


// Create/Edit Alert Form
interface AlertFormData {
  symbol: string;
  alertOnRecommendationChange: boolean;
  alertOnConfidenceChange: boolean;
  confidenceThreshold: number;
  alertOnPriceTarget: boolean;
  priceTargetHigh: string;
  priceTargetLow: string;
  emailNotification: boolean;
  pushNotification: boolean;
}

const defaultFormData: AlertFormData = {
  symbol: "",
  alertOnRecommendationChange: true,
  alertOnConfidenceChange: false,
  confidenceThreshold: 0.1,
  alertOnPriceTarget: false,
  priceTargetHigh: "",
  priceTargetLow: "",
  emailNotification: true,
  pushNotification: true,
};

export default function WatchlistAlertTypes() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteAlertId, setDeleteAlertId] = useState<number | null>(null);
  const [editingAlert, setEditingAlert] = useState<WatchlistAlertType | null>(null);
  const [formData, setFormData] = useState<AlertFormData>(defaultFormData);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch alerts
  const { data: alerts, isLoading: alertsLoading, refetch: refetchAlerts } = 
    trpc.watchlistAlerts.list.useQuery();

  // Fetch alert history
  const { data: alertHistory, isLoading: historyLoading } = 
    trpc.watchlistAlerts.getHistory.useQuery({ limit: 50 });

  // Mutations
  const createAlert = trpc.watchlistAlerts.create.useMutation({
    onSuccess: () => {
      toast.success("Alert created");
      setIsCreateDialogOpen(false);
      setFormData(defaultFormData);
      refetchAlerts();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateAlert = trpc.watchlistAlerts.update.useMutation({
    onSuccess: () => {
      toast.success("Alert updated");
      setIsEditDialogOpen(false);
      setEditingAlert(null);
      refetchAlerts();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteAlert = trpc.watchlistAlerts.delete.useMutation({
    onSuccess: () => {
      toast.success("Alert deleted");
      setDeleteAlertId(null);
      refetchAlerts();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Filter alerts by search
  const filteredAlerts = alerts?.filter((alert) =>
    alert.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle form submission
  const handleCreateSubmit = () => {
    if (!formData.symbol.trim()) {
      toast.error("Please enter a symbol");
      return;
    }

    createAlert.mutate({
      symbol: formData.symbol.toUpperCase(),
      alertOnRecommendationChange: formData.alertOnRecommendationChange,
      alertOnConfidenceChange: formData.alertOnConfidenceChange,
      confidenceThreshold: formData.alertOnConfidenceChange ? formData.confidenceThreshold : undefined,
      alertOnPriceTarget: formData.alertOnPriceTarget,
      priceTargetHigh: formData.priceTargetHigh ? parseFloat(formData.priceTargetHigh) : undefined,
      priceTargetLow: formData.priceTargetLow ? parseFloat(formData.priceTargetLow) : undefined,
      emailNotification: formData.emailNotification,
      pushNotification: formData.pushNotification,
    });
  };

  // Handle edit
  const handleEditClick = (alert: WatchlistAlertType) => {
    setEditingAlert(alert);
    setFormData({
      symbol: alert.symbol,
      alertOnRecommendationChange: alert.alertOnRecommendationChange,
      alertOnConfidenceChange: alert.alertOnConfidenceChange,
      confidenceThreshold: alert.confidenceThreshold ? parseFloat(alert.confidenceThreshold) : 0.1,
      alertOnPriceTarget: alert.alertOnPriceTarget,
      priceTargetHigh: alert.priceTargetHigh || "",
      priceTargetLow: alert.priceTargetLow || "",
      emailNotification: alert.emailNotification,
      pushNotification: alert.pushNotification,
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = () => {
    if (!editingAlert) return;

    updateAlert.mutate({
      id: editingAlert.id,
      alertOnRecommendationChange: formData.alertOnRecommendationChange,
      alertOnConfidenceChange: formData.alertOnConfidenceChange,
      confidenceThreshold: formData.alertOnConfidenceChange ? formData.confidenceThreshold : undefined,
      alertOnPriceTarget: formData.alertOnPriceTarget,
      priceTargetHigh: formData.priceTargetHigh ? parseFloat(formData.priceTargetHigh) : undefined,
      priceTargetLow: formData.priceTargetLow ? parseFloat(formData.priceTargetLow) : undefined,
      emailNotification: formData.emailNotification,
      pushNotification: formData.pushNotification,
    });
  };

  // Toggle alert active status
  const handleToggleActive = (alert: WatchlistAlertType) => {
    updateAlert.mutate({
      id: alert.id,
      isActive: !alert.isActive,
    });
  };

  // Get alert type badges
  const getAlertTypeBadges = (alert: WatchlistAlertType) => {
    const badges = [];
    if (alert.alertOnRecommendationChange) {
      badges.push(
        <Badge key="rec" variant="secondary" className="text-xs">
          <TrendingUp className="h-3 w-3 mr-1" />
          Recommendation
        </Badge>
      );
    }
    if (alert.alertOnConfidenceChange) {
      badges.push(
        <Badge key="conf" variant="secondary" className="text-xs">
          <Target className="h-3 w-3 mr-1" />
          Confidence
        </Badge>
      );
    }
    if (alert.alertOnPriceTarget) {
      badges.push(
        <Badge key="price" variant="secondary" className="text-xs">
          <TrendingDown className="h-3 w-3 mr-1" />
          Price Target
        </Badge>
      );
    }
    return badges;
  };

  // Alert Form Component
  const AlertForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-6">
      {/* Symbol Input */}
      {!isEdit && (
        <div className="space-y-2">
          <Label htmlFor="symbol">Stock Symbol</Label>
          <Input
            id="symbol"
            placeholder="e.g., AAPL, GOOGL, MSFT"
            value={formData.symbol}
            onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
            className="uppercase"
          />
        </div>
      )}

      {/* Alert Types */}
      <div className="space-y-4">
        <Label>Alert Types</Label>
        
        {/* Recommendation Change */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="font-medium">Recommendation Change</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Get notified when AI recommendation changes (e.g., Buy → Sell)
            </p>
          </div>
          <Switch
            checked={formData.alertOnRecommendationChange}
            onCheckedChange={(checked) => 
              setFormData({ ...formData, alertOnRecommendationChange: checked })
            }
          />
        </div>

        {/* Confidence Change */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="font-medium">Confidence Change</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Get notified when confidence level changes significantly
            </p>
          </div>
          <Switch
            checked={formData.alertOnConfidenceChange}
            onCheckedChange={(checked) => 
              setFormData({ ...formData, alertOnConfidenceChange: checked })
            }
          />
        </div>

        {formData.alertOnConfidenceChange && (
          <div className="ml-6 space-y-2">
            <Label htmlFor="confidenceThreshold">Threshold (%)</Label>
            <Input
              id="confidenceThreshold"
              type="number"
              min="1"
              max="100"
              value={formData.confidenceThreshold * 100}
              onChange={(e) => 
                setFormData({ 
                  ...formData, 
                  confidenceThreshold: parseFloat(e.target.value) / 100 
                })
              }
              className="w-24"
            />
            <p className="text-xs text-muted-foreground">
              Alert when confidence changes by more than this percentage
            </p>
          </div>
        )}

        {/* Price Target */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-orange-500" />
              <span className="font-medium">Price Target</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Get notified when price reaches your target
            </p>
          </div>
          <Switch
            checked={formData.alertOnPriceTarget}
            onCheckedChange={(checked) => 
              setFormData({ ...formData, alertOnPriceTarget: checked })
            }
          />
        </div>

        {formData.alertOnPriceTarget && (
          <div className="ml-6 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priceTargetHigh">High Target ($)</Label>
              <Input
                id="priceTargetHigh"
                type="number"
                step="0.01"
                placeholder="e.g., 200.00"
                value={formData.priceTargetHigh}
                onChange={(e) => 
                  setFormData({ ...formData, priceTargetHigh: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceTargetLow">Low Target ($)</Label>
              <Input
                id="priceTargetLow"
                type="number"
                step="0.01"
                placeholder="e.g., 150.00"
                value={formData.priceTargetLow}
                onChange={(e) => 
                  setFormData({ ...formData, priceTargetLow: e.target.value })
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Notification Methods */}
      <div className="space-y-4">
        <Label>Notification Methods</Label>
        
        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>Email Notifications</span>
          </div>
          <Switch
            checked={formData.emailNotification}
            onCheckedChange={(checked) => 
              setFormData({ ...formData, emailNotification: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            <span>Push Notifications</span>
          </div>
          <Switch
            checked={formData.pushNotification}
            onCheckedChange={(checked) => 
              setFormData({ ...formData, pushNotification: checked })
            }
          />
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Watchlist Alerts</h1>
            <p className="text-muted-foreground">
              Get notified when AI recommendations or prices change
            </p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Alert
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Watchlist Alert</DialogTitle>
                <DialogDescription>
                  Set up alerts for stock price or recommendation changes
                </DialogDescription>
              </DialogHeader>
              <AlertForm />
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateSubmit}
                  disabled={createAlert.isPending}
                >
                  {createAlert.isPending ? "Creating..." : "Create Alert"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active" className="gap-2">
              <Bell className="h-4 w-4" />
              Active Alerts
              {alerts && alerts.filter(a => a.isActive).length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {alerts.filter(a => a.isActive).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Alert History
            </TabsTrigger>
          </TabsList>

          {/* Active Alerts Tab */}
          <TabsContent value="active" className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Alerts List */}
            {alertsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredAlerts && filteredAlerts.length > 0 ? (
              <div className="space-y-4">
                {filteredAlerts.map((alert) => (
                  <Card key={alert.id} className={!alert.isActive ? "opacity-60" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold">{alert.symbol}</span>
                            <Badge 
                              variant={alert.isActive ? "default" : "secondary"}
                              className={alert.isActive ? "bg-green-500/20 text-green-500" : ""}
                            >
                              {alert.isActive ? "Active" : "Paused"}
                            </Badge>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            {getAlertTypeBadges(alert)}
                          </div>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {alert.emailNotification && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" /> Email
                              </span>
                            )}
                            {alert.pushNotification && (
                              <span className="flex items-center gap-1">
                                <Smartphone className="h-3 w-3" /> Push
                              </span>
                            )}
                            {alert.lastAlertAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Last triggered {formatDistanceToNow(new Date(alert.lastAlertAt), { addSuffix: true })}
                              </span>
                            )}
                          </div>

                          {alert.alertOnPriceTarget && (alert.priceTargetHigh || alert.priceTargetLow) && (
                            <div className="text-xs text-muted-foreground">
                              Price targets: 
                              {alert.priceTargetLow && ` Low: $${parseFloat(alert.priceTargetLow).toFixed(2)}`}
                              {alert.priceTargetHigh && ` High: $${parseFloat(alert.priceTargetHigh).toFixed(2)}`}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(alert)}
                            title={alert.isActive ? "Pause alert" : "Activate alert"}
                          >
                            {alert.isActive ? (
                              <BellOff className="h-4 w-4" />
                            ) : (
                              <Bell className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(alert)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => setDeleteAlertId(alert.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No alerts yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Create your first watchlist alert to get notified about price and recommendation changes
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Alert
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Alert History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Alert History</CardTitle>
                <CardDescription>
                  Recent alerts that have been triggered
                </CardDescription>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : alertHistory && alertHistory.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Change</TableHead>
                        <TableHead>Sent Via</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alertHistory.map((history) => (
                        <TableRow key={history.id}>
                          <TableCell className="font-medium">
                            {history.symbol}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {history.alertType?.replace("_", " ") || "Alert"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {history.previousValue && history.newValue ? (
                              <span>
                                {history.previousValue} → {history.newValue}
                              </span>
                            ) : (
                              history.message || "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {history.emailSent && (
                                <Mail className="h-3 w-3" />
                              )}
                              {history.pushSent && (
                                <Smartphone className="h-3 w-3" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDistanceToNow(new Date(history.createdAt), { addSuffix: true })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <History className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No alert history yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Alert - {editingAlert?.symbol}</DialogTitle>
              <DialogDescription>
                Update your alert settings
              </DialogDescription>
            </DialogHeader>
            <AlertForm isEdit />
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleEditSubmit}
                disabled={updateAlert.isPending}
              >
                {updateAlert.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteAlertId !== null} onOpenChange={() => setDeleteAlertId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Alert</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this alert? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 hover:bg-red-600"
                onClick={() => {
                  if (deleteAlertId) {
                    deleteAlert.mutate({ id: deleteAlertId });
                  }
                }}
              >
                {deleteAlert.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
