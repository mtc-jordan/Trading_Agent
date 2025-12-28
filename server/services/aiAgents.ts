import { invokeLLM } from "../_core/llm";
import { callDataApi } from "../_core/dataApi";

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

// Technical Analysis Agent
async function runTechnicalAgent(symbol: string, marketData: any): Promise<AgentAnalysisResult> {
  const prompt = `You are a Technical Analysis AI Agent. Analyze the following market data for ${symbol} and provide a trading signal.

Market Data Summary:
${JSON.stringify(marketData?.chart?.result?.[0]?.meta || {}, null, 2)}

Recent price action and volume data is available. Consider:
- Price trends (moving averages, support/resistance)
- Volume patterns
- Momentum indicators (RSI, MACD concepts)
- Chart patterns

Respond in JSON format:
{
  "score": <number between -1 and 1>,
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief explanation>",
  "keyFactors": ["<factor1>", "<factor2>", "<factor3>"]
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a technical analysis expert. Always respond with valid JSON." },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "technical_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              score: { type: "number" },
              confidence: { type: "number" },
              reasoning: { type: "string" },
              keyFactors: { type: "array", items: { type: "string" } }
            },
            required: ["score", "confidence", "reasoning", "keyFactors"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0].message.content;
    const result = JSON.parse(typeof content === 'string' ? content : "{}");
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
async function runFundamentalAgent(symbol: string, insights: any, holders: any): Promise<AgentAnalysisResult> {
  const prompt = `You are a Fundamental Analysis AI Agent. Analyze the following data for ${symbol}.

Stock Insights:
${JSON.stringify(insights || {}, null, 2).slice(0, 2000)}

Institutional Holders Summary:
${JSON.stringify(holders?.quoteSummary?.result?.[0]?.institutionOwnership || {}, null, 2).slice(0, 1000)}

Consider:
- Valuation metrics (P/E, P/B, PEG)
- Growth prospects
- Competitive position
- Institutional ownership changes
- Earnings quality

Respond in JSON format:
{
  "score": <number between -1 and 1>,
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief explanation>",
  "keyFactors": ["<factor1>", "<factor2>", "<factor3>"]
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a fundamental analysis expert. Always respond with valid JSON." },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "fundamental_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              score: { type: "number" },
              confidence: { type: "number" },
              reasoning: { type: "string" },
              keyFactors: { type: "array", items: { type: "string" } }
            },
            required: ["score", "confidence", "reasoning", "keyFactors"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0].message.content;
    const result = JSON.parse(typeof content === 'string' ? content : "{}");
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
async function runSentimentAgent(symbol: string, insights: any): Promise<AgentAnalysisResult> {
  const prompt = `You are a Sentiment Analysis AI Agent. Analyze market sentiment for ${symbol}.

Available Insights:
${JSON.stringify(insights || {}, null, 2).slice(0, 2000)}

Consider:
- News sentiment
- Social media trends
- Analyst ratings
- Insider trading activity
- Options market sentiment

Respond in JSON format:
{
  "score": <number between -1 and 1>,
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief explanation>",
  "keyFactors": ["<factor1>", "<factor2>", "<factor3>"]
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a sentiment analysis expert. Always respond with valid JSON." },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "sentiment_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              score: { type: "number" },
              confidence: { type: "number" },
              reasoning: { type: "string" },
              keyFactors: { type: "array", items: { type: "string" } }
            },
            required: ["score", "confidence", "reasoning", "keyFactors"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0].message.content;
    const result = JSON.parse(typeof content === 'string' ? content : "{}");
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
async function runRiskAgent(symbol: string, marketData: any): Promise<AgentAnalysisResult> {
  const prompt = `You are a Risk Management AI Agent. Assess the risk profile for trading ${symbol}.

Market Data:
${JSON.stringify(marketData?.chart?.result?.[0]?.meta || {}, null, 2)}

Consider:
- Volatility levels
- Liquidity risk
- Correlation with market
- Maximum drawdown potential
- Position sizing recommendations

Respond in JSON format:
{
  "score": <number between -1 and 1, where negative means high risk>,
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief explanation>",
  "keyFactors": ["<factor1>", "<factor2>", "<factor3>"]
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a risk management expert. Always respond with valid JSON." },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "risk_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              score: { type: "number" },
              confidence: { type: "number" },
              reasoning: { type: "string" },
              keyFactors: { type: "array", items: { type: "string" } }
            },
            required: ["score", "confidence", "reasoning", "keyFactors"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0].message.content;
    const result = JSON.parse(typeof content === 'string' ? content : "{}");
    return {
      agent: "risk",
      score: Math.max(-1, Math.min(1, result.score || 0)),
      signal: scoreToSignal(result.score || 0),
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      reasoning: result.reasoning || "Risk analysis completed",
      keyFactors: result.keyFactors || []
    };
  } catch (error) {
    console.error("Risk agent error:", error);
    return {
      agent: "risk",
      score: 0,
      signal: "hold",
      confidence: 0.3,
      reasoning: "Unable to complete risk analysis",
      keyFactors: []
    };
  }
}

// Market Microstructure Agent
async function runMicrostructureAgent(symbol: string, marketData: any): Promise<AgentAnalysisResult> {
  const prompt = `You are a Market Microstructure AI Agent. Analyze order flow and market structure for ${symbol}.

Market Data:
${JSON.stringify(marketData?.chart?.result?.[0]?.meta || {}, null, 2)}

Consider:
- Bid-ask spread patterns
- Volume profile
- Order flow imbalances
- Market maker activity
- Execution quality factors

Respond in JSON format:
{
  "score": <number between -1 and 1>,
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief explanation>",
  "keyFactors": ["<factor1>", "<factor2>", "<factor3>"]
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a market microstructure expert. Always respond with valid JSON." },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "microstructure_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              score: { type: "number" },
              confidence: { type: "number" },
              reasoning: { type: "string" },
              keyFactors: { type: "array", items: { type: "string" } }
            },
            required: ["score", "confidence", "reasoning", "keyFactors"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0].message.content;
    const result = JSON.parse(typeof content === 'string' ? content : "{}");
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
async function runMacroAgent(symbol: string): Promise<AgentAnalysisResult> {
  const prompt = `You are a Macroeconomic Analysis AI Agent. Analyze the macroeconomic environment for trading ${symbol}.

Consider current macroeconomic factors:
- Interest rate environment
- Inflation trends
- GDP growth expectations
- Currency movements
- Sector rotation patterns
- Global economic conditions

Respond in JSON format:
{
  "score": <number between -1 and 1>,
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief explanation>",
  "keyFactors": ["<factor1>", "<factor2>", "<factor3>"]
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a macroeconomic analysis expert. Always respond with valid JSON." },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "macro_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              score: { type: "number" },
              confidence: { type: "number" },
              reasoning: { type: "string" },
              keyFactors: { type: "array", items: { type: "string" } }
            },
            required: ["score", "confidence", "reasoning", "keyFactors"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0].message.content;
    const result = JSON.parse(typeof content === 'string' ? content : "{}");
    return {
      agent: "macro",
      score: Math.max(-1, Math.min(1, result.score || 0)),
      signal: scoreToSignal(result.score || 0),
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      reasoning: result.reasoning || "Macroeconomic analysis completed",
      keyFactors: result.keyFactors || []
    };
  } catch (error) {
    console.error("Macro agent error:", error);
    return {
      agent: "macro",
      score: 0,
      signal: "hold",
      confidence: 0.3,
      reasoning: "Unable to complete macroeconomic analysis",
      keyFactors: []
    };
  }
}

// Quantitative Agent
async function runQuantAgent(symbol: string, marketData: any): Promise<AgentAnalysisResult> {
  const prompt = `You are a Quantitative Analysis AI Agent. Apply quantitative models to analyze ${symbol}.

Market Data:
${JSON.stringify(marketData?.chart?.result?.[0]?.meta || {}, null, 2)}

Apply quantitative methods:
- Statistical arbitrage signals
- Mean reversion indicators
- Momentum factors
- Volatility modeling
- Machine learning pattern recognition

Respond in JSON format:
{
  "score": <number between -1 and 1>,
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief explanation>",
  "keyFactors": ["<factor1>", "<factor2>", "<factor3>"]
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a quantitative analysis expert. Always respond with valid JSON." },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "quant_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              score: { type: "number" },
              confidence: { type: "number" },
              reasoning: { type: "string" },
              keyFactors: { type: "array", items: { type: "string" } }
            },
            required: ["score", "confidence", "reasoning", "keyFactors"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0].message.content;
    const result = JSON.parse(typeof content === 'string' ? content : "{}");
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

// Run all agents and compute consensus
export async function runAgentConsensus(
  symbol: string, 
  enabledAgents: AgentType[] = ["technical", "fundamental", "sentiment", "risk", "microstructure", "macro", "quant"]
): Promise<ConsensusResult> {
  // Fetch all required data
  const [marketData, insights, holders] = await Promise.all([
    getMarketData(symbol),
    getStockInsights(symbol),
    getStockHolders(symbol)
  ]);

  // Run enabled agents in parallel
  const agentPromises: Promise<AgentAnalysisResult>[] = [];
  
  if (enabledAgents.includes("technical")) {
    agentPromises.push(runTechnicalAgent(symbol, marketData));
  }
  if (enabledAgents.includes("fundamental")) {
    agentPromises.push(runFundamentalAgent(symbol, insights, holders));
  }
  if (enabledAgents.includes("sentiment")) {
    agentPromises.push(runSentimentAgent(symbol, insights));
  }
  if (enabledAgents.includes("risk")) {
    agentPromises.push(runRiskAgent(symbol, marketData));
  }
  if (enabledAgents.includes("microstructure")) {
    agentPromises.push(runMicrostructureAgent(symbol, marketData));
  }
  if (enabledAgents.includes("macro")) {
    agentPromises.push(runMacroAgent(symbol));
  }
  if (enabledAgents.includes("quant")) {
    agentPromises.push(runQuantAgent(symbol, marketData));
  }

  const agentResults = await Promise.all(agentPromises);

  // Calculate weighted consensus
  let totalWeight = 0;
  let weightedScore = 0;
  let totalConfidence = 0;

  // Agent weights (can be customized)
  const agentWeights: Record<AgentType, number> = {
    technical: 1.0,
    fundamental: 1.0,
    sentiment: 0.8,
    risk: 1.2, // Risk has higher weight
    microstructure: 0.7,
    macro: 0.8,
    quant: 1.0
  };

  for (const result of agentResults) {
    const weight = agentWeights[result.agent] * result.confidence;
    weightedScore += result.score * weight;
    totalWeight += weight;
    totalConfidence += result.confidence;
  }

  const consensusScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
  const overallConfidence = agentResults.length > 0 ? totalConfidence / agentResults.length : 0;

  // Generate recommendation
  const consensusSignal = scoreToSignal(consensusScore);
  let recommendation = "";
  let riskAssessment = "";

  const riskAgent = agentResults.find(a => a.agent === "risk");
  if (riskAgent) {
    riskAssessment = riskAgent.reasoning;
  }

  switch (consensusSignal) {
    case "strong_buy":
      recommendation = `Strong bullish consensus for ${symbol}. ${agentResults.length} agents agree on positive outlook with ${(overallConfidence * 100).toFixed(0)}% average confidence.`;
      break;
    case "buy":
      recommendation = `Moderate bullish signal for ${symbol}. Consider entering a position with appropriate risk management.`;
      break;
    case "hold":
      recommendation = `Neutral signal for ${symbol}. Wait for clearer direction before taking action.`;
      break;
    case "sell":
      recommendation = `Moderate bearish signal for ${symbol}. Consider reducing exposure or taking profits.`;
      break;
    case "strong_sell":
      recommendation = `Strong bearish consensus for ${symbol}. Consider exiting positions or implementing hedges.`;
      break;
  }

  return {
    symbol,
    timestamp: new Date(),
    agents: agentResults,
    consensusScore,
    consensusSignal,
    overallConfidence,
    recommendation,
    riskAssessment
  };
}

// Get available agents based on subscription tier
export function getAvailableAgents(tier: string): AgentType[] {
  switch (tier) {
    case "free":
      return ["technical", "sentiment"];
    case "starter":
      return ["technical", "fundamental", "sentiment", "risk"];
    case "pro":
    case "elite":
      return ["technical", "fundamental", "sentiment", "risk", "microstructure", "macro", "quant"];
    default:
      return ["technical", "sentiment"];
  }
}
