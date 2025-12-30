import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import { 
  Brain, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  AlertTriangle,
  Target,
  Shield,
  TrendingUp,
  Zap,
  BarChart3,
  Settings2,
  Sparkles,
  Save
} from "lucide-react";

interface QuestionOption {
  value: string;
  label: string;
  description?: string;
  weight: number;
}

interface Question {
  id: string;
  category: string;
  question: string;
  options: QuestionOption[];
}

interface WizardStep {
  step: number;
  title: string;
  description: string;
  questions: Question[];
}

interface OptimizedWeights {
  technical: number;
  fundamental: number;
  sentiment: number;
  risk: number;
  regime: number;
  execution: number;
  coordinator: number;
}

interface WeightRecommendation {
  weights: OptimizedWeights;
  explanation: string;
  confidence: number;
  riskLevel: string;
  expectedVolatility: string;
  suitableFor: string[];
  warnings: string[];
}

export default function WeightOptimizationWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [recommendation, setRecommendation] = useState<WeightRecommendation | null>(null);
  const [customWeights, setCustomWeights] = useState<OptimizedWeights | null>(null);
  const [showCustomize, setShowCustomize] = useState(false);

  const wizardSteps = trpc.broker.getWizardSteps.useQuery();
  const calculateProfile = trpc.broker.calculateRiskProfile.useMutation();
  const saveWeights = trpc.broker.saveOptimizedWeights.useMutation();

  const steps = wizardSteps.data || [];
  const totalSteps = steps.length + 1; // +1 for results step
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleOptionSelect = (questionId: string, value: string) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  };

  const canProceed = () => {
    if (currentStep >= steps.length) return true;
    const currentQuestions = steps[currentStep]?.questions || [];
    return currentQuestions.every((q: Question) => responses[q.id]);
  };

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else if (currentStep === steps.length - 1) {
      // Calculate profile
      const responseArray = Object.entries(responses).map(([questionId, selectedValue]) => ({
        questionId,
        selectedValue,
      }));
      
      const result = await calculateProfile.mutateAsync({ responses: responseArray });
      setRecommendation(result);
      setCustomWeights(result.weights);
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSaveWeights = async () => {
    if (customWeights) {
      await saveWeights.mutateAsync({ weights: customWeights });
    }
  };

  const handleWeightChange = (agent: keyof OptimizedWeights, value: number) => {
    if (!customWeights) return;
    
    const newWeights = { ...customWeights, [agent]: value / 100 };
    
    // Normalize to sum to 1
    const total = Object.values(newWeights).reduce((a, b) => a + b, 0);
    const normalized: OptimizedWeights = {
      technical: newWeights.technical / total,
      fundamental: newWeights.fundamental / total,
      sentiment: newWeights.sentiment / total,
      risk: newWeights.risk / total,
      regime: newWeights.regime / total,
      execution: newWeights.execution / total,
      coordinator: newWeights.coordinator / total,
    };
    
    setCustomWeights(normalized);
  };

  const getStepIcon = (step: number) => {
    switch (step) {
      case 0: return <Shield className="h-5 w-5" />;
      case 1: return <TrendingUp className="h-5 w-5" />;
      case 2: return <Brain className="h-5 w-5" />;
      case 3: return <Target className="h-5 w-5" />;
      default: return <Sparkles className="h-5 w-5" />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'conservative': return 'bg-blue-500';
      case 'moderate': return 'bg-green-500';
      case 'aggressive': return 'bg-orange-500';
      case 'very_aggressive': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const agentInfo: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    technical: { label: 'Technical', color: 'bg-blue-500', icon: <BarChart3 className="h-4 w-4" /> },
    fundamental: { label: 'Fundamental', color: 'bg-green-500', icon: <Target className="h-4 w-4" /> },
    sentiment: { label: 'Sentiment', color: 'bg-purple-500', icon: <Brain className="h-4 w-4" /> },
    risk: { label: 'Risk', color: 'bg-red-500', icon: <Shield className="h-4 w-4" /> },
    regime: { label: 'Regime', color: 'bg-orange-500', icon: <TrendingUp className="h-4 w-4" /> },
    execution: { label: 'Execution', color: 'bg-cyan-500', icon: <Zap className="h-4 w-4" /> },
    coordinator: { label: 'Coordinator', color: 'bg-pink-500', icon: <Settings2 className="h-4 w-4" /> },
  };

  return (
    <DashboardLayout>
      <div className="container max-w-4xl py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            Weight Optimization Wizard
          </h1>
          <p className="text-muted-foreground mt-2">
            Fine-tune your AI agent weights based on your risk tolerance and trading style
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Step {currentStep + 1} of {totalSteps}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
          
          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {steps.map((step: WizardStep, idx: number) => (
              <div 
                key={idx}
                className={`flex flex-col items-center ${idx <= currentStep ? 'text-primary' : 'text-muted-foreground'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  idx < currentStep ? 'bg-primary text-primary-foreground border-primary' :
                  idx === currentStep ? 'border-primary' : 'border-muted'
                }`}>
                  {idx < currentStep ? <CheckCircle2 className="h-5 w-5" /> : getStepIcon(idx)}
                </div>
                <span className="text-xs mt-1 hidden sm:block">{step.title}</span>
              </div>
            ))}
            <div className={`flex flex-col items-center ${currentStep >= steps.length ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                currentStep >= steps.length ? 'border-primary' : 'border-muted'
              }`}>
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="text-xs mt-1 hidden sm:block">Results</span>
            </div>
          </div>
        </div>

        {/* Content */}
        {currentStep < steps.length ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStepIcon(currentStep)}
                {steps[currentStep]?.title}
              </CardTitle>
              <CardDescription>{steps[currentStep]?.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {steps[currentStep]?.questions.map((question: Question) => (
                <div key={question.id} className="space-y-4">
                  <h3 className="font-medium">{question.question}</h3>
                  <RadioGroup
                    value={responses[question.id] || ''}
                    onValueChange={(value) => handleOptionSelect(question.id, value)}
                    className="grid gap-3"
                  >
                    {question.options.map((option: QuestionOption) => (
                      <div key={option.value} className="relative">
                        <RadioGroupItem
                          value={option.value}
                          id={`${question.id}-${option.value}`}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={`${question.id}-${option.value}`}
                          className="flex items-start gap-4 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-all"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{option.label}</div>
                            {option.description && (
                              <div className="text-sm text-muted-foreground">{option.description}</div>
                            )}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : recommendation ? (
          <div className="space-y-6">
            {/* Recommendation Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Your Optimized Configuration
                </CardTitle>
                <CardDescription>{recommendation.explanation}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Risk Level */}
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">Risk Level:</span>
                  <Badge className={getRiskColor(recommendation.riskLevel)}>
                    {recommendation.riskLevel.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Confidence: {(recommendation.confidence * 100).toFixed(0)}%
                  </span>
                </div>

                {/* Suitable For */}
                <div>
                  <span className="text-sm font-medium">Suitable For:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {recommendation.suitableFor.map((item: string, idx: number) => (
                      <Badge key={idx} variant="secondary">{item}</Badge>
                    ))}
                  </div>
                </div>

                {/* Warnings */}
                {recommendation.warnings.length > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-yellow-600 mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Considerations</span>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {recommendation.warnings.map((warning: string, idx: number) => (
                        <li key={idx}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Weights Visualization */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Agent Weights</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowCustomize(!showCustomize)}
                  >
                    <Settings2 className="h-4 w-4 mr-2" />
                    {showCustomize ? 'Hide' : 'Customize'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {customWeights && Object.entries(customWeights).map(([agent, weight]) => {
                    const info = agentInfo[agent];
                    return (
                      <div key={agent} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full ${info.color} flex items-center justify-center text-white`}>
                              {info.icon}
                            </div>
                            <span className="font-medium">{info.label}</span>
                          </div>
                          <span className="font-mono text-sm">{(weight * 100).toFixed(1)}%</span>
                        </div>
                        {showCustomize ? (
                          <Slider
                            value={[weight * 100]}
                            onValueChange={([v]) => handleWeightChange(agent as keyof OptimizedWeights, v)}
                            max={50}
                            min={5}
                            step={1}
                            className="w-full"
                          />
                        ) : (
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${info.color} transition-all`}
                              style={{ width: `${weight * 100 * 2}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 pt-4 border-t">
                  <Button 
                    onClick={handleSaveWeights}
                    disabled={saveWeights.isPending}
                    className="w-full"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveWeights.isPending ? 'Saving...' : 'Save Configuration'}
                  </Button>
                  {saveWeights.isSuccess && (
                    <p className="text-sm text-green-600 text-center mt-2">
                      ✓ Configuration saved successfully!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Preset Configurations */}
            <Card>
              <CardHeader>
                <CardTitle>Preset Configurations</CardTitle>
                <CardDescription>Quick-apply a preset configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: 'Conservative', risk: 'conservative', desc: 'Capital preservation focus' },
                    { name: 'Balanced', risk: 'moderate', desc: 'Mix of growth and stability' },
                    { name: 'Aggressive', risk: 'aggressive', desc: 'Higher returns, higher risk' },
                    { name: 'Day Trader', risk: 'very_aggressive', desc: 'Short-term momentum' },
                  ].map((preset) => (
                    <Button
                      key={preset.name}
                      variant="outline"
                      className="h-auto py-4 flex flex-col items-start"
                      onClick={() => {
                        // Apply preset weights
                        const presetWeights: Record<string, OptimizedWeights> = {
                          conservative: { technical: 0.10, fundamental: 0.25, sentiment: 0.10, risk: 0.25, regime: 0.15, execution: 0.05, coordinator: 0.10 },
                          moderate: { technical: 0.18, fundamental: 0.20, sentiment: 0.15, risk: 0.18, regime: 0.14, execution: 0.07, coordinator: 0.08 },
                          aggressive: { technical: 0.22, fundamental: 0.15, sentiment: 0.20, risk: 0.12, regime: 0.12, execution: 0.10, coordinator: 0.09 },
                          very_aggressive: { technical: 0.25, fundamental: 0.10, sentiment: 0.25, risk: 0.08, regime: 0.10, execution: 0.12, coordinator: 0.10 },
                        };
                        setCustomWeights(presetWeights[preset.risk]);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Badge className={getRiskColor(preset.risk)}>{preset.name}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">{preset.desc}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p>Analyzing your responses...</p>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          {currentStep < steps.length && (
            <Button
              onClick={handleNext}
              disabled={!canProceed() || calculateProfile.isPending}
            >
              {calculateProfile.isPending ? 'Calculating...' : currentStep === steps.length - 1 ? 'Get Recommendation' : 'Next'}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
