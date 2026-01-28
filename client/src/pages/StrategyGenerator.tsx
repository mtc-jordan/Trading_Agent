import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/trpc';
import { 
  Wand2,
  Target,
  Shield,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  BarChart3,
  Settings,
  Download,
  RefreshCw,
  Zap,
  Scale,
  Clock,
  Brain,
  ArrowRight,
  Info,
  Copy,
  Check
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

type QuestionnaireResponse = {
  questionId: string;
  answer: string | number | string[];
};

function getRiskColor(risk: string): string {
  switch (risk) {
    case 'conservative': return 'text-blue-500';
    case 'moderate': return 'text-yellow-500';
    case 'aggressive': return 'text-orange-500';
    case 'very_aggressive': return 'text-red-500';
    default: return 'text-gray-500';
  }
}

function getRiskBadgeVariant(risk: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (risk) {
    case 'conservative': return 'secondary';
    case 'moderate': return 'default';
    case 'aggressive': return 'destructive';
    case 'very_aggressive': return 'destructive';
    default: return 'outline';
  }
}

export default function StrategyGenerator() {
  const [activeTab, setActiveTab] = useState('questionnaire');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<QuestionnaireResponse[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [generatedStrategy, setGeneratedStrategy] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const questionnaire = trpc.broker.getStrategyQuestionnaire.useQuery();
  const templates = trpc.broker.getStrategyTemplates.useQuery();
  
  const createProfile = trpc.broker.createRiskProfile.useMutation({
    onSuccess: (data) => {
      // After creating profile, generate strategy
      generateStrategy.mutate({ 
        profileId: data.id,
        preferredType: selectedTemplate || undefined 
      });
    }
  });
  
  const generateStrategy = trpc.broker.generateStrategy.useMutation({
    onSuccess: (data) => {
      setGeneratedStrategy(data);
      setActiveTab('result');
    }
  });

  const optimizeStrategy = trpc.broker.optimizeStrategy.useMutation({
    onSuccess: (data) => {
      setGeneratedStrategy(data);
    }
  });

  const questions = questionnaire.data || [];
  const currentQ = questions[currentQuestion];
  const progress = questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;

  const handleAnswer = (answer: string | number | string[]) => {
    const existingIndex = responses.findIndex(r => r.questionId === currentQ.id);
    if (existingIndex >= 0) {
      const newResponses = [...responses];
      newResponses[existingIndex] = { questionId: currentQ.id, answer };
      setResponses(newResponses);
    } else {
      setResponses([...responses, { questionId: currentQ.id, answer }]);
    }
  };

  const getCurrentAnswer = () => {
    return responses.find(r => r.questionId === currentQ?.id)?.answer;
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleGenerateStrategy = () => {
    createProfile.mutate({ responses });
  };

  const handleOptimize = (goal: 'win_rate' | 'risk_reward' | 'sharpe' | 'drawdown') => {
    if (generatedStrategy) {
      optimizeStrategy.mutate({
        strategyId: generatedStrategy.id,
        optimizationGoal: goal
      });
    }
  };

  const handleCopyStrategy = () => {
    if (generatedStrategy) {
      navigator.clipboard.writeText(JSON.stringify(generatedStrategy, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Radar chart data for strategy
  const radarData = useMemo(() => {
    if (!generatedStrategy) return [];
    return [
      { metric: 'Win Rate', value: generatedStrategy.expectedWinRate * 100 },
      { metric: 'Risk/Reward', value: Math.min(100, generatedStrategy.expectedRiskReward * 25) },
      { metric: 'Sharpe', value: Math.min(100, generatedStrategy.expectedSharpeRatio * 33) },
      { metric: 'Safety', value: (1 - generatedStrategy.expectedMaxDrawdown) * 100 },
      { metric: 'Returns', value: Math.min(100, generatedStrategy.expectedAnnualReturn * 2) },
    ];
  }, [generatedStrategy]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Wand2 className="h-8 w-8 text-purple-500" />
              AI Strategy Generator
            </h1>
            <p className="text-muted-foreground mt-1">
              Create custom trading strategies tailored to your risk profile
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="questionnaire" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Risk Profile
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="result" disabled={!generatedStrategy} className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Generated Strategy
            </TabsTrigger>
            <TabsTrigger value="optimize" disabled={!generatedStrategy} className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Optimize
            </TabsTrigger>
          </TabsList>

          {/* Questionnaire Tab */}
          <TabsContent value="questionnaire" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Profile Assessment</CardTitle>
                <CardDescription>
                  Answer these questions to help us understand your trading preferences
                </CardDescription>
                <Progress value={progress} className="mt-4" />
                <p className="text-sm text-muted-foreground mt-2">
                  Question {currentQuestion + 1} of {questions.length}
                </p>
              </CardHeader>
              <CardContent>
                {currentQ && (
                  <div className="space-y-6">
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="mt-1">
                        {currentQ.category.toUpperCase()}
                      </Badge>
                      <h3 className="text-xl font-medium">{currentQ.question}</h3>
                    </div>

                    {currentQ.type === 'single_choice' && currentQ.options && (
                      <RadioGroup
                        value={getCurrentAnswer() as string}
                        onValueChange={(value) => handleAnswer(value)}
                        className="space-y-3"
                      >
                        {currentQ.options.map((option: any) => (
                          <div
                            key={option.value}
                            className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer"
                            onClick={() => handleAnswer(option.value)}
                          >
                            <RadioGroupItem value={String(option.value)} id={String(option.value)} />
                            <Label htmlFor={String(option.value)} className="flex-1 cursor-pointer">
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}

                    {currentQ.type === 'multiple_choice' && currentQ.options && (
                      <div className="space-y-3">
                        {currentQ.options.map((option: any) => {
                          const currentAnswers = (getCurrentAnswer() as string[]) || [];
                          const isChecked = currentAnswers.includes(option.value);
                          
                          return (
                            <div
                              key={option.value}
                              className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer"
                              onClick={() => {
                                const newAnswers = isChecked
                                  ? currentAnswers.filter(a => a !== option.value)
                                  : [...currentAnswers, option.value];
                                handleAnswer(newAnswers);
                              }}
                            >
                              <Checkbox checked={isChecked} />
                              <Label className="flex-1 cursor-pointer">{option.label}</Label>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {currentQ.type === 'scale' && (
                      <div className="space-y-6 py-4">
                        <Slider
                          value={[getCurrentAnswer() as number || currentQ.min || 1]}
                          onValueChange={([value]) => handleAnswer(value)}
                          min={currentQ.min || 1}
                          max={currentQ.max || 10}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{currentQ.min || 1} - Low</span>
                          <span className="text-lg font-bold text-primary">
                            {getCurrentAnswer() || currentQ.min || 1}
                          </span>
                          <span>{currentQ.max || 10} - High</span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between pt-6">
                      <Button
                        variant="outline"
                        onClick={handlePrev}
                        disabled={currentQuestion === 0}
                      >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Previous
                      </Button>
                      
                      {currentQuestion < questions.length - 1 ? (
                        <Button onClick={handleNext} disabled={!getCurrentAnswer()}>
                          Next
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      ) : (
                        <Button 
                          onClick={handleGenerateStrategy}
                          disabled={responses.length < questions.length || createProfile.isPending}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {createProfile.isPending ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Wand2 className="h-4 w-4 mr-2" />
                              Generate Strategy
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Strategy Templates</CardTitle>
                <CardDescription>
                  Browse pre-built strategy templates or select one to customize
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.data?.map((template: any) => (
                    <div
                      key={template.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedTemplate === template.type
                          ? 'border-primary bg-primary/10'
                          : 'hover:border-muted-foreground/50'
                      }`}
                      onClick={() => setSelectedTemplate(template.type)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{template.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {template.description}
                          </p>
                        </div>
                        {selectedTemplate === template.type && (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant="outline" className="text-xs">
                          {template.complexity}
                        </Badge>
                        {template.suitableFor.map((risk: string) => (
                          <Badge 
                            key={risk} 
                            variant={getRiskBadgeVariant(risk)}
                            className="text-xs capitalize"
                          >
                            {risk.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                        <div className="p-2 rounded bg-muted/50">
                          <p className="text-xs text-muted-foreground">Win Rate</p>
                          <p className="font-medium">
                            {Math.round(template.expectedPerformance.winRate[0] * 100)}-
                            {Math.round(template.expectedPerformance.winRate[1] * 100)}%
                          </p>
                        </div>
                        <div className="p-2 rounded bg-muted/50">
                          <p className="text-xs text-muted-foreground">R:R</p>
                          <p className="font-medium">
                            {template.expectedPerformance.riskReward[0]}-
                            {template.expectedPerformance.riskReward[1]}
                          </p>
                        </div>
                        <div className="p-2 rounded bg-muted/50">
                          <p className="text-xs text-muted-foreground">Drawdown</p>
                          <p className="font-medium">
                            {Math.round(template.expectedPerformance.drawdown[0] * 100)}-
                            {Math.round(template.expectedPerformance.drawdown[1] * 100)}%
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground mb-1">Indicators:</p>
                        <div className="flex flex-wrap gap-1">
                          {template.baseIndicators.slice(0, 4).map((ind: string) => (
                            <Badge key={ind} variant="secondary" className="text-xs">
                              {ind}
                            </Badge>
                          ))}
                          {template.baseIndicators.length > 4 && (
                            <Badge variant="secondary" className="text-xs">
                              +{template.baseIndicators.length - 4}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Generated Strategy Tab */}
          <TabsContent value="result" className="space-y-6">
            {generatedStrategy && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Strategy Overview */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-purple-500" />
                            {generatedStrategy.name}
                          </CardTitle>
                          <CardDescription className="mt-2">
                            {generatedStrategy.description}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={handleCopyStrategy}>
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Risk Level</p>
                          <p className={`font-bold capitalize ${getRiskColor(generatedStrategy.riskLevel)}`}>
                            {generatedStrategy.riskLevel.replace('_', ' ')}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Strategy Type</p>
                          <p className="font-bold capitalize">
                            {generatedStrategy.type.replace('_', ' ')}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Complexity</p>
                          <p className="font-bold capitalize">{generatedStrategy.complexity}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Confidence</p>
                          <p className="font-bold">{Math.round(generatedStrategy.confidence * 100)}%</p>
                        </div>
                      </div>

                      {/* Entry Rules */}
                      <div className="mb-6">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          Entry Rules
                        </h4>
                        <div className="space-y-2">
                          {generatedStrategy.entryRules.map((rule: any) => (
                            <div 
                              key={rule.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20"
                            >
                              <div>
                                <p className="font-medium">{rule.name}</p>
                                <p className="text-sm text-muted-foreground">{rule.description}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {rule.isRequired && (
                                  <Badge variant="default" className="text-xs">Required</Badge>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  Weight: {Math.round(rule.weight * 100)}%
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Exit Rules */}
                      <div className="mb-6">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-red-500" />
                          Exit Rules
                        </h4>
                        <div className="space-y-2">
                          {generatedStrategy.exitRules.map((rule: any) => (
                            <div 
                              key={rule.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                            >
                              <div>
                                <p className="font-medium">{rule.name}</p>
                                <p className="text-sm text-muted-foreground">{rule.description}</p>
                              </div>
                              <Badge variant="outline" className="text-xs capitalize">
                                {rule.type.replace('_', ' ')}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Position Sizing */}
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Scale className="h-4 w-4 text-blue-500" />
                          Position Sizing
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <p className="text-xs text-muted-foreground">Method</p>
                            <p className="font-medium capitalize">
                              {generatedStrategy.positionSizing.method.replace('_', ' ')}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <p className="text-xs text-muted-foreground">Risk Per Trade</p>
                            <p className="font-medium">{generatedStrategy.positionSizing.riskPerTrade}%</p>
                          </div>
                          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <p className="text-xs text-muted-foreground">Max Position</p>
                            <p className="font-medium">${generatedStrategy.positionSizing.maxSize.toLocaleString()}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <p className="text-xs text-muted-foreground">Max Positions</p>
                            <p className="font-medium">{generatedStrategy.maxConcurrentPositions}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Performance Metrics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Expected Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Radar Chart */}
                      <div className="h-48 mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radarData}>
                            <PolarGrid stroke="#333" />
                            <PolarAngleAxis dataKey="metric" stroke="#666" tick={{ fontSize: 11 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#666" />
                            <Radar
                              name="Performance"
                              dataKey="value"
                              stroke="#8b5cf6"
                              fill="#8b5cf6"
                              fillOpacity={0.5}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Metrics */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Win Rate</span>
                          <span className="font-bold text-green-500">
                            {Math.round(generatedStrategy.expectedWinRate * 100)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Risk/Reward</span>
                          <span className="font-bold">
                            1:{generatedStrategy.expectedRiskReward.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Sharpe Ratio</span>
                          <span className="font-bold">{generatedStrategy.expectedSharpeRatio}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Max Drawdown</span>
                          <span className="font-bold text-red-500">
                            -{Math.round(generatedStrategy.expectedMaxDrawdown * 100)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Expected Annual Return</span>
                          <span className="font-bold text-green-500">
                            +{generatedStrategy.expectedAnnualReturn}%
                          </span>
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="mt-6 pt-6 border-t space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Implementation:</span>
                          <span>{generatedStrategy.timeToImplement}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Settings className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Maintenance:</span>
                          <span className="capitalize">{generatedStrategy.maintenanceLevel}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Indicators */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      Technical Indicators
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {generatedStrategy.indicators.map((indicator: any, index: number) => (
                        <div 
                          key={index}
                          className="p-4 rounded-lg border text-center"
                        >
                          <Badge variant="outline" className="mb-2 text-xs capitalize">
                            {indicator.type}
                          </Badge>
                          <p className="font-medium">{indicator.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Weight: {Math.round(indicator.weight * 100)}%
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Optimize Tab */}
          <TabsContent value="optimize" className="space-y-6">
            {generatedStrategy && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Strategy Optimization
                  </CardTitle>
                  <CardDescription>
                    Fine-tune your strategy for specific goals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div 
                      className="p-6 rounded-lg border cursor-pointer hover:border-green-500 hover:bg-green-500/10 transition-all"
                      onClick={() => handleOptimize('win_rate')}
                    >
                      <Target className="h-8 w-8 text-green-500 mb-3" />
                      <h3 className="font-medium">Maximize Win Rate</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Tighten entry rules for higher probability trades
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-4 w-full"
                        disabled={optimizeStrategy.isPending}
                      >
                        {optimizeStrategy.isPending ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            Optimize <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>

                    <div 
                      className="p-6 rounded-lg border cursor-pointer hover:border-blue-500 hover:bg-blue-500/10 transition-all"
                      onClick={() => handleOptimize('risk_reward')}
                    >
                      <Scale className="h-8 w-8 text-blue-500 mb-3" />
                      <h3 className="font-medium">Maximize Risk/Reward</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Widen profit targets for bigger winners
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-4 w-full"
                        disabled={optimizeStrategy.isPending}
                      >
                        {optimizeStrategy.isPending ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            Optimize <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>

                    <div 
                      className="p-6 rounded-lg border cursor-pointer hover:border-purple-500 hover:bg-purple-500/10 transition-all"
                      onClick={() => handleOptimize('sharpe')}
                    >
                      <Zap className="h-8 w-8 text-purple-500 mb-3" />
                      <h3 className="font-medium">Maximize Sharpe Ratio</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Balance returns with volatility
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-4 w-full"
                        disabled={optimizeStrategy.isPending}
                      >
                        {optimizeStrategy.isPending ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            Optimize <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>

                    <div 
                      className="p-6 rounded-lg border cursor-pointer hover:border-yellow-500 hover:bg-yellow-500/10 transition-all"
                      onClick={() => handleOptimize('drawdown')}
                    >
                      <Shield className="h-8 w-8 text-yellow-500 mb-3" />
                      <h3 className="font-medium">Minimize Drawdown</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Reduce position sizes and tighten stops
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-4 w-full"
                        disabled={optimizeStrategy.isPending}
                      >
                        {optimizeStrategy.isPending ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            Optimize <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Validation Warnings */}
                  <div className="mt-6 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium">Strategy Validation</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Always backtest optimized strategies before live trading. Past performance 
                          does not guarantee future results.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
