import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Mail, 
  Settings, 
  Send, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  EyeOff,
  RefreshCw,
  Shield,
  BarChart3
} from "lucide-react";

export default function AdminEmailSettings() {
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [isTesting, setIsTesting] = useState(false);

  // Fetch email configuration
  const { data: config, isLoading, refetch } = trpc.admin.getEmailConfig.useQuery();
  const { data: stats } = trpc.admin.getEmailStats.useQuery();

  // Mutations
  const updateConfig = trpc.admin.updateEmailConfig.useMutation({
    onSuccess: () => {
      toast.success("Email configuration updated");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const testConnection = trpc.admin.testEmailConnection.useMutation({
    onSuccess: (result) => {
      setIsTesting(false);
      if (result.success) {
        toast.success("Test email sent successfully!");
      } else {
        toast.error(result.error || "Failed to send test email");
      }
    },
    onError: (error) => {
      setIsTesting(false);
      toast.error(error.message);
    },
  });

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      toast.error("Please enter an API key");
      return;
    }
    updateConfig.mutate({ sendgridApiKey: apiKey });
    setApiKey("");
  };

  const handleTestEmail = () => {
    if (!testEmail.trim()) {
      toast.error("Please enter a test email address");
      return;
    }
    setIsTesting(true);
    testConnection.mutate({ 
      testEmail,
      apiKey: apiKey || undefined 
    });
  };

  const handleToggleEnabled = (enabled: boolean) => {
    updateConfig.mutate({ isEnabled: enabled });
  };

  const handleToggleTestMode = (testMode: boolean) => {
    updateConfig.mutate({ testMode });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Email Configuration</h1>
            <p className="text-muted-foreground">
              Configure SendGrid for email notifications
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={config?.isEnabled ? "default" : "secondary"}>
              {config?.isEnabled ? "Enabled" : "Disabled"}
            </Badge>
            {config?.testMode && (
              <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                Test Mode
              </Badge>
            )}
          </div>
        </div>

        {/* Status Alert */}
        {!config?.hasApiKey && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              SendGrid API key is not configured. Email notifications will not work until you add an API key.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="settings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="test" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Test
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Statistics
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* API Key Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    SendGrid API Key
                  </CardTitle>
                  <CardDescription>
                    Enter your SendGrid API key to enable email sending
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="apiKey"
                          type={showApiKey ? "text" : "password"}
                          placeholder={config?.hasApiKey ? "••••••••••••••••" : "SG.xxxxxxxx..."}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button onClick={handleSaveApiKey} disabled={updateConfig.isPending}>
                        Save
                      </Button>
                    </div>
                    {config?.hasApiKey && (
                      <p className="text-sm text-green-500 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        API key is configured
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Sender Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Sender Settings
                  </CardTitle>
                  <CardDescription>
                    Configure the sender email and name
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="senderEmail">Sender Email</Label>
                    <Input
                      id="senderEmail"
                      type="email"
                      placeholder="noreply@tradoverse.com"
                      defaultValue={config?.senderEmail || ""}
                      onBlur={(e) => {
                        if (e.target.value !== config?.senderEmail) {
                          updateConfig.mutate({ senderEmail: e.target.value });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senderName">Sender Name</Label>
                    <Input
                      id="senderName"
                      placeholder="TradoVerse"
                      defaultValue={config?.senderName || ""}
                      onBlur={(e) => {
                        if (e.target.value !== config?.senderName) {
                          updateConfig.mutate({ senderName: e.target.value });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="replyToEmail">Reply-To Email (optional)</Label>
                    <Input
                      id="replyToEmail"
                      type="email"
                      placeholder="support@tradoverse.com"
                      defaultValue={config?.replyToEmail || ""}
                      onBlur={(e) => {
                        if (e.target.value !== config?.replyToEmail) {
                          updateConfig.mutate({ replyToEmail: e.target.value || null });
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Toggle Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Email Settings</CardTitle>
                <CardDescription>
                  Control email sending behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Email Sending</Label>
                    <p className="text-sm text-muted-foreground">
                      Turn on to allow the platform to send emails
                    </p>
                  </div>
                  <Switch
                    checked={config?.isEnabled || false}
                    onCheckedChange={handleToggleEnabled}
                    disabled={!config?.hasApiKey}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Test Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      When enabled, all emails are sent to the test email address
                    </p>
                  </div>
                  <Switch
                    checked={config?.testMode || false}
                    onCheckedChange={handleToggleTestMode}
                  />
                </div>

                {config?.testMode && (
                  <div className="space-y-2">
                    <Label htmlFor="testModeEmail">Test Mode Email</Label>
                    <Input
                      id="testModeEmail"
                      type="email"
                      placeholder="test@example.com"
                      defaultValue={config?.testEmail || ""}
                      onBlur={(e) => {
                        if (e.target.value !== config?.testEmail) {
                          updateConfig.mutate({ testEmail: e.target.value || null });
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      All emails will be redirected to this address in test mode
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="dailyLimit">Daily Email Limit</Label>
                  <Input
                    id="dailyLimit"
                    type="number"
                    min={1}
                    max={100000}
                    defaultValue={config?.dailyLimit || 1000}
                    onBlur={(e) => {
                      const value = parseInt(e.target.value);
                      if (value !== config?.dailyLimit && value > 0) {
                        updateConfig.mutate({ dailyLimit: value });
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of emails to send per day
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Test Tab */}
          <TabsContent value="test">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Send Test Email
                </CardTitle>
                <CardDescription>
                  Test your email configuration by sending a test email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="testEmailAddress">Recipient Email</Label>
                  <Input
                    id="testEmailAddress"
                    type="email"
                    placeholder="your@email.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                </div>

                {!config?.hasApiKey && (
                  <div className="space-y-2">
                    <Label htmlFor="tempApiKey">Temporary API Key (for testing)</Label>
                    <Input
                      id="tempApiKey"
                      type="password"
                      placeholder="SG.xxxxxxxx..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter an API key to test without saving it
                    </p>
                  </div>
                )}

                <Button 
                  onClick={handleTestEmail} 
                  disabled={isTesting || (!config?.hasApiKey && !apiKey)}
                  className="w-full"
                >
                  {isTesting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Test Email
                    </>
                  )}
                </Button>

                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    A test email will be sent to verify your SendGrid configuration is working correctly.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Emails Sent Today
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats?.emailsSentToday || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    of {stats?.dailyLimit || 1000} daily limit
                  </p>
                  <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all"
                      style={{ 
                        width: `${Math.min(100, ((stats?.emailsSentToday || 0) / (stats?.dailyLimit || 1000)) * 100)}%` 
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {stats?.isEnabled ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-lg font-medium">Active</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-500" />
                        <span className="text-lg font-medium">Disabled</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Email sending is {stats?.isEnabled ? "enabled" : "disabled"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Last Reset
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-medium">
                    {stats?.lastResetAt 
                      ? new Date(stats.lastResetAt).toLocaleDateString()
                      : "Never"
                    }
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Daily counter reset time
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
