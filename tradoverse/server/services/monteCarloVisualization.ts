/**
 * Monte Carlo Visualization Service
 * 
 * Generates visualization data for Monte Carlo simulations including
 * probability distributions, VaR calculations, and confidence intervals.
 */

export interface MonteCarloVisualizationData {
  // Probability distribution histogram
  histogram: {
    bins: number[];
    frequencies: number[];
    binLabels: string[];
  };
  
  // Key statistics
  statistics: {
    mean: number;
    median: number;
    standardDeviation: number;
    skewness: number;
    kurtosis: number;
    min: number;
    max: number;
  };
  
  // Value at Risk
  var: {
    var95: number;
    var99: number;
    cvar95: number; // Conditional VaR (Expected Shortfall)
    cvar99: number;
  };
  
  // Confidence intervals
  confidenceIntervals: {
    ci50: { lower: number; upper: number };
    ci75: { lower: number; upper: number };
    ci90: { lower: number; upper: number };
    ci95: { lower: number; upper: number };
    ci99: { lower: number; upper: number };
  };
  
  // Probability of outcomes
  probabilities: {
    profitProbability: number;
    lossProbability: number;
    breakEvenProbability: number;
    targetProbabilities: Array<{
      target: number;
      probability: number;
    }>;
  };
  
  // Cumulative distribution
  cumulativeDistribution: {
    values: number[];
    probabilities: number[];
  };
  
  // Scenario paths (sample of paths for visualization)
  samplePaths: Array<{
    pathId: number;
    values: number[];
    finalValue: number;
    maxDrawdown: number;
    isProfit: boolean;
  }>;
}

/**
 * Generate visualization data from Monte Carlo simulation results
 */
export function generateVisualizationData(
  simulationResults: number[],
  initialValue: number,
  numBins: number = 50,
  numSamplePaths: number = 10,
  pathData?: Array<number[]>
): MonteCarloVisualizationData {
  const sorted = [...simulationResults].sort((a, b) => a - b);
  const n = sorted.length;
  
  // Calculate histogram
  const min = sorted[0];
  const max = sorted[n - 1];
  const binWidth = (max - min) / numBins;
  const bins: number[] = [];
  const frequencies: number[] = new Array(numBins).fill(0);
  const binLabels: string[] = [];
  
  for (let i = 0; i < numBins; i++) {
    const binStart = min + i * binWidth;
    const binEnd = binStart + binWidth;
    bins.push(binStart + binWidth / 2);
    binLabels.push(`$${(binStart / 1000).toFixed(1)}k - $${(binEnd / 1000).toFixed(1)}k`);
  }
  
  for (const value of simulationResults) {
    const binIndex = Math.min(Math.floor((value - min) / binWidth), numBins - 1);
    frequencies[binIndex]++;
  }
  
  // Normalize frequencies to percentages
  const normalizedFrequencies = frequencies.map(f => (f / n) * 100);
  
  // Calculate statistics
  const mean = simulationResults.reduce((a, b) => a + b, 0) / n;
  const median = n % 2 === 0 
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 
    : sorted[Math.floor(n / 2)];
  
  const variance = simulationResults.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const standardDeviation = Math.sqrt(variance);
  
  // Skewness
  const skewness = simulationResults.reduce((sum, val) => 
    sum + Math.pow((val - mean) / standardDeviation, 3), 0) / n;
  
  // Kurtosis
  const kurtosis = simulationResults.reduce((sum, val) => 
    sum + Math.pow((val - mean) / standardDeviation, 4), 0) / n - 3;
  
  // Value at Risk (losses are negative returns)
  const returns = simulationResults.map(v => (v - initialValue) / initialValue);
  const sortedReturns = [...returns].sort((a, b) => a - b);
  
  const var95Index = Math.floor(n * 0.05);
  const var99Index = Math.floor(n * 0.01);
  
  const var95 = -sortedReturns[var95Index] * initialValue;
  const var99 = -sortedReturns[var99Index] * initialValue;
  
  // Conditional VaR (Expected Shortfall)
  const cvar95 = -sortedReturns.slice(0, var95Index).reduce((a, b) => a + b, 0) / var95Index * initialValue;
  const cvar99 = -sortedReturns.slice(0, var99Index).reduce((a, b) => a + b, 0) / var99Index * initialValue;
  
  // Confidence intervals
  const getPercentile = (p: number) => sorted[Math.floor(n * p)];
  
  const confidenceIntervals = {
    ci50: { lower: getPercentile(0.25), upper: getPercentile(0.75) },
    ci75: { lower: getPercentile(0.125), upper: getPercentile(0.875) },
    ci90: { lower: getPercentile(0.05), upper: getPercentile(0.95) },
    ci95: { lower: getPercentile(0.025), upper: getPercentile(0.975) },
    ci99: { lower: getPercentile(0.005), upper: getPercentile(0.995) },
  };
  
  // Probability calculations
  const profitCount = simulationResults.filter(v => v > initialValue).length;
  const lossCount = simulationResults.filter(v => v < initialValue).length;
  const breakEvenCount = n - profitCount - lossCount;
  
  // Target probabilities
  const targets = [
    initialValue * 1.05,  // 5% gain
    initialValue * 1.10,  // 10% gain
    initialValue * 1.20,  // 20% gain
    initialValue * 0.95,  // 5% loss
    initialValue * 0.90,  // 10% loss
    initialValue * 0.80,  // 20% loss
  ];
  
  const targetProbabilities = targets.map(target => ({
    target,
    probability: target > initialValue 
      ? simulationResults.filter(v => v >= target).length / n * 100
      : simulationResults.filter(v => v <= target).length / n * 100,
  }));
  
  // Cumulative distribution
  const cdfValues: number[] = [];
  const cdfProbabilities: number[] = [];
  const step = Math.max(1, Math.floor(n / 100));
  
  for (let i = 0; i < n; i += step) {
    cdfValues.push(sorted[i]);
    cdfProbabilities.push((i / n) * 100);
  }
  
  // Sample paths for visualization
  const samplePaths: MonteCarloVisualizationData['samplePaths'] = [];
  
  if (pathData && pathData.length > 0) {
    // Select representative paths: best, worst, median, and random samples
    const pathsWithFinal = pathData.map((path, i) => ({
      path,
      finalValue: path[path.length - 1],
      index: i,
    }));
    
    pathsWithFinal.sort((a, b) => a.finalValue - b.finalValue);
    
    // Select specific paths
    const selectedIndices = new Set<number>();
    selectedIndices.add(0); // Worst
    selectedIndices.add(pathsWithFinal.length - 1); // Best
    selectedIndices.add(Math.floor(pathsWithFinal.length / 2)); // Median
    
    // Add random samples
    while (selectedIndices.size < Math.min(numSamplePaths, pathsWithFinal.length)) {
      selectedIndices.add(Math.floor(Math.random() * pathsWithFinal.length));
    }
    
    Array.from(selectedIndices).forEach((idx, i) => {
      const pathInfo = pathsWithFinal[idx];
      const path = pathInfo.path;
      
      // Calculate max drawdown for this path
      let peak = path[0];
      let maxDrawdown = 0;
      for (const value of path) {
        if (value > peak) peak = value;
        const drawdown = (peak - value) / peak;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      }
      
      samplePaths.push({
        pathId: i,
        values: path,
        finalValue: pathInfo.finalValue,
        maxDrawdown: maxDrawdown * 100,
        isProfit: pathInfo.finalValue > initialValue,
      });
    });
  }
  
  return {
    histogram: {
      bins,
      frequencies: normalizedFrequencies,
      binLabels,
    },
    statistics: {
      mean,
      median,
      standardDeviation,
      skewness,
      kurtosis,
      min,
      max,
    },
    var: {
      var95,
      var99,
      cvar95,
      cvar99,
    },
    confidenceIntervals,
    probabilities: {
      profitProbability: (profitCount / n) * 100,
      lossProbability: (lossCount / n) * 100,
      breakEvenProbability: (breakEvenCount / n) * 100,
      targetProbabilities,
    },
    cumulativeDistribution: {
      values: cdfValues,
      probabilities: cdfProbabilities,
    },
    samplePaths,
  };
}

/**
 * Generate risk metrics summary
 */
export function generateRiskSummary(
  visualizationData: MonteCarloVisualizationData,
  initialValue: number
): {
  riskLevel: 'low' | 'moderate' | 'high' | 'extreme';
  riskScore: number;
  summary: string;
  recommendations: string[];
} {
  const { var: varData, probabilities, statistics } = visualizationData;
  
  // Calculate risk score (0-100)
  let riskScore = 0;
  
  // VaR contribution (0-30)
  const var95Percent = (varData.var95 / initialValue) * 100;
  riskScore += Math.min(30, var95Percent * 3);
  
  // Loss probability contribution (0-30)
  riskScore += (probabilities.lossProbability / 100) * 30;
  
  // Volatility contribution (0-20)
  const cv = (statistics.standardDeviation / statistics.mean) * 100;
  riskScore += Math.min(20, cv);
  
  // Skewness contribution (0-10)
  if (statistics.skewness < 0) {
    riskScore += Math.min(10, Math.abs(statistics.skewness) * 5);
  }
  
  // Kurtosis contribution (0-10)
  if (statistics.kurtosis > 0) {
    riskScore += Math.min(10, statistics.kurtosis * 2);
  }
  
  riskScore = Math.min(100, Math.max(0, riskScore));
  
  // Determine risk level
  let riskLevel: 'low' | 'moderate' | 'high' | 'extreme';
  if (riskScore < 25) riskLevel = 'low';
  else if (riskScore < 50) riskLevel = 'moderate';
  else if (riskScore < 75) riskLevel = 'high';
  else riskLevel = 'extreme';
  
  // Generate summary
  const summary = `This strategy has a ${riskLevel} risk profile with a ${probabilities.profitProbability.toFixed(1)}% probability of profit. ` +
    `The 95% VaR is $${varData.var95.toFixed(0)}, meaning there's a 5% chance of losing more than this amount. ` +
    `Expected outcome ranges from $${statistics.min.toFixed(0)} to $${statistics.max.toFixed(0)}.`;
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (probabilities.lossProbability > 40) {
    recommendations.push('Consider reducing position sizes to limit potential losses');
  }
  
  if (var95Percent > 10) {
    recommendations.push('High VaR suggests adding stop-loss orders for protection');
  }
  
  if (statistics.skewness < -0.5) {
    recommendations.push('Negative skew indicates tail risk - consider hedging strategies');
  }
  
  if (cv > 30) {
    recommendations.push('High volatility - consider diversifying across more assets');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Risk metrics are within acceptable ranges');
    recommendations.push('Continue monitoring market conditions');
  }
  
  return {
    riskLevel,
    riskScore,
    summary,
    recommendations,
  };
}

/**
 * Format visualization data for chart.js
 */
export function formatForChartJS(
  visualizationData: MonteCarloVisualizationData,
  initialValue: number
): {
  histogramChart: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor: string;
      borderColor: string;
    }>;
  };
  cdfChart: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      borderColor: string;
      fill: boolean;
    }>;
  };
  confidenceChart: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor: string;
    }>;
  };
} {
  const { histogram, cumulativeDistribution, confidenceIntervals } = visualizationData;
  
  return {
    histogramChart: {
      labels: histogram.binLabels,
      datasets: [{
        label: 'Probability (%)',
        data: histogram.frequencies,
        backgroundColor: 'rgba(34, 197, 94, 0.6)',
        borderColor: 'rgb(34, 197, 94)',
      }],
    },
    cdfChart: {
      labels: cumulativeDistribution.values.map(v => `$${(v / 1000).toFixed(1)}k`),
      datasets: [{
        label: 'Cumulative Probability (%)',
        data: cumulativeDistribution.probabilities,
        borderColor: 'rgb(59, 130, 246)',
        fill: false,
      }],
    },
    confidenceChart: {
      labels: ['50%', '75%', '90%', '95%', '99%'],
      datasets: [
        {
          label: 'Lower Bound',
          data: [
            confidenceIntervals.ci50.lower,
            confidenceIntervals.ci75.lower,
            confidenceIntervals.ci90.lower,
            confidenceIntervals.ci95.lower,
            confidenceIntervals.ci99.lower,
          ],
          backgroundColor: 'rgba(239, 68, 68, 0.6)',
        },
        {
          label: 'Upper Bound',
          data: [
            confidenceIntervals.ci50.upper,
            confidenceIntervals.ci75.upper,
            confidenceIntervals.ci90.upper,
            confidenceIntervals.ci95.upper,
            confidenceIntervals.ci99.upper,
          ],
          backgroundColor: 'rgba(34, 197, 94, 0.6)',
        },
      ],
    },
  };
}
