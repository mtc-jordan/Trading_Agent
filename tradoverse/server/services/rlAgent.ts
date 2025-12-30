/**
 * Reinforcement Learning Agent for Trading
 * Implements Deep Q-Network (DQN) with experience replay
 * Based on latest research from arXiv 2506.04358v1
 */

import { getDb } from "../db";
import { rlAgentModels, rlTrainingHistory, rlExperiences } from "../../drizzle/schema";
import { eq, desc, and, lt } from "drizzle-orm";

// Types for RL Agent
export interface State {
  // Price features (normalized)
  priceChange1d: number;
  priceChange5d: number;
  priceChange20d: number;
  volatility: number;
  
  // Technical indicators (normalized 0-1)
  rsi: number;
  macdHistogram: number;
  bollingerPosition: number; // Position within bands (0-1)
  adx: number;
  atr: number;
  
  // Market context
  marketRegime: number; // -1 bear, 0 sideways, 1 bull
  vixLevel: number;
  
  // Position context
  currentPosition: number; // -1 short, 0 flat, 1 long
  unrealizedPnl: number;
  daysInPosition: number;
}

export interface Action {
  type: 'hold' | 'buy' | 'sell' | 'close';
  confidence: number;
}

export interface Experience {
  state: State;
  action: number; // 0=hold, 1=buy, 2=sell, 3=close
  reward: number;
  nextState: State;
  done: boolean;
}

export interface QNetwork {
  weights: number[][][]; // Layer weights
  biases: number[][];    // Layer biases
}

export interface RLAgentConfig {
  learningRate: number;
  gamma: number;         // Discount factor
  epsilon: number;       // Exploration rate
  epsilonDecay: number;
  epsilonMin: number;
  batchSize: number;
  memorySize: number;
  targetUpdateFreq: number;
  hiddenLayers: number[];
}

// Default configuration based on research
const DEFAULT_CONFIG: RLAgentConfig = {
  learningRate: 0.0001,
  gamma: 0.99,
  epsilon: 1.0,
  epsilonDecay: 0.995,
  epsilonMin: 0.01,
  batchSize: 64,
  memorySize: 100000,
  targetUpdateFreq: 100,
  hiddenLayers: [128, 64, 32],
};

// State dimensions
const STATE_DIM = 14;
const ACTION_DIM = 4; // hold, buy, sell, close

/**
 * Initialize a new Q-Network with random weights
 */
function initializeNetwork(config: RLAgentConfig): QNetwork {
  const layers = [STATE_DIM, ...config.hiddenLayers, ACTION_DIM];
  const weights: number[][][] = [];
  const biases: number[][] = [];
  
  for (let i = 0; i < layers.length - 1; i++) {
    const inputSize = layers[i];
    const outputSize = layers[i + 1];
    
    // Xavier initialization
    const scale = Math.sqrt(2.0 / (inputSize + outputSize));
    
    const layerWeights: number[][] = [];
    for (let j = 0; j < outputSize; j++) {
      const neuronWeights: number[] = [];
      for (let k = 0; k < inputSize; k++) {
        neuronWeights.push((Math.random() * 2 - 1) * scale);
      }
      layerWeights.push(neuronWeights);
    }
    weights.push(layerWeights);
    
    const layerBiases: number[] = new Array(outputSize).fill(0);
    biases.push(layerBiases);
  }
  
  return { weights, biases };
}

/**
 * ReLU activation function
 */
function relu(x: number): number {
  return Math.max(0, x);
}

/**
 * Forward pass through the network
 */
function forward(network: QNetwork, state: number[]): number[] {
  let current = state;
  
  for (let layer = 0; layer < network.weights.length; layer++) {
    const layerWeights = network.weights[layer];
    const layerBiases = network.biases[layer];
    const output: number[] = [];
    
    for (let j = 0; j < layerWeights.length; j++) {
      let sum = layerBiases[j];
      for (let k = 0; k < current.length; k++) {
        sum += layerWeights[j][k] * current[k];
      }
      // Apply ReLU for hidden layers, linear for output
      output.push(layer < network.weights.length - 1 ? relu(sum) : sum);
    }
    current = output;
  }
  
  return current;
}

/**
 * Convert State object to array for network input
 */
function stateToArray(state: State): number[] {
  return [
    state.priceChange1d,
    state.priceChange5d,
    state.priceChange20d,
    state.volatility,
    state.rsi,
    state.macdHistogram,
    state.bollingerPosition,
    state.adx,
    state.atr,
    state.marketRegime,
    state.vixLevel,
    state.currentPosition,
    state.unrealizedPnl,
    state.daysInPosition,
  ];
}

/**
 * Select action using epsilon-greedy policy
 */
function selectAction(
  network: QNetwork, 
  state: State, 
  epsilon: number
): { action: number; qValues: number[] } {
  const qValues = forward(network, stateToArray(state));
  
  // Epsilon-greedy exploration
  if (Math.random() < epsilon) {
    return { action: Math.floor(Math.random() * ACTION_DIM), qValues };
  }
  
  // Greedy action
  let maxQ = qValues[0];
  let maxAction = 0;
  for (let i = 1; i < qValues.length; i++) {
    if (qValues[i] > maxQ) {
      maxQ = qValues[i];
      maxAction = i;
    }
  }
  
  return { action: maxAction, qValues };
}

/**
 * Calculate reward based on trading outcome
 * R = α * Return + β * Risk_Penalty + γ * Transaction_Cost + δ * Holding_Bonus
 */
function calculateReward(
  action: number,
  pnl: number,
  riskPenalty: number,
  transactionCost: number,
  holdingBonus: number
): number {
  const alpha = 1.0;   // Return weight
  const beta = 0.5;    // Risk penalty weight
  const gamma = 0.1;   // Transaction cost weight
  const delta = 0.01;  // Holding bonus weight
  
  return alpha * pnl - beta * riskPenalty - gamma * transactionCost + delta * holdingBonus;
}

/**
 * RL Agent class for managing training and inference
 */
export class RLTradingAgent {
  private config: RLAgentConfig;
  private qNetwork: QNetwork;
  private targetNetwork: QNetwork;
  private replayBuffer: Experience[] = [];
  private stepCount: number = 0;
  private epsilon: number;
  private modelId: string | null = null;
  
  constructor(config: Partial<RLAgentConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.qNetwork = initializeNetwork(this.config);
    this.targetNetwork = initializeNetwork(this.config);
    this.epsilon = this.config.epsilon;
    
    // Copy weights to target network
    this.updateTargetNetwork();
  }
  
  /**
   * Update target network weights from Q-network
   */
  private updateTargetNetwork(): void {
    this.targetNetwork = JSON.parse(JSON.stringify(this.qNetwork));
  }
  
  /**
   * Store experience in replay buffer
   */
  storeExperience(experience: Experience): void {
    if (this.replayBuffer.length >= this.config.memorySize) {
      this.replayBuffer.shift();
    }
    this.replayBuffer.push(experience);
  }
  
  /**
   * Sample a batch from replay buffer
   */
  private sampleBatch(): Experience[] {
    const batch: Experience[] = [];
    const indices = new Set<number>();
    
    while (indices.size < Math.min(this.config.batchSize, this.replayBuffer.length)) {
      indices.add(Math.floor(Math.random() * this.replayBuffer.length));
    }
    
    const indicesArray = Array.from(indices);
    for (const idx of indicesArray) {
      batch.push(this.replayBuffer[idx]);
    }
    
    return batch;
  }
  
  /**
   * Train the network on a batch of experiences
   */
  train(): { loss: number } {
    if (this.replayBuffer.length < this.config.batchSize) {
      return { loss: 0 };
    }
    
    const batch = this.sampleBatch();
    let totalLoss = 0;
    
    for (const exp of batch) {
      const stateArray = stateToArray(exp.state);
      const nextStateArray = stateToArray(exp.nextState);
      
      // Current Q-values
      const currentQ = forward(this.qNetwork, stateArray);
      
      // Target Q-value using Double DQN
      const nextQMain = forward(this.qNetwork, nextStateArray);
      const nextQTarget = forward(this.targetNetwork, nextStateArray);
      
      // Find best action from main network
      let bestNextAction = 0;
      let maxNextQ = nextQMain[0];
      for (let i = 1; i < nextQMain.length; i++) {
        if (nextQMain[i] > maxNextQ) {
          maxNextQ = nextQMain[i];
          bestNextAction = i;
        }
      }
      
      // Calculate target using target network's Q-value for the best action
      const target = exp.done 
        ? exp.reward 
        : exp.reward + this.config.gamma * nextQTarget[bestNextAction];
      
      // Calculate TD error
      const tdError = target - currentQ[exp.action];
      totalLoss += tdError * tdError;
      
      // Update weights using gradient descent (simplified)
      this.updateWeights(stateArray, exp.action, tdError);
    }
    
    // Decay epsilon
    this.epsilon = Math.max(
      this.config.epsilonMin,
      this.epsilon * this.config.epsilonDecay
    );
    
    // Update target network periodically
    this.stepCount++;
    if (this.stepCount % this.config.targetUpdateFreq === 0) {
      this.updateTargetNetwork();
    }
    
    return { loss: totalLoss / batch.length };
  }
  
  /**
   * Update network weights using gradient descent
   */
  private updateWeights(state: number[], action: number, tdError: number): void {
    const lr = this.config.learningRate;
    
    // Forward pass to get activations
    const activations: number[][] = [state];
    let current = state;
    
    for (let layer = 0; layer < this.qNetwork.weights.length; layer++) {
      const layerWeights = this.qNetwork.weights[layer];
      const layerBiases = this.qNetwork.biases[layer];
      const output: number[] = [];
      
      for (let j = 0; j < layerWeights.length; j++) {
        let sum = layerBiases[j];
        for (let k = 0; k < current.length; k++) {
          sum += layerWeights[j][k] * current[k];
        }
        output.push(layer < this.qNetwork.weights.length - 1 ? relu(sum) : sum);
      }
      activations.push(output);
      current = output;
    }
    
    // Backward pass (simplified gradient descent)
    // Only update weights connected to the selected action
    const lastLayer = this.qNetwork.weights.length - 1;
    const lastActivation = activations[lastLayer];
    
    // Update output layer weights for the selected action
    for (let k = 0; k < lastActivation.length; k++) {
      this.qNetwork.weights[lastLayer][action][k] += lr * tdError * lastActivation[k];
    }
    this.qNetwork.biases[lastLayer][action] += lr * tdError;
    
    // Propagate gradient to hidden layers (simplified)
    let gradient = tdError;
    for (let layer = lastLayer - 1; layer >= 0; layer--) {
      const activation = activations[layer];
      const nextActivation = activations[layer + 1];
      
      for (let j = 0; j < this.qNetwork.weights[layer].length; j++) {
        // ReLU derivative
        if (nextActivation[j] > 0) {
          for (let k = 0; k < activation.length; k++) {
            this.qNetwork.weights[layer][j][k] += lr * gradient * 0.1 * activation[k];
          }
          this.qNetwork.biases[layer][j] += lr * gradient * 0.1;
        }
      }
      gradient *= 0.5; // Decay gradient
    }
  }
  
  /**
   * Get action recommendation for current state
   */
  getAction(state: State): Action {
    const { action, qValues } = selectAction(this.qNetwork, state, 0); // No exploration during inference
    
    // Calculate confidence from Q-value distribution
    const maxQ = Math.max(...qValues);
    const minQ = Math.min(...qValues);
    const range = maxQ - minQ;
    const confidence = range > 0 ? (qValues[action] - minQ) / range : 0.5;
    
    const actionTypes: ('hold' | 'buy' | 'sell' | 'close')[] = ['hold', 'buy', 'sell', 'close'];
    
    return {
      type: actionTypes[action],
      confidence: Math.min(Math.max(confidence, 0), 1),
    };
  }
  
  /**
   * Get Q-values for all actions
   */
  getQValues(state: State): { action: string; qValue: number }[] {
    const qValues = forward(this.qNetwork, stateToArray(state));
    const actionTypes = ['hold', 'buy', 'sell', 'close'];
    
    return actionTypes.map((action, i) => ({
      action,
      qValue: qValues[i],
    }));
  }
  
  /**
   * Save model to database
   */
  async saveModel(userId: number, name: string, symbol: string): Promise<string> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const modelData = {
      qNetwork: this.qNetwork,
      targetNetwork: this.targetNetwork,
      config: this.config,
      epsilon: this.epsilon,
      stepCount: this.stepCount,
      replayBufferSize: this.replayBuffer.length,
    };
    
    const [result] = await db.insert(rlAgentModels).values({
      userId,
      name,
      symbol,
      modelData: JSON.stringify(modelData),
      config: JSON.stringify(this.config),
      totalEpisodes: this.stepCount,
    });
    
    const insertId = result.insertId?.toString() || '';
    this.modelId = insertId;
    return insertId;
  }
  
  /**
   * Load model from database
   */
  async loadModel(modelId: string): Promise<boolean> {
    const db = await getDb();
    
    const [model] = await db!
      .select()
      .from(rlAgentModels)
      .where(eq(rlAgentModels.id, parseInt(modelId)))
      .limit(1);
    
    if (!model) {
      return false;
    }
    
    const modelData = JSON.parse(model.modelData as string);
    this.qNetwork = modelData.qNetwork;
    this.targetNetwork = modelData.targetNetwork;
    this.config = modelData.config;
    this.epsilon = modelData.epsilon;
    this.stepCount = modelData.stepCount;
    this.modelId = modelId;
    
    return true;
  }
  
  /**
   * Log training history
   */
  async logTraining(
    episode: number,
    totalReward: number,
    avgLoss: number,
    portfolioValue: number
  ): Promise<void> {
    if (!this.modelId) return;
    
    const db = await getDb();
    
    await db!.insert(rlTrainingHistory).values({
      modelId: parseInt(this.modelId),
      episode,
      totalReward: totalReward.toString(),
      avgLoss: avgLoss.toString(),
      steps: 1,
      epsilon: this.epsilon.toString(),
    });
  }
  
  /**
   * Get training statistics
   */
  getStats(): {
    epsilon: number;
    stepCount: number;
    bufferSize: number;
    config: RLAgentConfig;
  } {
    return {
      epsilon: this.epsilon,
      stepCount: this.stepCount,
      bufferSize: this.replayBuffer.length,
      config: this.config,
    };
  }
}

/**
 * Create state from market data
 */
export function createStateFromMarketData(
  priceHistory: { close: number; high: number; low: number; volume: number }[],
  currentPosition: number,
  unrealizedPnl: number,
  daysInPosition: number
): State {
  const closes = priceHistory.map(p => p.close);
  const current = closes[closes.length - 1];
  
  // Price changes
  const priceChange1d = closes.length > 1 
    ? (current - closes[closes.length - 2]) / closes[closes.length - 2] 
    : 0;
  const priceChange5d = closes.length > 5 
    ? (current - closes[closes.length - 6]) / closes[closes.length - 6] 
    : 0;
  const priceChange20d = closes.length > 20 
    ? (current - closes[closes.length - 21]) / closes[closes.length - 21] 
    : 0;
  
  // Volatility (20-day rolling std)
  const returns = closes.slice(-21).map((c, i, arr) => 
    i === 0 ? 0 : (c - arr[i - 1]) / arr[i - 1]
  ).slice(1);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const volatility = Math.sqrt(
    returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
  );
  
  // RSI (14-period)
  const rsi = calculateRSI(closes.slice(-15)) / 100;
  
  // MACD histogram (normalized)
  const macdHistogram = calculateMACDHistogram(closes.slice(-35));
  
  // Bollinger position
  const { position: bollingerPosition } = calculateBollingerPosition(closes.slice(-21));
  
  // ADX (simplified)
  const adx = calculateADX(priceHistory.slice(-15)) / 100;
  
  // ATR (normalized by price)
  const atr = calculateATR(priceHistory.slice(-15)) / current;
  
  // Market regime detection
  const sma50 = closes.length >= 50 
    ? closes.slice(-50).reduce((a, b) => a + b, 0) / 50 
    : current;
  const sma200 = closes.length >= 200 
    ? closes.slice(-200).reduce((a, b) => a + b, 0) / 200 
    : current;
  const marketRegime = current > sma50 && sma50 > sma200 ? 1 : 
                       current < sma50 && sma50 < sma200 ? -1 : 0;
  
  // VIX level (placeholder - would need actual VIX data)
  const vixLevel = volatility * 100; // Proxy using volatility
  
  return {
    priceChange1d: Math.tanh(priceChange1d * 10), // Normalize to [-1, 1]
    priceChange5d: Math.tanh(priceChange5d * 5),
    priceChange20d: Math.tanh(priceChange20d * 2),
    volatility: Math.min(volatility * 10, 1),
    rsi,
    macdHistogram: Math.tanh(macdHistogram),
    bollingerPosition,
    adx,
    atr: Math.min(atr * 10, 1),
    marketRegime,
    vixLevel: Math.min(vixLevel / 50, 1),
    currentPosition,
    unrealizedPnl: Math.tanh(unrealizedPnl),
    daysInPosition: Math.min(daysInPosition / 20, 1),
  };
}

// Helper functions for indicators
function calculateRSI(prices: number[]): number {
  if (prices.length < 2) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / (prices.length - 1);
  const avgLoss = losses / (prices.length - 1);
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACDHistogram(prices: number[]): number {
  if (prices.length < 26) return 0;
  
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12 - ema26;
  
  // Signal line (9-period EMA of MACD) - simplified
  return macd / prices[prices.length - 1] * 100;
}

function calculateEMA(prices: number[], period: number): number {
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

function calculateBollingerPosition(prices: number[]): { position: number } {
  const sma = prices.reduce((a, b) => a + b, 0) / prices.length;
  const std = Math.sqrt(
    prices.reduce((sum, p) => sum + Math.pow(p - sma, 2), 0) / prices.length
  );
  
  const upper = sma + 2 * std;
  const lower = sma - 2 * std;
  const current = prices[prices.length - 1];
  
  // Position within bands (0 = lower, 1 = upper)
  const position = (current - lower) / (upper - lower);
  return { position: Math.min(Math.max(position, 0), 1) };
}

function calculateADX(data: { high: number; low: number; close: number }[]): number {
  if (data.length < 2) return 25;
  
  let sumDX = 0;
  for (let i = 1; i < data.length; i++) {
    const highDiff = data[i].high - data[i - 1].high;
    const lowDiff = data[i - 1].low - data[i].low;
    
    const plusDM = highDiff > lowDiff && highDiff > 0 ? highDiff : 0;
    const minusDM = lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0;
    
    const tr = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    );
    
    if (tr > 0) {
      const dx = Math.abs(plusDM - minusDM) / (plusDM + minusDM || 1) * 100;
      sumDX += dx;
    }
  }
  
  return sumDX / (data.length - 1);
}

function calculateATR(data: { high: number; low: number; close: number }[]): number {
  if (data.length < 2) return 0;
  
  let sumTR = 0;
  for (let i = 1; i < data.length; i++) {
    const tr = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    );
    sumTR += tr;
  }
  
  return sumTR / (data.length - 1);
}

export default {
  RLTradingAgent,
  createStateFromMarketData,
  calculateReward,
};
