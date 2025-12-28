"""
TradoVerse 7-Agent AI Consensus System

This module implements the multi-agent AI system for market analysis:
1. Technical Analysis Agent - Chart patterns, indicators, support/resistance
2. Fundamental Analysis Agent - Financial statements, valuations, earnings
3. Sentiment Analysis Agent - News, social media, market sentiment
4. Risk Management Agent - Position sizing, stop-loss, portfolio risk
5. Market Microstructure Agent - Order flow, liquidity, market depth
6. Macroeconomic Agent - Economic indicators, central bank policies
7. Quantitative Agent - Statistical models, factor analysis
"""
import json
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum
import httpx

from ..core.config import get_settings
from ..schemas.schemas import (
    AgentType, Recommendation, AgentAnalysisResult, ConsensusResponse
)

settings = get_settings()


class AIAgent:
    """Base class for AI agents."""
    
    def __init__(self, agent_type: AgentType):
        self.agent_type = agent_type
        self.name = self._get_agent_name()
        self.system_prompt = self._get_system_prompt()
    
    def _get_agent_name(self) -> str:
        """Get human-readable agent name."""
        names = {
            AgentType.TECHNICAL: "Technical Analysis Agent",
            AgentType.FUNDAMENTAL: "Fundamental Analysis Agent",
            AgentType.SENTIMENT: "Sentiment Analysis Agent",
            AgentType.RISK: "Risk Management Agent",
            AgentType.MICROSTRUCTURE: "Market Microstructure Agent",
            AgentType.MACRO: "Macroeconomic Agent",
            AgentType.QUANT: "Quantitative Agent",
        }
        return names.get(self.agent_type, "Unknown Agent")
    
    def _get_system_prompt(self) -> str:
        """Get the system prompt for this agent type."""
        prompts = {
            AgentType.TECHNICAL: """You are an expert Technical Analysis Agent for TradoVerse.
Your role is to analyze price charts, patterns, and technical indicators to provide trading recommendations.

Focus on:
- Price trends and momentum (moving averages, MACD, RSI)
- Chart patterns (head and shoulders, triangles, flags)
- Support and resistance levels
- Volume analysis
- Fibonacci retracements

Provide your analysis in a structured format with clear reasoning.""",

            AgentType.FUNDAMENTAL: """You are an expert Fundamental Analysis Agent for TradoVerse.
Your role is to analyze company financials, valuations, and business fundamentals.

Focus on:
- Revenue growth and profitability
- P/E ratio, P/B ratio, PEG ratio
- Debt levels and cash flow
- Competitive advantages (moat)
- Management quality and insider activity

Provide your analysis in a structured format with clear reasoning.""",

            AgentType.SENTIMENT: """You are an expert Sentiment Analysis Agent for TradoVerse.
Your role is to analyze market sentiment from news, social media, and investor behavior.

Focus on:
- News sentiment and headlines
- Social media trends and discussions
- Analyst ratings and price targets
- Institutional investor activity
- Fear and greed indicators

Provide your analysis in a structured format with clear reasoning.""",

            AgentType.RISK: """You are an expert Risk Management Agent for TradoVerse.
Your role is to assess and manage trading risks.

Focus on:
- Position sizing recommendations
- Stop-loss and take-profit levels
- Portfolio diversification
- Volatility assessment (VIX, historical volatility)
- Risk/reward ratios
- Maximum drawdown analysis

You have VETO POWER if risk is too high. Provide your analysis in a structured format.""",

            AgentType.MICROSTRUCTURE: """You are an expert Market Microstructure Agent for TradoVerse.
Your role is to analyze order flow, liquidity, and market mechanics.

Focus on:
- Bid-ask spreads
- Order book depth
- Trading volume patterns
- Dark pool activity
- Market maker behavior
- Price impact analysis

Provide your analysis in a structured format with clear reasoning.""",

            AgentType.MACRO: """You are an expert Macroeconomic Agent for TradoVerse.
Your role is to analyze macroeconomic factors affecting markets.

Focus on:
- Interest rates and Fed policy
- Inflation trends (CPI, PPI)
- GDP growth and employment
- Global economic conditions
- Sector rotation patterns
- Currency movements

Provide your analysis in a structured format with clear reasoning.""",

            AgentType.QUANT: """You are an expert Quantitative Agent for TradoVerse.
Your role is to apply statistical and mathematical models to trading.

Focus on:
- Statistical arbitrage opportunities
- Factor analysis (momentum, value, quality)
- Mean reversion signals
- Correlation analysis
- Monte Carlo simulations
- Machine learning predictions

Provide your analysis in a structured format with clear reasoning.""",
        }
        return prompts.get(self.agent_type, "You are a trading analysis agent.")
    
    async def analyze(
        self, 
        symbol: str, 
        market_data: Dict[str, Any]
    ) -> AgentAnalysisResult:
        """Analyze a symbol and return recommendation."""
        
        # Build the analysis prompt
        user_prompt = f"""Analyze {symbol} and provide your trading recommendation.

Market Data:
{json.dumps(market_data, indent=2)}

Respond in the following JSON format:
{{
    "recommendation": "buy" | "sell" | "hold",
    "confidence": 0.0 to 1.0,
    "reasoning": "Your detailed analysis and reasoning",
    "key_factors": ["factor1", "factor2", ...],
    "data_points": {{
        "metric1": value1,
        "metric2": value2
    }}
}}"""

        try:
            # Call LLM API
            response = await self._call_llm(user_prompt)
            
            # Parse response
            result = self._parse_response(response)
            
            return AgentAnalysisResult(
                agent_type=self.agent_type,
                recommendation=result.get("recommendation", Recommendation.HOLD),
                confidence=result.get("confidence", 0.5),
                reasoning=result.get("reasoning", "Analysis completed."),
                data_points=result.get("data_points", {})
            )
        except Exception as e:
            # Return neutral recommendation on error
            return AgentAnalysisResult(
                agent_type=self.agent_type,
                recommendation=Recommendation.HOLD,
                confidence=0.3,
                reasoning=f"Analysis error: {str(e)}",
                data_points={}
            )
    
    async def _call_llm(self, prompt: str) -> str:
        """Call the LLM API."""
        async with httpx.AsyncClient() as client:
            # Use built-in Forge API if available, otherwise use OpenAI-compatible API
            if settings.FORGE_API_URL and settings.FORGE_API_KEY:
                response = await client.post(
                    f"{settings.FORGE_API_URL}/llm/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.FORGE_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "messages": [
                            {"role": "system", "content": self.system_prompt},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.7,
                        "max_tokens": 1000
                    },
                    timeout=30.0
                )
            else:
                # Fallback to OpenAI-compatible API
                api_url = settings.LLM_BASE_URL or "https://api.openai.com/v1"
                api_key = settings.OPENAI_API_KEY or settings.DEEPSEEK_API_KEY
                
                response = await client.post(
                    f"{api_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": settings.LLM_MODEL,
                        "messages": [
                            {"role": "system", "content": self.system_prompt},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.7,
                        "max_tokens": 1000
                    },
                    timeout=30.0
                )
            
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
    
    def _parse_response(self, response: str) -> Dict[str, Any]:
        """Parse LLM response into structured data."""
        try:
            # Try to extract JSON from response
            import re
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                result = json.loads(json_match.group())
                
                # Normalize recommendation
                rec = result.get("recommendation", "hold").lower()
                if rec in ["buy", "strong_buy", "bullish"]:
                    result["recommendation"] = Recommendation.BUY
                elif rec in ["sell", "strong_sell", "bearish"]:
                    result["recommendation"] = Recommendation.SELL
                else:
                    result["recommendation"] = Recommendation.HOLD
                
                # Ensure confidence is in range
                conf = float(result.get("confidence", 0.5))
                result["confidence"] = max(0.0, min(1.0, conf))
                
                return result
        except (json.JSONDecodeError, ValueError):
            pass
        
        # Fallback parsing
        response_lower = response.lower()
        if "buy" in response_lower and "sell" not in response_lower:
            return {"recommendation": Recommendation.BUY, "confidence": 0.6, "reasoning": response}
        elif "sell" in response_lower and "buy" not in response_lower:
            return {"recommendation": Recommendation.SELL, "confidence": 0.6, "reasoning": response}
        else:
            return {"recommendation": Recommendation.HOLD, "confidence": 0.5, "reasoning": response}


class ConsensusEngine:
    """
    Multi-agent consensus engine that coordinates all 7 agents
    and produces a final trading recommendation.
    """
    
    def __init__(self):
        self.agents: Dict[AgentType, AIAgent] = {
            agent_type: AIAgent(agent_type) for agent_type in AgentType
        }
    
    async def get_consensus(
        self,
        symbol: str,
        market_data: Dict[str, Any],
        enabled_agents: List[AgentType] = None
    ) -> ConsensusResponse:
        """
        Run all enabled agents and compute consensus recommendation.
        
        Args:
            symbol: Stock symbol to analyze
            market_data: Market data for analysis
            enabled_agents: List of agents to use (defaults to all)
        
        Returns:
            ConsensusResponse with final recommendation and agent analyses
        """
        if enabled_agents is None:
            enabled_agents = list(AgentType)
        
        # Run all agents in parallel
        tasks = [
            self.agents[agent_type].analyze(symbol, market_data)
            for agent_type in enabled_agents
            if agent_type in self.agents
        ]
        
        analyses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out exceptions
        valid_analyses: List[AgentAnalysisResult] = [
            a for a in analyses if isinstance(a, AgentAnalysisResult)
        ]
        
        # Calculate vote breakdown
        vote_breakdown = {"buy": 0, "sell": 0, "hold": 0}
        weighted_scores = {"buy": 0.0, "sell": 0.0, "hold": 0.0}
        
        for analysis in valid_analyses:
            rec = analysis.recommendation.value
            vote_breakdown[rec] += 1
            weighted_scores[rec] += analysis.confidence
        
        # Check for Risk Agent veto
        risk_analysis = next(
            (a for a in valid_analyses if a.agent_type == AgentType.RISK),
            None
        )
        risk_veto = False
        if risk_analysis and risk_analysis.confidence < 0.3:
            risk_veto = True
        
        # Determine final recommendation
        if risk_veto:
            final_recommendation = Recommendation.HOLD
            reasoning = "Risk Management Agent has vetoed the trade due to high risk."
        else:
            # Use weighted voting
            max_score = max(weighted_scores.values())
            final_recommendation = Recommendation(
                max(weighted_scores, key=weighted_scores.get)
            )
            reasoning = self._generate_reasoning_summary(valid_analyses, vote_breakdown)
        
        # Calculate consensus confidence
        total_votes = sum(vote_breakdown.values())
        if total_votes > 0:
            winning_votes = vote_breakdown[final_recommendation.value]
            consensus_confidence = (winning_votes / total_votes) * (
                weighted_scores[final_recommendation.value] / winning_votes
                if winning_votes > 0 else 0.5
            )
        else:
            consensus_confidence = 0.5
        
        return ConsensusResponse(
            id=0,  # Will be set when saved to DB
            symbol=symbol,
            final_recommendation=final_recommendation,
            consensus_confidence=round(consensus_confidence, 2),
            vote_breakdown=vote_breakdown,
            agent_analyses=valid_analyses,
            reasoning_summary=reasoning,
            created_at=datetime.utcnow()
        )
    
    def _generate_reasoning_summary(
        self,
        analyses: List[AgentAnalysisResult],
        vote_breakdown: Dict[str, int]
    ) -> str:
        """Generate a summary of the consensus reasoning."""
        total = sum(vote_breakdown.values())
        
        summary_parts = [
            f"Consensus reached with {total} agents participating.",
            f"Vote breakdown: {vote_breakdown['buy']} buy, {vote_breakdown['sell']} sell, {vote_breakdown['hold']} hold.",
            "",
            "Key insights from agents:"
        ]
        
        for analysis in analyses:
            summary_parts.append(
                f"- {analysis.agent_type.value.title()}: {analysis.recommendation.value.upper()} "
                f"(confidence: {analysis.confidence:.0%})"
            )
        
        return "\n".join(summary_parts)


# Global consensus engine instance
consensus_engine = ConsensusEngine()


async def analyze_symbol(
    symbol: str,
    market_data: Dict[str, Any],
    enabled_agents: List[AgentType] = None
) -> ConsensusResponse:
    """
    Analyze a symbol using the multi-agent consensus system.
    
    Args:
        symbol: Stock symbol to analyze
        market_data: Market data for analysis
        enabled_agents: List of agents to use
    
    Returns:
        ConsensusResponse with recommendation
    """
    return await consensus_engine.get_consensus(symbol, market_data, enabled_agents)


async def get_single_agent_analysis(
    agent_type: AgentType,
    symbol: str,
    market_data: Dict[str, Any]
) -> AgentAnalysisResult:
    """
    Get analysis from a single agent.
    
    Args:
        agent_type: Type of agent to use
        symbol: Stock symbol to analyze
        market_data: Market data for analysis
    
    Returns:
        AgentAnalysisResult with recommendation
    """
    agent = consensus_engine.agents.get(agent_type)
    if not agent:
        raise ValueError(f"Unknown agent type: {agent_type}")
    
    return await agent.analyze(symbol, market_data)
