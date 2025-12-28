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
  ArrowLeft
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

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

const providerIcons: Record<LlmProvider, { icon: string; color: string }> = {
  openai: { icon: "🤖", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  deepseek: { icon: "🔮", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  claude: { icon: "🧠", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  gemini: { icon: "✨", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

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
  const [savingKey, setSavingKey] = useState<LlmProvider | null>(null);
  const [testingConnection, setTestingConnection] = useState<LlmProvider | null>(null);

  // Fetch providers and user settings
  const { data: providers, isLoading: providersLoading } = trpc.llmSettings.getProviders.useQuery();
  const { data: settings, isLoading: settingsLoading, refetch: refetchSettings } = trpc.llmSettings.getSettings.useQuery(
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
      toast.success(data.message);
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => setTestingConnection(null),
  });

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
              <p className="text-muted-foreground">Configure your AI providers and preferences</p>
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
            <TabsTrigger value="preferences" className="gap-2">
              <Zap className="h-4 w-4" />
              Preferences
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
                const selectedModel = getSelectedModel(provider.id);

                return (
                  <Card key={provider.id} className="overflow-hidden">
                    <CardHeader className={`${iconConfig.color} border-b`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{iconConfig.icon}</span>
                          <div>
                            <CardTitle className="text-lg">{provider.name}</CardTitle>
                            <CardDescription className="text-current/70">
                              {provider.description}
                            </CardDescription>
                          </div>
                        </div>
                        <a
                          href={provider.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm flex items-center gap-1 hover:underline"
                        >
                          Get API Key <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      {/* API Key Section */}
                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          <Key className="h-4 w-4" />
                          API Key
                        </Label>
                        {hasApiKey ? (
                          <div className="flex items-center gap-3">
                            <div className="flex-1 px-3 py-2 bg-muted rounded-md font-mono text-sm">
                              ••••••••••••••••••••••••••••••••
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTestConnection(provider.id)}
                              disabled={testingConnection === provider.id}
                            >
                              {testingConnection === provider.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                              Test
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeApiKey.mutate({ provider: provider.id })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-3">
                            <div className="relative flex-1">
                              <Input
                                type={showApiKey[provider.id] ? "text" : "password"}
                                placeholder={`Enter your ${provider.name} API key`}
                                value={apiKeyInputs[provider.id]}
                                onChange={(e) =>
                                  setApiKeyInputs((prev) => ({
                                    ...prev,
                                    [provider.id]: e.target.value,
                                  }))
                                }
                                className="pr-10"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setShowApiKey((prev) => ({
                                    ...prev,
                                    [provider.id]: !prev[provider.id],
                                  }))
                                }
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showApiKey[provider.id] ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                            <Button
                              onClick={() => handleSaveApiKey(provider.id)}
                              disabled={savingKey === provider.id || !apiKeyInputs[provider.id]}
                            >
                              {savingKey === provider.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : null}
                              Save Key
                            </Button>
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Model Selection */}
                      <div className="space-y-3">
                        <Label>Model Selection</Label>
                        <Select
                          value={selectedModel}
                          onValueChange={(value) =>
                            setModel.mutate({ provider: provider.id, model: value })
                          }
                          disabled={!hasApiKey}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a model" />
                          </SelectTrigger>
                          <SelectContent>
                            {provider.models.map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                <div className="flex flex-col">
                                  <span>{model.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {model.description}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Model Parameters</CardTitle>
                <CardDescription>
                  Fine-tune how the AI agents analyze market data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Temperature */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Temperature</Label>
                      <p className="text-sm text-muted-foreground">
                        Controls randomness. Lower = more focused, higher = more creative
                      </p>
                    </div>
                    <Badge variant="outline">{settings?.temperature?.toFixed(1) || "0.7"}</Badge>
                  </div>
                  <Slider
                    value={[settings?.temperature || 0.7]}
                    min={0}
                    max={2}
                    step={0.1}
                    onValueCommit={([value]) => updateSettings.mutate({ temperature: value })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Precise (0)</span>
                    <span>Balanced (1)</span>
                    <span>Creative (2)</span>
                  </div>
                </div>

                <Separator />

                {/* Max Tokens */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Max Tokens</Label>
                      <p className="text-sm text-muted-foreground">
                        Maximum length of AI responses
                      </p>
                    </div>
                    <Badge variant="outline">{settings?.maxTokens?.toLocaleString() || "4,096"}</Badge>
                  </div>
                  <Slider
                    value={[settings?.maxTokens || 4096]}
                    min={1000}
                    max={32000}
                    step={1000}
                    onValueCommit={([value]) => updateSettings.mutate({ maxTokens: value })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Short (1K)</span>
                    <span>Medium (16K)</span>
                    <span>Long (32K)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Usage Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
                <CardDescription>
                  Track your AI token usage across all providers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {settings?.totalTokensUsed?.toLocaleString() || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Tokens Used</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">
                      {settings?.lastUsedAt
                        ? new Date(settings.lastUsedAt).toLocaleDateString()
                        : "Never"}
                    </div>
                    <div className="text-sm text-muted-foreground">Last Used</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
