/**
 * AI Agents Service - 7-Agent Consensus System
 * Supports multiple LLM providers (OpenAI, DeepSeek R1, Claude, Gemini)
 * with user-configurable settings
 */

import { invokeLLM } from "../_core/llm";
import { callDataApi } from "../_core/dataApi";
import { invokeLlm, LlmConfig, LlmMessage, LlmProvider, decryptApiKey } from "./llmProvider";
import * as db from "../db";

// Agent types for the 7-agent consensus system
export type AgentType = 
  | "technical" 
  | "fundamental" 
  | "sentiment" 
  | "risk" 
  | "microstructure" 
  | "macro" 
  | "quant";

export type TradingSignal = "strong_buy" | "buy" | "hold" | "sell" | "strong_sell";

export interface AgentAnalysisResult {
  agent: AgentType;
  score: number; // -1 to 1
  signal: TradingSignal;
  confidence: number; // 0 to 1
  reasoning: string;
  keyFactors: string[];
}

export interface ConsensusResult {
  symbol: string;
  timestamp: Date;
  agents: AgentAnalysisResult[];
  consensusScore: number;
  consensusSignal: TradingSignal;
  overallConfidence: number;
  recommendation: string;
  riskAssessment: string;
  llmProvider?: string;
  llmModel?: string;
}

// User LLM configuration interface
interface UserLlmConfig {
  provider: LlmProvider;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

// Get user's LLM configuration
async function getUserLlmConfig(userId: number): Promise<UserLlmConfig | null> {
  try {
    const settings = await db.getUserLlmSettings(userId);
    if (!settings) return null;

    const provider = settings.activeProvider as LlmProvider;
    let encryptedKey: string | null = null;

    switch (provider) {
      case "openai":
        encryptedKey = settings.openaiApiKey;
        break;
      case "deepseek":
        encryptedKey = settings.deepseekApiKey;
        break;
      case "claude":
        encryptedKey = settings.claudeApiKey;
        break;
      case "gemini":
        encryptedKey = settings.geminiApiKey;
        break;
    }

    if (!encryptedKey) return null;

    const apiKey = decryptApiKey(encryptedKey);
    if (!apiKey) return null;

    let model: string;
    switch (provider) {
      case "openai":
        model = settings.openaiModel || "gpt-4-turbo";
        break;
      case "deepseek":
        model = settings.deepseekModel || "deepseek-reasoner";
        break;
      case "claude":
        model = settings.claudeModel || "claude-sonnet-4-20250514";
        break;
      case "gemini":
        model = settings.geminiModel || "gemini-2.0-flash";
        break;
    }

    return {
      provider,
      apiKey,
      model,
      temperature: parseFloat(settings.temperature || "0.7"),
      maxTokens: settings.maxTokens || 4096,
    };
  } catch (error) {
    console.error("Error getting user LLM config:", error);
    return null;
  }
}

// Invoke LLM with user's configuration or fallback to built-in
async function invokeUserLlm(
  userId: number,
  messages: LlmMessage[],
  jsonSchema?: any
): Promise<{ content: string; provider: string; model: string }> {
  const userConfig = await getUserLlmConfig(userId);

  if (userConfig) {
    // Use user's configured LLM provider
    try {
      const response = await invokeLlm(messages, {
        provider: userConfig.provider,
        apiKey: userConfig.apiKey,
        model: userConfig.model,
        temperature: userConfig.temperature,
        maxTokens: userConfig.maxTokens,
      });

      // Update usage tracking
      if (response.usage) {
        await db.updateLlmUsage(userId, response.usage.totalTokens);
      }

      return {
        content: response.content,
        provider: userConfig.provider,
        model: userConfig.model,
      };
    } catch (error) {
      console.error(`User LLM (${userConfig.provider}) failed, falling back to built-in:`, error);
    }
  }

  // Fallback to built-in LLM
  const response = await invokeLLM({
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    response_format: jsonSchema ? {
      type: "json_schema",
      json_schema: jsonSchema,
    } : undefined,
  });

  const content = response.choices[0]?.message?.content;
  return {
    content: typeof content === "string" ? content : JSON.stringify(content),
    provider: "built-in",
    model: "default",
  };
}

// Fetch market data from Yahoo Finance
export async function getMarketData(symbol: string) {
  try {
    const response = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol,
        region: "US",
        interval: "1d",
        range: "3mo",
        includeAdjustedClose: true,
      },
    });
    return response;
  } catch (error) {
    console.error(`Failed to fetch market data for ${symbol}:`, error);
    return null;
  }
}

// Fetch stock insights
export async function getStockInsights(symbol: string) {
  try {
    const response = await callDataApi("YahooFinance/get_stock_insights", {
      query: { symbol },
    });
    return response;
  } catch (error) {
    console.error(`Failed to fetch insights for ${symbol}:`, error);
    return null;
  }
}

// Fetch stock holders data
export async function getStockHolders(symbol: string) {
  try {
    const response = await callDataApi("YahooFinance/get_stock_holders", {
      query: { symbol, region: "US", lang: "en-US" },
    });
    return response;
  } catch (error) {
    console.error(`Failed to fetch holders for ${symbol}:`, error);
    return null;
  }
}

// Convert score to trading signal
function scoreToSignal(score: number): TradingSignal {
  if (score >= 0.6) return "strong_buy";
  if (score >= 0.2) return "buy";
  if (score >= -0.2) return "hold";
  if (score >= -0.6) return "sell";
  return "strong_sell";
}

// Parse JSON response safely
function parseJsonResponse(content: string): any {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// Technical Analysis Agent
async function runTechnicalAgent(userId: number, symbol: string, marketData: any): Promise<AgentAnalysisResult> {
  const messages: LlmMessage[] = [
    { 
      role: "system", 
      content: "You are a technical analysis expert. Analyze market data and provide trading signals. Always respond with valid JSON." 
    },
    { 
      role: "user", 
      content: `Analyze the following market data for ${symbol} and provide a trading signal.

Market Data Summary:
${JSON.stringify(marketData?.chart?.result?.[0]?.meta || {}, null, 2)}

Consider: Price trends, moving averages, support/resistance, volume patterns, momentum indicators (RSI, MACD).

Respond in JSON format:
{
  "score": <number between -1 and 1>,
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief explanation>",
  "keyFactors": ["<factor1>", "<factor2>", "<factor3>"]
}` 
    }
  ];

  try {
    const response = await invokeUserLlm(userId, messages);
    const result = parseJsonResponse(response.content);
    
    if (!result) throw new Error("Failed to parse response");

    return {
      agent: "technical",
      score: Math.max(-1, Math.min(1, result.score || 0)),
      signal: scoreToSignal(result.score || 0),
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      reasoning: result.reasoning || "Technical analysis completed",
      keyFactors: result.keyFactors || []
    };
  } catch (error) {
    console.error("Technical agent error:", error);
    return {
      agent: "technical",
      score: 0,
      signal: "hold",
      confidence: 0.3,
      reasoning: "Unable to complete technical analysis",
      keyFactors: []
    };
  }
}

// Fundamental Analysis Agent
async function runFundamentalAgent(userId: number, symbol: string, insights: any, holders: any): Promise<AgentAnalysisResult> {
  const messages: LlmMessage[] = [
    { 
      role: "system", 
      content: "You are a fundamental analysis expert. Analyze company fundamentals and provide trading signals. Always respond with valid JSON." 
    },
    { 
      role: "user", 
      content: `Analyze the following data for ${symbol}.

Stock Insights:
${JSON.stringify(insights || {}, null, 2).slice(0, 2000)}

Institutional Holders Summary:
${JSON.stringify(holders?.quoteSummary?.result?.[0]?.institutionOwnership || {}, null, 2).slice(0, 1000)}

Consider: Valuation metrics (P/E, P/B, PEG), growth prospects, competitive position, institutional ownership, earnings quality.

Respond in JSON format:
{
  "score": <number between -1 and 1>,
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief explanation>",
  "keyFactors": ["<factor1>", "<factor2>", "<factor3>"]
}` 
    }
  ];

  try {
    const response = await invokeUserLlm(userId, messages);
    const result = parseJsonResponse(response.content);
    
    if (!result) throw new Error("Failed to parse response");

    return {
      agent: "fundamental",
      score: Math.max(-1, Math.min(1, result.score || 0)),
      signal: scoreToSignal(result.score || 0),
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      reasoning: result.reasoning || "Fundamental analysis completed",
      keyFactors: result.keyFactors || []
    };
  } catch (error) {
    console.error("Fundamental agent error:", error);
    return {
      agent: "fundamental",
      score: 0,
      signal: "hold",
      confidence: 0.3,
      reasoning: "Unable to complete fundamental analysis",
      keyFactors: []
    };
  }
}

// Sentiment Analysis Agent
async function runSentimentAgent(userId: number, symbol: string, insights: any): Promise<AgentAnalysisResult> {
  const messages: LlmMessage[] = [
    { 
      role: "system", 
      content: "You are a sentiment analysis expert. Analyze market sentiment and provide trading signals. Always respond with valid JSON." 
    },
    { 
      role: "user", 
      content: `Analyze market sentiment for ${symbol}.

Available Insights:
${JSON.stringify(insights || {}, null, 2).slice(0, 2000)}

Consider: News sentiment, social media trends, analyst ratings, insider trading activity, options market sentiment.

Respond in JSON format:
{
  "score": <number between -1 and 1>,
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief explanation>",
  "keyFactors": ["<factor1>", "<factor2>", "<factor3>"]
}` 
    }
  ];

  try {
    const response = await invokeUserLlm(userId, messages);
    const result = parseJsonResponse(response.content);
    
    if (!result) throw new Error("Failed to parse response");

    return {
      agent: "sentiment",
      score: Math.max(-1, Math.min(1, result.score || 0)),
      signal: scoreToSignal(result.score || 0),
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      reasoning: result.reasoning || "Sentiment analysis completed",
      keyFactors: result.keyFactors || []
    };
  } catch (error) {
    console.error("Sentiment agent error:", error);
    return {
      agent: "sentiment",
      score: 0,
      signal: "hold",
      confidence: 0.3,
      reasoning: "Unable to complete sentiment analysis",
      keyFactors: []
    };
  }
}

// Risk Management Agent
async function runRiskAgent(userId: number, symbol: string, marketData: any): Promise<AgentAnalysisResult> {
  const messages: LlmMessage[] = [
    { 
      role: "system", 
      content: "You are a risk management expert. Assess trading risks and provide risk-adjusted signals. Always respond with valid JSON." 
    },
    { 
      role: "user", 
      content: `Assess the risk profile for trading ${symbol}.

Market Data:
${JSON.stringify(marketData?.chart?.result?.[0]?.meta || {}, null, 2)}

Consider: Volatility levels, liquidity risk, correlation with market, maximum drawdown potential, position sizing.

Respond in JSON format:
{
  "score": <number between -1 and 1, where negative means high risk>,
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief explanation>",
  "keyFactors": ["<factor1>", "<factor2>", "<factor3>"]
}` 
    }
  ];

  try {
    const response = await invokeUserLlm(userId, messages);
    const result = parseJsonResponse(response.content);
    
    if (!result) throw new Error("Failed to parse response");

    return {
      agent: "risk",
      score: Math.max(-1, Math.min(1, result.score || 0)),
      signal: scoreToSignal(result.score || 0),
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      reasoning: result.reasoning || "Risk assessment completed",
      keyFactors: result.keyFactors || []
    };
  } catch (error) {
    console.error("Risk agent error:", error);
    return {
      agent: "risk",
      score: 0,
      signal: "hold",
      confidence: 0.3,
      reasoning: "Unable to complete risk assessment",
      keyFactors: []
    };
  }
}

// Market Microstructure Agent
async function runMicrostructureAgent(userId: number, symbol: string, marketData: any): Promise<AgentAnalysisResult> {
  const messages: LlmMessage[] = [
    { 
      role: "system", 
      content: "You are a market microstructure expert. Analyze order flow and market dynamics. Always respond with valid JSON." 
    },
    { 
      role: "user", 
      content: `Analyze market microstructure for ${symbol}.

Market Data:
${JSON.stringify(marketData?.chart?.result?.[0]?.meta || {}, null, 2)}

Consider: Bid-ask spreads, order flow imbalances, market depth, trading volume patterns, price impact.

Respond in JSON format:
{
  "score": <number between -1 and 1>,
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief explanation>",
  "keyFactors": ["<factor1>", "<factor2>", "<factor3>"]
}` 
    }
  ];

  try {
    const response = await invokeUserLlm(userId, messages);
    const result = parseJsonResponse(response.content);
    
    if (!result) throw new Error("Failed to parse response");

    return {
      agent: "microstructure",
      score: Math.max(-1, Math.min(1, result.score || 0)),
      signal: scoreToSignal(result.score || 0),
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      reasoning: result.reasoning || "Microstructure analysis completed",
      keyFactors: result.keyFactors || []
    };
  } catch (error) {
    console.error("Microstructure agent error:", error);
    return {
      agent: "microstructure",
      score: 0,
      signal: "hold",
      confidence: 0.3,
      reasoning: "Unable to complete microstructure analysis",
      keyFactors: []
    };
  }
}

// Macroeconomic Agent
async function runMacroAgent(userId: number, symbol: string, insights: any): Promise<AgentAnalysisResult> {
  const messages: LlmMessage[] = [
    { 
      role: "system", 
      content: "You are a macroeconomic analyst. Analyze macro factors affecting the stock. Always respond with valid JSON." 
    },
    { 
      role: "user", 
      content: `Analyze macroeconomic factors for ${symbol}.

Stock Insights:
${JSON.stringify(insights || {}, null, 2).slice(0, 2000)}

Consider: Interest rate environment, inflation trends, GDP growth, sector rotation, currency impacts, geopolitical factors.

Respond in JSON format:
{
  "score": <number between -1 and 1>,
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief explanation>",
  "keyFactors": ["<factor1>", "<factor2>", "<factor3>"]
}` 
    }
  ];

  try {
    const response = await invokeUserLlm(userId, messages);
    const result = parseJsonResponse(response.content);
    
    if (!result) throw new Error("Failed to parse response");

    return {
      agent: "macro",
      score: Math.max(-1, Math.min(1, result.score || 0)),
      signal: scoreToSignal(result.score || 0),
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      reasoning: result.reasoning || "Macro analysis completed",
      keyFactors: result.keyFactors || []
    };
  } catch (error) {
    console.error("Macro agent error:", error);
    return {
      agent: "macro",
      score: 0,
      signal: "hold",
      confidence: 0.3,
      reasoning: "Unable to complete macro analysis",
      keyFactors: []
    };
  }
}

// Quantitative Agent
async function runQuantAgent(userId: number, symbol: string, marketData: any): Promise<AgentAnalysisResult> {
  const messages: LlmMessage[] = [
    { 
      role: "system", 
      content: "You are a quantitative analyst. Apply statistical and mathematical models. Always respond with valid JSON." 
    },
    { 
      role: "user", 
      content: `Apply quantitative analysis for ${symbol}.

Market Data:
${JSON.stringify(marketData?.chart?.result?.[0]?.meta || {}, null, 2)}

Consider: Statistical arbitrage opportunities, mean reversion signals, momentum factors, volatility modeling, correlation analysis.

Respond in JSON format:
{
  "score": <number between -1 and 1>,
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief explanation>",
  "keyFactors": ["<factor1>", "<factor2>", "<factor3>"]
}` 
    }
  ];

  try {
    const response = await invokeUserLlm(userId, messages);
    const result = parseJsonResponse(response.content);
    
    if (!result) throw new Error("Failed to parse response");

    return {
      agent: "quant",
      score: Math.max(-1, Math.min(1, result.score || 0)),
      signal: scoreToSignal(result.score || 0),
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      reasoning: result.reasoning || "Quantitative analysis completed",
      keyFactors: result.keyFactors || []
    };
  } catch (error) {
    console.error("Quant agent error:", error);
    return {
      agent: "quant",
      score: 0,
      signal: "hold",
      confidence: 0.3,
      reasoning: "Unable to complete quantitative analysis",
      keyFactors: []
    };
  }
}

// Get available agents based on subscription tier
export function getAvailableAgents(tier: string): AgentType[] {
  const allAgents: AgentType[] = ["technical", "fundamental", "sentiment", "risk", "microstructure", "macro", "quant"];
  
  switch (tier) {
    case "free":
      return ["technical", "sentiment"];
    case "starter":
      return ["technical", "fundamental", "sentiment", "risk"];
    case "pro":
    case "elite":
      return allAgents;
    default:
      return ["technical", "sentiment"];
  }
}

// Main consensus function
export async function runAgentConsensus(
  userId: number,
  symbol: string,
  tier: string = "free"
): Promise<ConsensusResult> {
  console.log(`Running agent consensus for ${symbol} (user: ${userId}, tier: ${tier})`);

  // Fetch market data
  const [marketData, insights, holders] = await Promise.all([
    getMarketData(symbol),
    getStockInsights(symbol),
    getStockHolders(symbol),
  ]);

  // Get available agents for this tier
  const availableAgents = getAvailableAgents(tier);
  
  // Run agents in parallel
  const agentPromises: Promise<AgentAnalysisResult>[] = [];
  
  if (availableAgents.includes("technical")) {
    agentPromises.push(runTechnicalAgent(userId, symbol, marketData));
  }
  if (availableAgents.includes("fundamental")) {
    agentPromises.push(runFundamentalAgent(userId, symbol, insights, holders));
  }
  if (availableAgents.includes("sentiment")) {
    agentPromises.push(runSentimentAgent(userId, symbol, insights));
  }
  if (availableAgents.includes("risk")) {
    agentPromises.push(runRiskAgent(userId, symbol, marketData));
  }
  if (availableAgents.includes("microstructure")) {
    agentPromises.push(runMicrostructureAgent(userId, symbol, marketData));
  }
  if (availableAgents.includes("macro")) {
    agentPromises.push(runMacroAgent(userId, symbol, insights));
  }
  if (availableAgents.includes("quant")) {
    agentPromises.push(runQuantAgent(userId, symbol, marketData));
  }

  const agentResults = await Promise.all(agentPromises);

  // Calculate consensus
  const totalWeight = agentResults.reduce((sum, r) => sum + r.confidence, 0);
  const weightedScore = agentResults.reduce((sum, r) => sum + r.score * r.confidence, 0) / (totalWeight || 1);
  const avgConfidence = totalWeight / agentResults.length;

  // Get user's LLM config for metadata
  const userConfig = await getUserLlmConfig(userId);

  // Generate recommendation
  const consensusSignal = scoreToSignal(weightedScore);
  let recommendation = "";
  let riskAssessment = "";

  switch (consensusSignal) {
    case "strong_buy":
      recommendation = `Strong bullish consensus on ${symbol}. Multiple agents indicate favorable conditions for entry.`;
      break;
    case "buy":
      recommendation = `Moderate bullish signal on ${symbol}. Consider gradual position building.`;
      break;
    case "hold":
      recommendation = `Neutral consensus on ${symbol}. Current conditions suggest maintaining existing positions.`;
      break;
    case "sell":
      recommendation = `Moderate bearish signal on ${symbol}. Consider reducing exposure.`;
      break;
    case "strong_sell":
      recommendation = `Strong bearish consensus on ${symbol}. Risk management suggests defensive positioning.`;
      break;
  }

  const riskAgent = agentResults.find(r => r.agent === "risk");
  if (riskAgent) {
    riskAssessment = riskAgent.reasoning;
  } else {
    riskAssessment = "Risk assessment not available for current subscription tier.";
  }

  return {
    symbol,
    timestamp: new Date(),
    agents: agentResults,
    consensusScore: weightedScore,
    consensusSignal,
    overallConfidence: avgConfidence,
    recommendation,
    riskAssessment,
    llmProvider: userConfig?.provider || "built-in",
    llmModel: userConfig?.model || "default",
  };
}
