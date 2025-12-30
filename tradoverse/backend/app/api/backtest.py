"""
TradoVerse Backtesting API Routes
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..core.database import get_db
from ..core.security import get_current_user
from ..core.config import get_tier_features
from ..models.models import Backtest, BacktestStatus
from ..schemas.schemas import BacktestCreate, BacktestResponse, BacktestResults
from ..services.backtesting import run_backtest

router = APIRouter()


async def run_backtest_task(
    backtest_id: int,
    symbols: List[str],
    strategy_type: str,
    start_date: datetime,
    end_date: datetime,
    initial_capital: float,
    parameters: dict,
    db_url: str
):
    """Background task to run backtest."""
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from ..models.models import Backtest, BacktestStatus, StrategyType
    
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Get backtest record
        result = await session.execute(
            select(Backtest).where(Backtest.id == backtest_id)
        )
        backtest = result.scalar_one_or_none()
        
        if not backtest:
            return
        
        try:
            # Run the backtest
            results = await run_backtest(
                symbols=symbols,
                strategy_type=StrategyType(strategy_type),
                start_date=start_date,
                end_date=end_date,
                initial_capital=initial_capital,
                parameters=parameters
            )
            
            # Update backtest record
            backtest.status = BacktestStatus.COMPLETED
            backtest.final_capital = initial_capital * (1 + results.total_return / 100)
            backtest.total_return = results.total_return
            backtest.sharpe_ratio = results.sharpe_ratio
            backtest.max_drawdown = results.max_drawdown
            backtest.win_rate = results.win_rate
            backtest.profit_factor = results.profit_factor
            backtest.total_trades = results.total_trades
            backtest.results = {
                "equity_curve": results.equity_curve,
                "trades": results.trades,
                "winning_trades": results.winning_trades,
                "losing_trades": results.losing_trades,
                "avg_win": results.avg_win,
                "avg_loss": results.avg_loss
            }
            backtest.completed_at = datetime.utcnow()
            
        except Exception as e:
            backtest.status = BacktestStatus.FAILED
            backtest.results = {"error": str(e)}
        
        await session.commit()
    
    await engine.dispose()


@router.post("/", response_model=BacktestResponse)
async def create_backtest(
    backtest_data: BacktestCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create and run a new backtest."""
    # Check tier limits
    tier = current_user.get("subscription_tier", "free")
    features = get_tier_features(tier)
    
    if not features.get("backtesting_enabled"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Backtesting is not available on your plan. Please upgrade."
        )
    
    # Check historical data access
    max_years = features.get("historical_data_years", 1)
    requested_years = (backtest_data.end_date - backtest_data.start_date).days / 365
    
    if requested_years > max_years:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your plan allows up to {max_years} years of historical data. Please upgrade for more."
        )
    
    # Create backtest record
    backtest = Backtest(
        user_id=current_user["id"],
        bot_id=backtest_data.bot_id,
        name=backtest_data.name,
        symbols=backtest_data.symbols,
        start_date=backtest_data.start_date,
        end_date=backtest_data.end_date,
        initial_capital=backtest_data.initial_capital,
        strategy=backtest_data.strategy,
        parameters=backtest_data.parameters,
        status=BacktestStatus.RUNNING
    )
    
    db.add(backtest)
    await db.commit()
    await db.refresh(backtest)
    
    # Start background task
    from ..core.config import get_settings
    settings = get_settings()
    
    background_tasks.add_task(
        run_backtest_task,
        backtest.id,
        backtest_data.symbols,
        backtest_data.strategy.value,
        backtest_data.start_date,
        backtest_data.end_date,
        backtest_data.initial_capital,
        backtest_data.parameters,
        settings.DATABASE_URL
    )
    
    return backtest


@router.get("/", response_model=List[BacktestResponse])
async def list_backtests(
    bot_id: Optional[int] = Query(None),
    status_filter: Optional[BacktestStatus] = Query(None),
    limit: int = Query(20, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all backtests for current user."""
    query = select(Backtest).where(Backtest.user_id == current_user["id"])
    
    if bot_id:
        query = query.where(Backtest.bot_id == bot_id)
    if status_filter:
        query = query.where(Backtest.status == status_filter)
    
    query = query.order_by(Backtest.created_at.desc()).limit(limit)
    
    result = await db.execute(query)
    backtests = result.scalars().all()
    
    return backtests


@router.get("/{backtest_id}", response_model=BacktestResponse)
async def get_backtest(
    backtest_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific backtest."""
    result = await db.execute(
        select(Backtest).where(
            Backtest.id == backtest_id,
            Backtest.user_id == current_user["id"]
        )
    )
    backtest = result.scalar_one_or_none()
    
    if not backtest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backtest not found"
        )
    
    return backtest


@router.get("/{backtest_id}/results")
async def get_backtest_results(
    backtest_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed results for a backtest."""
    result = await db.execute(
        select(Backtest).where(
            Backtest.id == backtest_id,
            Backtest.user_id == current_user["id"]
        )
    )
    backtest = result.scalar_one_or_none()
    
    if not backtest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backtest not found"
        )
    
    if backtest.status == BacktestStatus.RUNNING:
        return {"status": "running", "message": "Backtest is still running"}
    
    if backtest.status == BacktestStatus.FAILED:
        return {"status": "failed", "error": backtest.results.get("error", "Unknown error")}
    
    return {
        "status": "completed",
        "summary": {
            "total_return": backtest.total_return,
            "sharpe_ratio": backtest.sharpe_ratio,
            "max_drawdown": backtest.max_drawdown,
            "win_rate": backtest.win_rate,
            "profit_factor": backtest.profit_factor,
            "total_trades": backtest.total_trades,
            "initial_capital": backtest.initial_capital,
            "final_capital": backtest.final_capital
        },
        "details": backtest.results
    }


@router.delete("/{backtest_id}")
async def delete_backtest(
    backtest_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a backtest."""
    result = await db.execute(
        select(Backtest).where(
            Backtest.id == backtest_id,
            Backtest.user_id == current_user["id"]
        )
    )
    backtest = result.scalar_one_or_none()
    
    if not backtest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backtest not found"
        )
    
    await db.delete(backtest)
    await db.commit()
    
    return {"success": True, "message": "Backtest deleted"}
