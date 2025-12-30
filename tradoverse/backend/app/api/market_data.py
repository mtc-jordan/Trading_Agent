"""
TradoVerse Market Data API Routes
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query

from ..core.security import get_current_user
from ..schemas.schemas import StockQuote, StockChart
from ..services.market_data import (
    get_quote, get_chart, get_insights, get_holders,
    market_data_service
)

router = APIRouter()


@router.get("/quote/{symbol}", response_model=StockQuote)
async def get_stock_quote(
    symbol: str,
    current_user: dict = Depends(get_current_user)
):
    """Get current stock quote."""
    quote = await get_quote(symbol.upper())
    if not quote:
        return StockQuote(
            symbol=symbol.upper(),
            price=0,
            change=0,
            change_percent=0,
            volume=0
        )
    return quote


@router.get("/chart/{symbol}", response_model=StockChart)
async def get_stock_chart(
    symbol: str,
    interval: str = Query("1d", enum=["1m", "5m", "15m", "30m", "1h", "1d", "1wk", "1mo"]),
    range_str: str = Query("1mo", enum=["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "max"]),
    current_user: dict = Depends(get_current_user)
):
    """Get stock chart data."""
    chart = await get_chart(symbol.upper(), interval, range_str)
    if not chart:
        return StockChart(
            symbol=symbol.upper(),
            timestamps=[],
            open=[],
            high=[],
            low=[],
            close=[],
            volume=[]
        )
    return chart


@router.get("/insights/{symbol}")
async def get_stock_insights(
    symbol: str,
    current_user: dict = Depends(get_current_user)
):
    """Get stock insights and analyst recommendations."""
    return await get_insights(symbol.upper())


@router.get("/holders/{symbol}")
async def get_stock_holders(
    symbol: str,
    current_user: dict = Depends(get_current_user)
):
    """Get stock holders information."""
    return await get_holders(symbol.upper())


@router.get("/quotes")
async def get_multiple_quotes(
    symbols: str = Query(..., description="Comma-separated list of symbols"),
    current_user: dict = Depends(get_current_user)
):
    """Get quotes for multiple symbols."""
    symbol_list = [s.strip().upper() for s in symbols.split(",")]
    quotes = await market_data_service.get_multiple_quotes(symbol_list)
    return {"quotes": quotes}


@router.get("/search")
async def search_symbols(
    query: str = Query(..., min_length=1),
    current_user: dict = Depends(get_current_user)
):
    """Search for stock symbols."""
    # This would typically call a search API
    # For now, return common symbols that match
    common_symbols = [
        {"symbol": "AAPL", "name": "Apple Inc."},
        {"symbol": "GOOGL", "name": "Alphabet Inc."},
        {"symbol": "MSFT", "name": "Microsoft Corporation"},
        {"symbol": "AMZN", "name": "Amazon.com Inc."},
        {"symbol": "META", "name": "Meta Platforms Inc."},
        {"symbol": "TSLA", "name": "Tesla Inc."},
        {"symbol": "NVDA", "name": "NVIDIA Corporation"},
        {"symbol": "JPM", "name": "JPMorgan Chase & Co."},
        {"symbol": "V", "name": "Visa Inc."},
        {"symbol": "JNJ", "name": "Johnson & Johnson"},
        {"symbol": "WMT", "name": "Walmart Inc."},
        {"symbol": "PG", "name": "Procter & Gamble Co."},
        {"symbol": "MA", "name": "Mastercard Inc."},
        {"symbol": "UNH", "name": "UnitedHealth Group Inc."},
        {"symbol": "HD", "name": "Home Depot Inc."},
    ]
    
    query_upper = query.upper()
    matches = [
        s for s in common_symbols
        if query_upper in s["symbol"] or query_upper in s["name"].upper()
    ]
    
    return {"results": matches[:10]}


@router.get("/trending")
async def get_trending_symbols(
    current_user: dict = Depends(get_current_user)
):
    """Get trending/popular symbols."""
    trending = [
        "AAPL", "TSLA", "NVDA", "MSFT", "GOOGL",
        "AMZN", "META", "AMD", "SPY", "QQQ"
    ]
    
    quotes = await market_data_service.get_multiple_quotes(trending)
    return {"trending": quotes}


@router.get("/market-status")
async def get_market_status(
    current_user: dict = Depends(get_current_user)
):
    """Get current market status."""
    from datetime import datetime
    import pytz
    
    # Get current time in US Eastern
    eastern = pytz.timezone('US/Eastern')
    now = datetime.now(eastern)
    
    # Market hours: 9:30 AM - 4:00 PM ET, Monday-Friday
    is_weekday = now.weekday() < 5
    market_open = now.replace(hour=9, minute=30, second=0, microsecond=0)
    market_close = now.replace(hour=16, minute=0, second=0, microsecond=0)
    
    is_open = is_weekday and market_open <= now <= market_close
    
    return {
        "is_open": is_open,
        "current_time": now.isoformat(),
        "market_open": "09:30 ET",
        "market_close": "16:00 ET",
        "next_open": market_open.isoformat() if not is_open else None
    }
