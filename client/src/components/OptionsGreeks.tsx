import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  Clock,
  Activity,
  DollarSign,
  Percent,
  Target,
  BarChart3,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

type OptionType = 'call' | 'put';

interface GreeksResult {
  price: number;
  intrinsicValue: number;
  timeValue: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  lambda: number;
  probability: {
    itm: number;
    otm: number;
  };
  breakeven: number;
  deltaPerDollar: number;
  gammaPerDollar: number;
}

interface GreeksVisualization {
  deltaVsPrice: Array<{ price: number; delta: number }>;
  gammaVsPrice: Array<{ price: number; gamma: number }>;
  thetaVsTime: Array<{ daysToExpiry: number; theta: number }>;
  priceVsUnderlying: Array<{ underlyingPrice: number; optionPrice: number }>;
  profitLossAtExpiry: Array<{ underlyingPrice: number; profitLoss: number }>;
}

export function OptionsGreeks() {
  const [underlyingPrice, setUnderlyingPrice] = useState(150);
  const [strikePrice, setStrikePrice] = useState(155);
  const [daysToExpiry, setDaysToExpiry] = useState(30);
  const [volatility, setVolatility] = useState(25);
  const [riskFreeRate, setRiskFreeRate] = useState(5);
  const [optionType, setOptionType] = useState<OptionType>('call');
  const [result, setResult] = useState<{ greeks: GreeksResult; visualization: GreeksVisualization } | null>(null);

  const calculateMutation = trpc.options.calculateGreeks.useMutation({
    onSuccess: (data) => {
      setResult(data as { greeks: GreeksResult; visualization: GreeksVisualization });
    },
  });

  const handleCalculate = () => {
    calculateMutation.mutate({
      underlyingPrice,
      strikePrice,
      timeToExpiry: daysToExpiry / 365,
      riskFreeRate: riskFreeRate / 100,
      volatility: volatility / 100,
      optionType,
    });
  };

  const isITM = optionType === 'call' 
    ? underlyingPrice > strikePrice 
    : underlyingPrice < strikePrice;

  return (
    <div className="space-y-6">
      {/* Calculator Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Options Greeks Calculator
          </CardTitle>
          <CardDescription>
            Calculate Black-Scholes option pricing and Greeks for calls and puts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Option Type Selection */}
          <div className="flex gap-4">
            <Button
              variant={optionType === 'call' ? 'default' : 'outline'}
              onClick={() => setOptionType('call')}
              className="flex-1"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Call Option
            </Button>
            <Button
              variant={optionType === 'put' ? 'default' : 'outline'}
              onClick={() => setOptionType('put')}
              className="flex-1"
            >
              <TrendingDown className="h-4 w-4 mr-2" />
              Put Option
            </Button>
          </div>

          {/* Input Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Underlying Price ($)</Label>
              <Input
                type="number"
                value={underlyingPrice}
                onChange={(e) => setUnderlyingPrice(parseFloat(e.target.value) || 0)}
                min={0}
                step={0.01}
              />
            </div>
            <div className="space-y-2">
              <Label>Strike Price ($)</Label>
              <Input
                type="number"
                value={strikePrice}
                onChange={(e) => setStrikePrice(parseFloat(e.target.value) || 0)}
                min={0}
                step={0.01}
              />
            </div>
            <div className="space-y-2">
              <Label>Days to Expiry: {daysToExpiry}</Label>
              <Slider
                value={[daysToExpiry]}
                onValueChange={([v]) => setDaysToExpiry(v)}
                min={1}
                max={365}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Implied Volatility: {volatility}%</Label>
              <Slider
                value={[volatility]}
                onValueChange={([v]) => setVolatility(v)}
                min={5}
                max={100}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Risk-Free Rate: {riskFreeRate}%</Label>
              <Slider
                value={[riskFreeRate]}
                onValueChange={([v]) => setRiskFreeRate(v)}
                min={0}
                max={15}
                step={0.25}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleCalculate} 
                disabled={calculateMutation.isPending}
                className="w-full"
              >
                {calculateMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4 mr-2" />
                    Calculate Greeks
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Quick Status */}
          <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
            <Badge variant={isITM ? 'default' : 'secondary'}>
              {isITM ? 'In The Money' : 'Out of The Money'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {optionType === 'call' ? 'Call' : 'Put'} @ ${strikePrice} | 
              Underlying: ${underlyingPrice} | 
              {daysToExpiry} DTE
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Tabs defaultValue="greeks" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="greeks">Greeks</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="probability">Probability</TabsTrigger>
          </TabsList>

          {/* Greeks Tab */}
          <TabsContent value="greeks" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Delta */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <ArrowUpRight className="h-4 w-4 text-blue-500" />
                    </div>
                    <span className="text-sm font-medium">Delta (Δ)</span>
                  </div>
                  <div className="text-2xl font-bold">{result.greeks.delta.toFixed(4)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Price sensitivity to $1 move
                  </div>
                </CardContent>
              </Card>

              {/* Gamma */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Activity className="h-4 w-4 text-purple-500" />
                    </div>
                    <span className="text-sm font-medium">Gamma (Γ)</span>
                  </div>
                  <div className="text-2xl font-bold">{result.greeks.gamma.toFixed(4)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Delta change per $1 move
                  </div>
                </CardContent>
              </Card>

              {/* Theta */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-red-500/10 rounded-lg">
                      <Clock className="h-4 w-4 text-red-500" />
                    </div>
                    <span className="text-sm font-medium">Theta (Θ)</span>
                  </div>
                  <div className="text-2xl font-bold text-red-500">
                    {result.greeks.theta.toFixed(4)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Daily time decay
                  </div>
                </CardContent>
              </Card>

              {/* Vega */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <BarChart3 className="h-4 w-4 text-green-500" />
                    </div>
                    <span className="text-sm font-medium">Vega (ν)</span>
                  </div>
                  <div className="text-2xl font-bold">{result.greeks.vega.toFixed(4)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Per 1% IV change
                  </div>
                </CardContent>
              </Card>

              {/* Rho */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                      <Percent className="h-4 w-4 text-yellow-500" />
                    </div>
                    <span className="text-sm font-medium">Rho (ρ)</span>
                  </div>
                  <div className="text-2xl font-bold">{result.greeks.rho.toFixed(4)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Per 1% rate change
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Greeks Interpretation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Greeks Interpretation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="font-medium mb-1">Delta Interpretation</div>
                    <p className="text-sm text-muted-foreground">
                      {Math.abs(result.greeks.delta) > 0.7 
                        ? 'Deep in the money - behaves like stock'
                        : Math.abs(result.greeks.delta) > 0.3
                        ? 'At or near the money - moderate sensitivity'
                        : 'Out of the money - low probability of profit'}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="font-medium mb-1">Gamma Risk</div>
                    <p className="text-sm text-muted-foreground">
                      {result.greeks.gamma > 0.05
                        ? 'High gamma - delta will change rapidly'
                        : result.greeks.gamma > 0.02
                        ? 'Moderate gamma - manageable delta changes'
                        : 'Low gamma - stable delta'}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="font-medium mb-1">Time Decay</div>
                    <p className="text-sm text-muted-foreground">
                      Losing ${Math.abs(result.greeks.theta).toFixed(2)} per day. 
                      {daysToExpiry < 30 
                        ? ' Accelerating decay - consider closing soon.'
                        : ' Moderate decay rate.'}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="font-medium mb-1">Volatility Exposure</div>
                    <p className="text-sm text-muted-foreground">
                      {result.greeks.vega > 0.1
                        ? 'High vega - significant volatility exposure'
                        : 'Low vega - less sensitive to IV changes'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Option Price */}
              <Card>
                <CardContent className="pt-6 text-center">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <div className="text-3xl font-bold">${result.greeks.price.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">Option Premium</div>
                </CardContent>
              </Card>

              {/* Intrinsic Value */}
              <Card>
                <CardContent className="pt-6 text-center">
                  <Target className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <div className="text-3xl font-bold">${result.greeks.intrinsicValue.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">Intrinsic Value</div>
                </CardContent>
              </Card>

              {/* Time Value */}
              <Card>
                <CardContent className="pt-6 text-center">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-3xl font-bold">${result.greeks.timeValue.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">Time Value</div>
                </CardContent>
              </Card>
            </div>

            {/* Breakeven & Leverage */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Breakeven & Leverage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Breakeven Price</div>
                    <div className="text-2xl font-bold">${result.greeks.breakeven.toFixed(2)}</div>
                    <div className="text-sm mt-1">
                      {optionType === 'call' 
                        ? `Stock must rise ${((result.greeks.breakeven - underlyingPrice) / underlyingPrice * 100).toFixed(1)}% to breakeven`
                        : `Stock must fall ${((underlyingPrice - result.greeks.breakeven) / underlyingPrice * 100).toFixed(1)}% to breakeven`}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Leverage (Lambda)</div>
                    <div className="text-2xl font-bold">{result.greeks.lambda.toFixed(2)}x</div>
                    <div className="text-sm mt-1">
                      {result.greeks.lambda > 5 
                        ? 'High leverage - amplified gains/losses'
                        : 'Moderate leverage'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Efficiency Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Capital Efficiency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Delta per Dollar</div>
                    <div className="text-xl font-bold">{result.greeks.deltaPerDollar.toFixed(4)}</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Gamma per Dollar</div>
                    <div className="text-xl font-bold">{result.greeks.gammaPerDollar.toFixed(4)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Charts Tab */}
          <TabsContent value="charts" className="space-y-4">
            {/* Delta vs Price Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Delta vs Underlying Price</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-end gap-1">
                  {result.visualization.deltaVsPrice.map((point, i) => {
                    const height = Math.abs(point.delta) * 100;
                    const isPositive = point.delta > 0;
                    return (
                      <div
                        key={i}
                        className="flex-1 relative group"
                        title={`$${point.price.toFixed(0)}: Δ${point.delta.toFixed(3)}`}
                      >
                        <div
                          className={`w-full ${isPositive ? 'bg-green-500' : 'bg-red-500'} rounded-t transition-all hover:opacity-80`}
                          style={{ height: `${height}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>${(underlyingPrice * 0.5).toFixed(0)}</span>
                  <span>${underlyingPrice.toFixed(0)} (Current)</span>
                  <span>${(underlyingPrice * 1.5).toFixed(0)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Profit/Loss at Expiry */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Profit/Loss at Expiry</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-center">
                  <div className="w-full h-full flex items-end gap-1">
                    {result.visualization.profitLossAtExpiry.map((point, i) => {
                      const maxPL = Math.max(...result.visualization.profitLossAtExpiry.map(p => Math.abs(p.profitLoss)));
                      const normalizedHeight = (point.profitLoss / maxPL) * 50;
                      const isProfit = point.profitLoss > 0;
                      return (
                        <div
                          key={i}
                          className="flex-1 relative flex flex-col justify-center"
                          title={`$${point.underlyingPrice.toFixed(0)}: ${point.profitLoss >= 0 ? '+' : ''}$${point.profitLoss.toFixed(2)}`}
                        >
                          <div
                            className={`w-full ${isProfit ? 'bg-green-500' : 'bg-red-500'} rounded transition-all hover:opacity-80`}
                            style={{
                              height: `${Math.abs(normalizedHeight)}%`,
                              marginTop: isProfit ? 'auto' : 0,
                              marginBottom: isProfit ? 0 : 'auto',
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>${(underlyingPrice * 0.5).toFixed(0)}</span>
                  <span>Breakeven: ${result.greeks.breakeven.toFixed(2)}</span>
                  <span>${(underlyingPrice * 1.5).toFixed(0)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Theta Decay */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Theta Decay Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-32 flex items-end gap-1">
                  {result.visualization.thetaVsTime.slice(0, 60).map((point, i) => {
                    const maxTheta = Math.max(...result.visualization.thetaVsTime.map(p => Math.abs(p.theta)));
                    const height = maxTheta > 0 ? (Math.abs(point.theta) / maxTheta) * 100 : 0;
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-red-500 rounded-t transition-all hover:opacity-80"
                        style={{ height: `${height}%` }}
                        title={`${point.daysToExpiry} DTE: θ${point.theta.toFixed(4)}`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>Expiry</span>
                  <span>Days to Expiry</span>
                  <span>Today</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Probability Tab */}
          <TabsContent value="probability" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ITM Probability */}
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center mb-4">
                    <div className="text-4xl font-bold text-green-500">
                      {(result.greeks.probability.itm * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Probability of Profit</div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-4">
                    <div 
                      className="bg-green-500 h-4 rounded-full transition-all"
                      style={{ width: `${result.greeks.probability.itm * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 text-center">
                    Chance of finishing in the money at expiration
                  </div>
                </CardContent>
              </Card>

              {/* OTM Probability */}
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center mb-4">
                    <div className="text-4xl font-bold text-red-500">
                      {(result.greeks.probability.otm * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Probability of Loss</div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-4">
                    <div 
                      className="bg-red-500 h-4 rounded-full transition-all"
                      style={{ width: `${result.greeks.probability.otm * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 text-center">
                    Chance of expiring worthless
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Risk/Reward Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Risk/Reward Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-sm text-muted-foreground">Max Loss</div>
                    <div className="text-xl font-bold text-red-500">
                      ${result.greeks.price.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">Premium paid</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-sm text-muted-foreground">Max Gain</div>
                    <div className="text-xl font-bold text-green-500">
                      {optionType === 'call' ? 'Unlimited' : `$${(strikePrice - result.greeks.price).toFixed(2)}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {optionType === 'call' ? 'If stock rises' : 'If stock falls to $0'}
                    </div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-sm text-muted-foreground">Risk/Reward</div>
                    <div className="text-xl font-bold">
                      {optionType === 'call' 
                        ? '∞' 
                        : `${((strikePrice - result.greeks.price) / result.greeks.price).toFixed(1)}:1`}
                    </div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-sm text-muted-foreground">Expected Value</div>
                    <div className={`text-xl font-bold ${
                      result.greeks.probability.itm > 0.5 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {result.greeks.probability.itm > 0.5 ? '+' : '-'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {result.greeks.probability.itm > 0.5 ? 'Favorable odds' : 'Unfavorable odds'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
