"""
TradoVerse AI Analysis API Routes

Provides endpoints for the 7-agent AI consensus system.
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..core.database import get_db
from ..core.security import get_current_user
from ..core.config import get_tier_features
from ..models.models import AgentAnalysis, User
from ..schemas.schemas import (
    AgentType, AgentAnalysisRequest, AgentAnalysisResult,
    ConsensusRequest, ConsensusResponse
)
from ..services.ai_agents import analyze_symbol, get_single_agent_analysis
from ..services.market_data import get_quote, get_chart, get_insights

router = APIRouter()


@router.post("/consensus", response_model=ConsensusResponse)
async def get_consensus_analysis(
    request: ConsensusRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get multi-agent consensus analysis for a symbol.
    
    This endpoint runs all enabled AI agents in parallel and
    produces a consensus recommendation based on their votes.
    """
    # Check tier limits for AI agents
    tier = current_user.get("subscription_tier", "free")
    features = get_tier_features(tier)
    max_agents = features.get("ai_agents", 2)
    
    # Determine which agents to use
    if request.agents:
        enabled_agents = request.agents[:max_agents]
    else:
        # Default agents based on tier
        all_agents = list(AgentType)
        enabled_agents = all_agents[:max_agents]
    
    if len(enabled_agents) < len(request.agents or []):
        # User requested more agents than allowed
        pass  # We'll just use what's allowed
    
    # Fetch market data for analysis
    quote = await get_quote(request.symbol)
    chart = await get_chart(request.symbol, "1d", "1mo")
    insights = await get_insights(request.symbol)
    
    market_data = {
        "symbol": request.symbol,
        "quote": quote.model_dump() if quote else {},
        "chart": chart.model_dump() if chart else {},
        "insights": insights
    }
    
    # Run consensus analysis
    consensus = await analyze_symbol(request.symbol, market_data, enabled_agents)
    
    # Save to database
    analysis_record = AgentAnalysis(
        user_id=current_user["id"],
        symbol=request.symbol,
        agent_type="consensus",
        recommendation=consensus.final_recommendation.value,
        confidence=consensus.consensus_confidence,
        reasoning=consensus.reasoning_summary,
        data_points={
            "vote_breakdown": consensus.vote_breakdown,
            "agent_count": len(consensus.agent_analyses)
        }
    )
    db.add(analysis_record)
    await db.commit()
    await db.refresh(analysis_record)
    
    # Update consensus ID
    consensus.id = analysis_record.id
    
    return consensus


@router.post("/single", response_model=AgentAnalysisResult)
async def get_single_analysis(
    request: AgentAnalysisRequest,
    agent_type: AgentType = Query(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get analysis from a single AI agent.
    
    Useful for getting detailed analysis from a specific agent type.
    """
    # Check tier limits
    tier = current_user.get("subscription_tier", "free")
    features = get_tier_features(tier)
    max_agents = features.get("ai_agents", 2)
    
    # Check if agent type is allowed
    allowed_agents = list(AgentType)[:max_agents]
    if agent_type not in allowed_agents:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Agent type {agent_type.value} is not available on your plan. Please upgrade."
        )
    
    # Fetch market data
    quote = await get_quote(request.symbol)
    chart = await get_chart(request.symbol, "1d", "1mo")
    insights = await get_insights(request.symbol)
    
    market_data = {
        "symbol": request.symbol,
        "quote": quote.model_dump() if quote else {},
        "chart": chart.model_dump() if chart else {},
        "insights": insights
    }
    
    # Run single agent analysis
    result = await get_single_agent_analysis(agent_type, request.symbol, market_data)
    
    # Save to database
    analysis_record = AgentAnalysis(
        user_id=current_user["id"],
        symbol=request.symbol,
        agent_type=agent_type.value,
        recommendation=result.recommendation.value,
        confidence=result.confidence,
        reasoning=result.reasoning,
        data_points=result.data_points
    )
    db.add(analysis_record)
    await db.commit()
    
    return result


@router.get("/history")
async def get_analysis_history(
    symbol: Optional[str] = Query(None),
    agent_type: Optional[str] = Query(None),
    limit: int = Query(20, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get historical analyses for the current user."""
    query = select(AgentAnalysis).where(
        AgentAnalysis.user_id == current_user["id"]
    )
    
    if symbol:
        query = query.where(AgentAnalysis.symbol == symbol)
    if agent_type:
        query = query.where(AgentAnalysis.agent_type == agent_type)
    
    query = query.order_by(AgentAnalysis.created_at.desc()).limit(limit)
    
    result = await db.execute(query)
    analyses = result.scalars().all()
    
    return [
        {
            "id": a.id,
            "symbol": a.symbol,
            "agent_type": a.agent_type,
            "recommendation": a.recommendation,
            "confidence": a.confidence,
            "reasoning": a.reasoning,
            "created_at": a.created_at
        }
        for a in analyses
    ]


@router.get("/agents")
async def get_available_agents(
    current_user: dict = Depends(get_current_user)
):
    """Get list of available AI agents based on subscription tier."""
    tier = current_user.get("subscription_tier", "free")
    features = get_tier_features(tier)
    max_agents = features.get("ai_agents", 2)
    
    all_agents = [
        {
            "type": AgentType.TECHNICAL.value,
            "name": "Technical Analysis Agent",
            "description": "Analyzes price charts, patterns, and technical indicators"
        },
        {
            "type": AgentType.FUNDAMENTAL.value,
            "name": "Fundamental Analysis Agent",
            "description": "Analyzes company financials, valuations, and business fundamentals"
        },
        {
            "type": AgentType.SENTIMENT.value,
            "name": "Sentiment Analysis Agent",
            "description": "Analyzes market sentiment from news and social media"
        },
        {
            "type": AgentType.RISK.value,
            "name": "Risk Management Agent",
            "description": "Assesses and manages trading risks with veto power"
        },
        {
            "type": AgentType.MICROSTRUCTURE.value,
            "name": "Market Microstructure Agent",
            "description": "Analyzes order flow, liquidity, and market mechanics"
        },
        {
            "type": AgentType.MACRO.value,
            "name": "Macroeconomic Agent",
            "description": "Analyzes macroeconomic factors affecting markets"
        },
        {
            "type": AgentType.QUANT.value,
            "name": "Quantitative Agent",
            "description": "Applies statistical and mathematical models"
        }
    ]
    
    return {
        "available_agents": all_agents[:max_agents],
        "locked_agents": all_agents[max_agents:],
        "max_agents": max_agents,
        "tier": tier
    }
