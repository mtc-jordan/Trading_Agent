"""
TradoVerse Portfolio API Routes
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ..core.database import get_db
from ..core.security import get_current_user
from ..models.models import TradingAccount, Trade, PortfolioSnapshot
from ..schemas.schemas import PortfolioSummary, PortfolioAnalytics, PortfolioPosition
from ..services.market_data import get_quote

router = APIRouter()


@router.get("/summary/{account_id}", response_model=PortfolioSummary)
async def get_portfolio_summary(
    account_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get portfolio summary for an account."""
    # Verify account ownership
    result = await db.execute(
        select(TradingAccount).where(
            TradingAccount.id == account_id,
            TradingAccount.user_id == current_user["id"]
        )
    )
    account = result.scalar_one_or_none()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Get open positions from trades
    trades_result = await db.execute(
        select(Trade).where(
            Trade.account_id == account_id,
            Trade.status == "filled"
        ).order_by(Trade.executed_at.desc())
    )
    trades = trades_result.scalars().all()
    
    # Calculate positions
    positions_map = {}
    for trade in trades:
        if trade.symbol not in positions_map:
            positions_map[trade.symbol] = {"quantity": 0, "total_cost": 0}
        
        if trade.side == "buy":
            positions_map[trade.symbol]["quantity"] += trade.quantity
            positions_map[trade.symbol]["total_cost"] += trade.total_value
        else:
            positions_map[trade.symbol]["quantity"] -= trade.quantity
            positions_map[trade.symbol]["total_cost"] -= trade.total_value
    
    # Get current prices and build positions
    positions = []
    positions_value = 0
    total_unrealized_pnl = 0
    
    for symbol, data in positions_map.items():
        if data["quantity"] > 0:
            quote = await get_quote(symbol)
            current_price = quote.price if quote else 0
            
            avg_cost = data["total_cost"] / data["quantity"] if data["quantity"] > 0 else 0
            market_value = data["quantity"] * current_price
            unrealized_pnl = market_value - data["total_cost"]
            unrealized_pnl_percent = (unrealized_pnl / data["total_cost"] * 100) if data["total_cost"] > 0 else 0
            
            positions.append(PortfolioPosition(
                symbol=symbol,
                quantity=data["quantity"],
                avg_cost=round(avg_cost, 2),
                current_price=round(current_price, 2),
                market_value=round(market_value, 2),
                unrealized_pnl=round(unrealized_pnl, 2),
                unrealized_pnl_percent=round(unrealized_pnl_percent, 2)
            ))
            
            positions_value += market_value
            total_unrealized_pnl += unrealized_pnl
    
    total_value = account.balance + positions_value
    total_pnl = total_value - account.initial_balance
    total_pnl_percent = (total_pnl / account.initial_balance * 100) if account.initial_balance > 0 else 0
    
    return PortfolioSummary(
        total_value=round(total_value, 2),
        cash_balance=round(account.balance, 2),
        positions_value=round(positions_value, 2),
        total_pnl=round(total_pnl, 2),
        total_pnl_percent=round(total_pnl_percent, 2),
        daily_pnl=0,  # Would need historical data
        positions=positions
    )


@router.get("/analytics/{account_id}", response_model=PortfolioAnalytics)
async def get_portfolio_analytics(
    account_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get portfolio analytics for an account."""
    # Verify account ownership
    result = await db.execute(
        select(TradingAccount).where(
            TradingAccount.id == account_id,
            TradingAccount.user_id == current_user["id"]
        )
    )
    account = result.scalar_one_or_none()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Get completed trades
    trades_result = await db.execute(
        select(Trade).where(
            Trade.account_id == account_id,
            Trade.status == "filled",
            Trade.pnl.isnot(None)
        )
    )
    trades = trades_result.scalars().all()
    
    if not trades:
        return PortfolioAnalytics(
            sharpe_ratio=0,
            sortino_ratio=0,
            max_drawdown=0,
            win_rate=0,
            profit_factor=0,
            avg_trade_duration=0,
            total_trades=0,
            best_trade=0,
            worst_trade=0,
            avg_win=0,
            avg_loss=0
        )
    
    # Calculate metrics
    pnls = [t.pnl for t in trades if t.pnl is not None]
    wins = [p for p in pnls if p > 0]
    losses = [abs(p) for p in pnls if p < 0]
    
    total_trades = len(pnls)
    winning_trades = len(wins)
    win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0
    
    avg_win = sum(wins) / len(wins) if wins else 0
    avg_loss = sum(losses) / len(losses) if losses else 0
    
    profit_factor = sum(wins) / sum(losses) if losses and sum(losses) > 0 else 0
    
    best_trade = max(pnls) if pnls else 0
    worst_trade = min(pnls) if pnls else 0
    
    # Simplified Sharpe ratio calculation
    import numpy as np
    if len(pnls) > 1:
        returns = np.array(pnls) / account.initial_balance
        sharpe_ratio = (np.mean(returns) / np.std(returns) * np.sqrt(252)) if np.std(returns) > 0 else 0
        
        # Sortino ratio (only downside deviation)
        negative_returns = returns[returns < 0]
        downside_std = np.std(negative_returns) if len(negative_returns) > 0 else 0
        sortino_ratio = (np.mean(returns) / downside_std * np.sqrt(252)) if downside_std > 0 else 0
    else:
        sharpe_ratio = 0
        sortino_ratio = 0
    
    # Max drawdown (simplified)
    max_drawdown = abs(worst_trade / account.initial_balance * 100) if account.initial_balance > 0 else 0
    
    return PortfolioAnalytics(
        sharpe_ratio=round(sharpe_ratio, 2),
        sortino_ratio=round(sortino_ratio, 2),
        max_drawdown=round(max_drawdown, 2),
        win_rate=round(win_rate, 2),
        profit_factor=round(profit_factor, 2),
        avg_trade_duration=0,  # Would need entry/exit times
        total_trades=total_trades,
        best_trade=round(best_trade, 2),
        worst_trade=round(worst_trade, 2),
        avg_win=round(avg_win, 2),
        avg_loss=round(avg_loss, 2)
    )


@router.get("/history/{account_id}")
async def get_portfolio_history(
    account_id: int,
    days: int = Query(30, le=365),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get portfolio value history."""
    # Verify account ownership
    result = await db.execute(
        select(TradingAccount).where(
            TradingAccount.id == account_id,
            TradingAccount.user_id == current_user["id"]
        )
    )
    account = result.scalar_one_or_none()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Get snapshots
    snapshots_result = await db.execute(
        select(PortfolioSnapshot).where(
            PortfolioSnapshot.account_id == account_id
        ).order_by(PortfolioSnapshot.snapshot_date.desc()).limit(days)
    )
    snapshots = snapshots_result.scalars().all()
    
    return [
        {
            "date": s.snapshot_date,
            "total_value": s.total_value,
            "cash_balance": s.cash_balance,
            "positions_value": s.positions_value,
            "daily_pnl": s.daily_pnl
        }
        for s in reversed(snapshots)
    ]
