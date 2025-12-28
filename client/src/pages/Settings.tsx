import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { 
  Settings as SettingsIcon, 
  Key, 
  Brain, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Activity,
  AlertTriangle,
  Shield,
  BarChart3,
  Clock,
  Coins,
  ArrowUpDown,
  Info,
  Mail,
  Bell,
  BellOff,
  Globe
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

type LlmProvider = "openai" | "deepseek" | "claude" | "gemini";

interface ProviderConfig {
  id: LlmProvider;
  name: string;
  description: string;
  website: string;
  icon: string;
  color: string;
  models: { id: string; name: string; description: string }[];
}

const providerIcons: Record<LlmProvider, { icon: string; color: string; bgColor: string }> = {
  openai: { icon: "🤖", color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
  deepseek: { icon: "🔮", color: "text-purple-400", bgColor: "bg-purple-500/20" },
  claude: { icon: "🧠", color: "text-orange-400", bgColor: "bg-orange-500/20" },
  gemini: { icon: "✨", color: "text-blue-400", bgColor: "bg-blue-500/20" },
};

const CHART_COLORS = ["#10b981", "#8b5cf6", "#f97316", "#3b82f6"];

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const [showApiKey, setShowApiKey] = useState<Record<LlmProvider, boolean>>({
    openai: false,
    deepseek: false,
    claude: false,
    gemini: false,
  });
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<LlmProvider, string>>({
    openai: "",
    deepseek: "",
    claude: "",
    gemini: "",
  });
  const [keyValidation, setKeyValidation] = useState<Record<LlmProvider, { valid: boolean; message: string } | null>>({
    openai: null,
    deepseek: null,
    claude: null,
    gemini: null,
  });
  const [savingKey, setSavingKey] = useState<LlmProvider | null>(null);
  const [testingConnection, setTestingConnection] = useState<LlmProvider | null>(null);
  const [usageDays, setUsageDays] = useState(30);

  // Fetch providers and user settings
  const { data: providers, isLoading: providersLoading } = trpc.llmSettings.getProviders.useQuery();
  const { data: settings, isLoading: settingsLoading, refetch: refetchSettings } = trpc.llmSettings.getSettings.useQuery(
    undefined,
    { enabled: !!user }
  );
  const { data: pricing } = trpc.llmSettings.getPricing.useQuery();
  const { data: usageStats, refetch: refetchUsage } = trpc.llmSettings.getUsageStats.useQuery(
    { days: usageDays },
    { enabled: !!user }
  );
  const { data: usageSummary } = trpc.llmSettings.getUsageSummary.useQuery(
    undefined,
    { enabled: !!user }
  );
  const { data: usageLogs } = trpc.llmSettings.getUsageLogs.useQuery(
    { limit: 10 },
    { enabled: !!user }
  );
  const { data: fallbackSettings, refetch: refetchFallback } = trpc.llmSettings.getFallbackSettings.useQuery(
    undefined,
    { enabled: !!user }
  );
  const { data: configuredProviders } = trpc.llmSettings.getConfiguredProviders.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Mutations
  const setActiveProvider = trpc.llmSettings.setActiveProvider.useMutation({
    onSuccess: () => {
      toast.success("Active provider updated");
      refetchSettings();
    },
    onError: (error) => toast.error(error.message),
  });

  const saveApiKey = trpc.llmSettings.saveApiKey.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setApiKeyInputs(prev => ({ ...prev, [savingKey!]: "" }));
      setKeyValidation(prev => ({ ...prev, [savingKey!]: null }));
      refetchSettings();
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => setSavingKey(null),
  });

  const removeApiKey = trpc.llmSettings.removeApiKey.useMutation({
    onSuccess: () => {
      toast.success("API key removed");
      refetchSettings();
    },
    onError: (error) => toast.error(error.message),
  });

  const setModel = trpc.llmSettings.setModel.useMutation({
    onSuccess: () => {
      toast.success("Model updated");
      refetchSettings();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateSettings = trpc.llmSettings.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Settings updated");
      refetchSettings();
    },
    onError: (error) => toast.error(error.message),
  });

  const testConnection = trpc.llmSettings.testConnection.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.message} (${data.responseTimeMs}ms)`);
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => setTestingConnection(null),
  });

  const updateFallbackSettings = trpc.llmSettings.updateFallbackSettings.useMutation({
    onSuccess: () => {
      toast.success("Fallback settings updated");
      refetchFallback();
    },
    onError: (error) => toast.error(error.message),
  });

  // Real-time API key format validation
  const validateKeyFormat = trpc.llmSettings.validateKeyFormat.useQuery;

  const handleApiKeyChange = (provider: LlmProvider, value: string) => {
    setApiKeyInputs(prev => ({ ...prev, [provider]: value }));
    
    // Basic format validation
    if (!value.trim()) {
      setKeyValidation(prev => ({ ...prev, [provider]: null }));
      return;
    }

    // Provider-specific format checks
    let valid = false;
    let message = "";

    switch (provider) {
      case "openai":
        valid = value.startsWith("sk-") && value.length > 20;
        message = valid ? "Format looks correct" : "Should start with 'sk-' and be at least 20 characters";
        break;
      case "deepseek":
        valid = value.startsWith("sk-") && value.length > 20;
        message = valid ? "Format looks correct" : "Should start with 'sk-' and be at least 20 characters";
        break;
      case "claude":
        valid = value.startsWith("sk-ant-") && value.length > 30;
        message = valid ? "Format looks correct" : "Should start with 'sk-ant-' and be at least 30 characters";
        break;
      case "gemini":
        valid = value.length >= 30;
        message = valid ? "Format looks correct" : "Should be at least 30 characters";
        break;
    }

    setKeyValidation(prev => ({ ...prev, [provider]: { valid, message } }));
  };

  const handleSaveApiKey = (provider: LlmProvider) => {
    const apiKey = apiKeyInputs[provider];
    if (!apiKey.trim()) {
      toast.error("Please enter an API key");
      return;
    }
    setSavingKey(provider);
    saveApiKey.mutate({ provider, apiKey });
  };

  const handleTestConnection = (provider: LlmProvider) => {
    setTestingConnection(provider);
    testConnection.mutate({ provider });
  };

  const hasKey = (provider: LlmProvider): boolean => {
    if (!settings) return false;
    switch (provider) {
      case "openai": return settings.hasOpenaiKey;
      case "deepseek": return settings.hasDeepseekKey;
      case "claude": return settings.hasClaudeKey;
      case "gemini": return settings.hasGeminiKey;
      default: return false;
    }
  };

  const getSelectedModel = (provider: LlmProvider): string => {
    if (!settings) return "";
    switch (provider) {
      case "openai": return settings.openaiModel;
      case "deepseek": return settings.deepseekModel;
      case "claude": return settings.claudeModel;
      case "gemini": return settings.geminiModel;
      default: return "";
    }
  };

  // Prepare chart data
  const usageChartData = useMemo(() => {
    if (!usageStats?.byDay) return [];
    return usageStats.byDay.map(day => ({
      date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      cost: day.costCents / 100,
      tokens: day.tokens / 1000,
      calls: day.calls,
    }));
  }, [usageStats]);

  const providerPieData = useMemo(() => {
    if (!usageStats?.byProvider) return [];
    return Object.entries(usageStats.byProvider).map(([provider, data], index) => ({
      name: provider.charAt(0).toUpperCase() + provider.slice(1),
      value: data.costCents / 100,
      calls: data.calls,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [usageStats]);

  if (authLoading || providersLoading || settingsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to access settings.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <SettingsIcon className="h-6 w-6 text-primary" />
                Settings
              </h1>
              <p className="text-muted-foreground">Configure your AI providers, usage tracking, and preferences</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <Tabs defaultValue="ai-providers" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="ai-providers" className="gap-2">
              <Brain className="h-4 w-4" />
              AI Providers
            </TabsTrigger>
            <TabsTrigger value="usage" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Usage & Billing
            </TabsTrigger>
            <TabsTrigger value="fallback" className="gap-2">
              <Shield className="h-4 w-4" />
              Fallback
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2">
              <Zap className="h-4 w-4" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          {/* AI Providers Tab */}
          <TabsContent value="ai-providers" className="space-y-6">
            {/* Active Provider Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Active AI Provider
                </CardTitle>
                <CardDescription>
                  Select which AI provider to use for market analysis. The selected provider will power all 7 AI agents.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {providers?.map((provider) => {
                    const isActive = settings?.activeProvider === provider.id;
                    const hasApiKey = hasKey(provider.id);
                    const iconConfig = providerIcons[provider.id];

                    return (
                      <button
                        key={provider.id}
                        onClick={() => {
                          if (hasApiKey) {
                            setActiveProvider.mutate({ provider: provider.id });
                          } else {
                            toast.error(`Please add an API key for ${provider.name} first`);
                          }
                        }}
                        className={`relative p-4 rounded-lg border-2 transition-all ${
                          isActive
                            ? "border-primary bg-primary/10"
                            : hasApiKey
                            ? "border-border hover:border-primary/50 bg-card"
                            : "border-border/50 bg-card/50 opacity-60"
                        }`}
                      >
                        {isActive && (
                          <div className="absolute -top-2 -right-2">
                            <Badge className="bg-primary text-primary-foreground">Active</Badge>
                          </div>
                        )}
                        <div className="text-3xl mb-2">{iconConfig.icon}</div>
                        <div className="font-semibold">{provider.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {hasApiKey ? (
                            <span className="text-green-400 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Connected
                            </span>
                          ) : (
                            <span className="text-muted-foreground flex items-center gap-1">
                              <XCircle className="h-3 w-3" /> No API Key
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Provider Configuration Cards */}
            <div className="grid gap-6">
              {providers?.map((provider) => {
                const iconConfig = providerIcons[provider.id];
                const hasApiKey = hasKey(provider.id);
                const validation = keyValidation[provider.id];
                const isTestingThis = testingConnection === provider.id;
                const isSavingThis = savingKey === provider.id;

                return (
                  <Card key={provider.id} className={`${hasApiKey ? 'border-green-500/30' : ''}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`text-2xl p-2 rounded-lg ${iconConfig.bgColor}`}>
                            {iconConfig.icon}
                          </div>
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              {provider.name}
                              {hasApiKey && (
                                <Badge variant="outline" className="text-green-400 border-green-400/30">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Connected
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription>{provider.description}</CardDescription>
                          </div>
                        </div>
                        <a
                          href={provider.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* API Key Input with Real-time Validation */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Key className="h-4 w-4" />
                          API Key
                        </Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              type={showApiKey[provider.id] ? "text" : "password"}
                              placeholder={hasApiKey ? "••••••••••••••••" : `Enter your ${provider.name} API key`}
                              value={apiKeyInputs[provider.id]}
                              onChange={(e) => handleApiKeyChange(provider.id, e.target.value)}
                              className={`pr-10 ${
                                validation 
                                  ? validation.valid 
                                    ? 'border-green-500/50 focus:border-green-500' 
                                    : 'border-yellow-500/50 focus:border-yellow-500'
                                  : ''
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowApiKey(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showApiKey[provider.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <Button
                            onClick={() => handleSaveApiKey(provider.id)}
                            disabled={isSavingThis || !apiKeyInputs[provider.id].trim()}
                          >
                            {isSavingThis ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Save"
                            )}
                          </Button>
                        </div>
                        {/* Validation Feedback */}
                        {validation && (
                          <div className={`flex items-center gap-2 text-sm ${validation.valid ? 'text-green-400' : 'text-yellow-400'}`}>
                            {validation.valid ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <AlertTriangle className="h-4 w-4" />
                            )}
                            {validation.message}
                          </div>
                        )}
                      </div>

                      {hasApiKey && (
                        <>
                          <Separator />
                          
                          {/* Model Selection */}
                          <div className="space-y-2">
                            <Label>Model</Label>
                            <Select
                              value={getSelectedModel(provider.id)}
                              onValueChange={(value) => setModel.mutate({ provider: provider.id, model: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a model" />
                              </SelectTrigger>
                              <SelectContent>
                                {provider.models.map((model) => (
                                  <SelectItem key={model.id} value={model.id}>
                                    <div>
                                      <div className="font-medium">{model.name}</div>
                                      <div className="text-xs text-muted-foreground">{model.description}</div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTestConnection(provider.id)}
                              disabled={isTestingThis}
                              className="flex-1"
                            >
                              {isTestingThis ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Testing...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Test Connection
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Are you sure you want to remove the ${provider.name} API key?`)) {
                                  removeApiKey.mutate({ provider: provider.id });
                                }
                              }}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Usage & Billing Tab */}
          <TabsContent value="usage" className="space-y-6">
            {/* Usage Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <DollarSign className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Cost (30d)</p>
                      <p className="text-2xl font-bold">{usageSummary?.formattedTotalCost || "$0.00"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <Coins className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Tokens</p>
                      <p className="text-2xl font-bold">{usageSummary?.formattedTotalTokens || "0"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <Activity className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">API Calls</p>
                      <p className="text-2xl font-bold">{usageSummary?.callCount || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/20">
                      <TrendingUp className="h-5 w-5 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Daily Avg</p>
                      <p className="text-2xl font-bold">{usageSummary?.formattedDailyAvgCost || "$0.00"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Usage Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cost Over Time Chart */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Cost Over Time
                    </CardTitle>
                    <Select value={usageDays.toString()} onValueChange={(v) => setUsageDays(parseInt(v))}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">Last 7 days</SelectItem>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="90">Last 90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {usageChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={usageChartData}>
                          <defs>
                            <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis dataKey="date" stroke="#666" fontSize={12} />
                          <YAxis stroke="#666" fontSize={12} tickFormatter={(v) => `$${v}`} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                            formatter={(value: number) => [`$${value.toFixed(4)}`, 'Cost']}
                          />
                          <Area type="monotone" dataKey="cost" stroke="#10b981" fill="url(#colorCost)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No usage data yet</p>
                          <p className="text-sm">Start using AI analysis to see your costs</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Provider Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Provider Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {providerPieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={providerPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {providerPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                            formatter={(value: number, name: string) => [`$${value.toFixed(4)}`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No provider data yet</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {providerPieData.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-4 mt-4">
                      {providerPieData.map((entry) => (
                        <div key={entry.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="text-sm">{entry.name}: {entry.calls} calls</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Usage Logs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Recent API Calls
                </CardTitle>
              </CardHeader>
              <CardContent>
                {usageLogs && usageLogs.length > 0 ? (
                  <div className="space-y-2">
                    {usageLogs.map((log: any) => (
                      <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border">
                        <div className="flex items-center gap-3">
                          <div className={`text-xl ${providerIcons[log.provider as LlmProvider]?.bgColor} p-2 rounded-lg`}>
                            {providerIcons[log.provider as LlmProvider]?.icon}
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {log.provider.charAt(0).toUpperCase() + log.provider.slice(1)}
                              {log.wasFallback && (
                                <Badge variant="outline" className="text-yellow-400 border-yellow-400/30 text-xs">
                                  Fallback
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {log.model} • {log.agentType || 'Analysis'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{log.formattedCost}</div>
                          <div className="text-sm text-muted-foreground">
                            {log.formattedTokens} tokens • {log.responseTimeMs}ms
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No API calls yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pricing Reference */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  Pricing Reference
                </CardTitle>
                <CardDescription>Current pricing per 1M tokens for each provider</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {pricing && Object.entries(pricing).map(([provider, models]: [string, any]) => (
                    <div key={provider} className={`p-4 rounded-lg ${providerIcons[provider as LlmProvider]?.bgColor}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">{providerIcons[provider as LlmProvider]?.icon}</span>
                        <span className="font-semibold">{provider.charAt(0).toUpperCase() + provider.slice(1)}</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        {Object.entries(models).slice(0, 2).map(([model, price]: [string, any]) => (
                          <div key={model} className="flex justify-between">
                            <span className="text-muted-foreground truncate mr-2">{model}</span>
                            <span>${price.input}/in</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fallback Settings Tab */}
          <TabsContent value="fallback" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Automatic Fallback
                </CardTitle>
                <CardDescription>
                  Configure automatic fallback to alternative providers when your primary provider fails or rate limits.
                  This ensures uninterrupted trading analysis.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable Fallback */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Enable Automatic Fallback</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically switch to backup providers on failure
                    </p>
                  </div>
                  <Switch
                    checked={fallbackSettings?.fallbackEnabled ?? true}
                    onCheckedChange={(checked) => updateFallbackSettings.mutate({ fallbackEnabled: checked })}
                  />
                </div>

                <Separator />

                {/* Fallback Priority */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-base">Fallback Priority Order</Label>
                    <p className="text-sm text-muted-foreground mb-4">
                      Drag to reorder. Only providers with configured API keys will be used.
                    </p>
                  </div>
                  <div className="space-y-2">
                    {(fallbackSettings?.fallbackPriority || ["openai", "claude", "deepseek", "gemini"]).map((provider, index) => {
                      const isConfigured = configuredProviders?.includes(provider as LlmProvider);
                      const iconConfig = providerIcons[provider as LlmProvider];
                      
                      return (
                        <div
                          key={provider}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            isConfigured ? 'border-border bg-card' : 'border-border/50 bg-card/30 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground font-bold">
                            {index + 1}
                          </div>
                          <div className={`text-xl p-2 rounded-lg ${iconConfig.bgColor}`}>
                            {iconConfig.icon}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{provider.charAt(0).toUpperCase() + provider.slice(1)}</div>
                            <div className="text-sm text-muted-foreground">
                              {isConfigured ? (
                                <span className="text-green-400 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> API Key Configured
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <XCircle className="h-3 w-3" /> No API Key
                                </span>
                              )}
                            </div>
                          </div>
                          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                {/* Retry Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Max Retries per Provider</Label>
                    <Select
                      value={(fallbackSettings?.maxRetries ?? 2).toString()}
                      onValueChange={(v) => updateFallbackSettings.mutate({ maxRetries: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">No retries (immediate fallback)</SelectItem>
                        <SelectItem value="1">1 retry</SelectItem>
                        <SelectItem value="2">2 retries</SelectItem>
                        <SelectItem value="3">3 retries</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Number of retry attempts before switching to fallback provider
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Retry Delay</Label>
                    <Select
                      value={(fallbackSettings?.retryDelayMs ?? 1000).toString()}
                      onValueChange={(v) => updateFallbackSettings.mutate({ retryDelayMs: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="500">500ms</SelectItem>
                        <SelectItem value="1000">1 second</SelectItem>
                        <SelectItem value="2000">2 seconds</SelectItem>
                        <SelectItem value="5000">5 seconds</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Wait time between retry attempts
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Notifications */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Notify on Fallback</Label>
                    <p className="text-sm text-muted-foreground">
                      Show a notification when a fallback provider is used
                    </p>
                  </div>
                  <Switch
                    checked={fallbackSettings?.notifyOnFallback ?? true}
                    onCheckedChange={(checked) => updateFallbackSettings.mutate({ notifyOnFallback: checked })}
                  />
                </div>

                {/* Stats */}
                {usageStats && usageStats.fallbackRate > 0 && (
                  <>
                    <Separator />
                    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                      <div className="flex items-center gap-2 text-yellow-400 mb-2">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-medium">Fallback Statistics</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        In the last {usageDays} days, {usageStats.fallbackRate}% of your API calls used a fallback provider.
                        Consider checking your primary provider's status or increasing rate limits.
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  AI Generation Settings
                </CardTitle>
                <CardDescription>
                  Configure how the AI generates responses. These settings apply to all providers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Temperature */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Temperature: {settings?.temperature?.toFixed(1) || "0.7"}</Label>
                    <Badge variant="outline">
                      {(settings?.temperature || 0.7) < 0.3 ? "Focused" : (settings?.temperature || 0.7) > 0.7 ? "Creative" : "Balanced"}
                    </Badge>
                  </div>
                  <Slider
                    value={[settings?.temperature || 0.7]}
                    min={0}
                    max={2}
                    step={0.1}
                    onValueCommit={(value) => updateSettings.mutate({ temperature: value[0] })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>More Focused (0)</span>
                    <span>More Creative (2)</span>
                  </div>
                </div>

                <Separator />

                {/* Max Tokens */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Max Output Tokens: {settings?.maxTokens?.toLocaleString() || "4,096"}</Label>
                  </div>
                  <Slider
                    value={[settings?.maxTokens || 4096]}
                    min={256}
                    max={32000}
                    step={256}
                    onValueCommit={(value) => updateSettings.mutate({ maxTokens: value[0] })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Short (256)</span>
                    <span>Long (32,000)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Higher values allow for more detailed analysis but increase costs.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Usage Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle>Your Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Tokens Used</span>
                    <span className="font-mono">{settings?.totalTokensUsed?.toLocaleString() || 0}</span>
                  </div>
                  {settings?.lastUsedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Last Used</span>
                      <span>{new Date(settings.lastUsedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <EmailPreferencesSection />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Email Preferences Section Component
function EmailPreferencesSection() {
  const { data: emailPrefs, isLoading, refetch } = trpc.user.getEmailPreferences.useQuery();
  const updatePrefs = trpc.user.updateEmailPreferences.useMutation({
    onSuccess: () => {
      toast.success("Email preferences updated");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const [localPrefs, setLocalPrefs] = useState<{
    botExecutionComplete: boolean;
    botExecutionError: boolean;
    priceTargetAlert: boolean;
    recommendationChange: boolean;
    weeklyReport: boolean;
    monthlyReport: boolean;
    marketingEmails: boolean;
    digestFrequency: "immediate" | "hourly" | "daily" | "weekly";
    quietHoursStart: string;
    quietHoursEnd: string;
    timezone: string;
    isUnsubscribed: boolean;
  }>({
    botExecutionComplete: true,
    botExecutionError: true,
    priceTargetAlert: true,
    recommendationChange: true,
    weeklyReport: true,
    monthlyReport: true,
    marketingEmails: false,
    digestFrequency: "immediate",
    quietHoursStart: "",
    quietHoursEnd: "",
    timezone: "UTC",
    isUnsubscribed: false,
  });

  useEffect(() => {
    if (emailPrefs) {
      setLocalPrefs({
        botExecutionComplete: emailPrefs.botExecutionComplete,
        botExecutionError: emailPrefs.botExecutionError,
        priceTargetAlert: emailPrefs.priceTargetAlert,
        recommendationChange: emailPrefs.recommendationChange,
        weeklyReport: emailPrefs.weeklyReport,
        monthlyReport: emailPrefs.monthlyReport,
        marketingEmails: emailPrefs.marketingEmails,
        digestFrequency: emailPrefs.digestFrequency,
        quietHoursStart: emailPrefs.quietHoursStart || "",
        quietHoursEnd: emailPrefs.quietHoursEnd || "",
        timezone: emailPrefs.timezone,
        isUnsubscribed: emailPrefs.isUnsubscribed,
      });
    }
  }, [emailPrefs]);

  const handleToggle = (key: keyof typeof localPrefs, value: boolean) => {
    setLocalPrefs(prev => ({ ...prev, [key]: value }));
    updatePrefs.mutate({ [key]: value });
  };

  const handleSelectChange = (key: keyof typeof localPrefs, value: string) => {
    setLocalPrefs(prev => ({ ...prev, [key]: value }));
    updatePrefs.mutate({ [key]: value });
  };

  const timezones = [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Australia/Sydney",
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Master Unsubscribe */}
      {localPrefs.isUnsubscribed && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BellOff className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium text-yellow-500">All emails are currently disabled</p>
                  <p className="text-sm text-muted-foreground">Re-enable to receive notifications</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => handleToggle("isUnsubscribed", false)}
              >
                Re-enable Emails
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trading Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Trading Alerts
          </CardTitle>
          <CardDescription>
            Get notified about your bot executions and trading activity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Bot Execution Complete</Label>
              <p className="text-sm text-muted-foreground">
                Notify when a scheduled bot finishes running
              </p>
            </div>
            <Switch
              checked={localPrefs.botExecutionComplete}
              onCheckedChange={(checked) => handleToggle("botExecutionComplete", checked)}
              disabled={localPrefs.isUnsubscribed}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Bot Errors</Label>
              <p className="text-sm text-muted-foreground">
                Notify when a bot encounters an error
              </p>
            </div>
            <Switch
              checked={localPrefs.botExecutionError}
              onCheckedChange={(checked) => handleToggle("botExecutionError", checked)}
              disabled={localPrefs.isUnsubscribed}
            />
          </div>
        </CardContent>
      </Card>

      {/* Price Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Price & Recommendation Alerts
          </CardTitle>
          <CardDescription>
            Get notified about price targets and AI recommendation changes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Price Target Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Notify when watchlist symbols hit your price targets
              </p>
            </div>
            <Switch
              checked={localPrefs.priceTargetAlert}
              onCheckedChange={(checked) => handleToggle("priceTargetAlert", checked)}
              disabled={localPrefs.isUnsubscribed}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Recommendation Changes</Label>
              <p className="text-sm text-muted-foreground">
                Notify when AI recommendations change for watched symbols
              </p>
            </div>
            <Switch
              checked={localPrefs.recommendationChange}
              onCheckedChange={(checked) => handleToggle("recommendationChange", checked)}
              disabled={localPrefs.isUnsubscribed}
            />
          </div>
        </CardContent>
      </Card>

      {/* Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Performance Reports
          </CardTitle>
          <CardDescription>
            Receive periodic summaries of your trading performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Weekly Reports</Label>
              <p className="text-sm text-muted-foreground">
                Receive a weekly summary every Monday
              </p>
            </div>
            <Switch
              checked={localPrefs.weeklyReport}
              onCheckedChange={(checked) => handleToggle("weeklyReport", checked)}
              disabled={localPrefs.isUnsubscribed}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Monthly Reports</Label>
              <p className="text-sm text-muted-foreground">
                Receive a monthly summary on the 1st of each month
              </p>
            </div>
            <Switch
              checked={localPrefs.monthlyReport}
              onCheckedChange={(checked) => handleToggle("monthlyReport", checked)}
              disabled={localPrefs.isUnsubscribed}
            />
          </div>
        </CardContent>
      </Card>

      {/* Delivery Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Delivery Settings
          </CardTitle>
          <CardDescription>
            Configure how and when you receive email notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Delivery Frequency</Label>
              <Select
                value={localPrefs.digestFrequency}
                onValueChange={(v) => handleSelectChange("digestFrequency", v)}
                disabled={localPrefs.isUnsubscribed}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="hourly">Hourly Digest</SelectItem>
                  <SelectItem value="daily">Daily Digest</SelectItem>
                  <SelectItem value="weekly">Weekly Digest</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {localPrefs.digestFrequency === "immediate" 
                  ? "Receive emails as events occur"
                  : `Receive a ${localPrefs.digestFrequency} summary of all notifications`}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Timezone
              </Label>
              <Select
                value={localPrefs.timezone}
                onValueChange={(v) => handleSelectChange("timezone", v)}
                disabled={localPrefs.isUnsubscribed}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used for scheduling digest emails and quiet hours
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label>Quiet Hours (Do Not Disturb)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Start Time</Label>
                <Input
                  type="time"
                  value={localPrefs.quietHoursStart}
                  onChange={(e) => {
                    setLocalPrefs(prev => ({ ...prev, quietHoursStart: e.target.value }));
                    updatePrefs.mutate({ quietHoursStart: e.target.value });
                  }}
                  disabled={localPrefs.isUnsubscribed}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">End Time</Label>
                <Input
                  type="time"
                  value={localPrefs.quietHoursEnd}
                  onChange={(e) => {
                    setLocalPrefs(prev => ({ ...prev, quietHoursEnd: e.target.value }));
                    updatePrefs.mutate({ quietHoursEnd: e.target.value });
                  }}
                  disabled={localPrefs.isUnsubscribed}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Emails will be held and delivered after quiet hours end
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Marketing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Marketing & Updates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Product Updates & Tips</Label>
              <p className="text-sm text-muted-foreground">
                Receive news about new features and trading tips
              </p>
            </div>
            <Switch
              checked={localPrefs.marketingEmails}
              onCheckedChange={(checked) => handleToggle("marketingEmails", checked)}
              disabled={localPrefs.isUnsubscribed}
            />
          </div>
        </CardContent>
      </Card>

      {/* Unsubscribe All */}
      {!localPrefs.isUnsubscribed && (
        <Card className="border-destructive/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Unsubscribe from all emails</p>
                <p className="text-sm text-muted-foreground">
                  Stop receiving all email notifications from TradoVerse
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => handleToggle("isUnsubscribed", true)}
              >
                Unsubscribe All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
