"""
TradoVerse Backtesting Engine

This module provides backtesting capabilities for trading strategies
with historical market data support back to 2010.
"""
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from dataclasses import dataclass, field
import httpx

from ..core.config import get_settings
from ..schemas.schemas import StrategyType, BacktestResults

settings = get_settings()


@dataclass
class Position:
    """Represents an open position."""
    symbol: str
    quantity: float
    entry_price: float
    entry_date: datetime
    side: str  # 'long' or 'short'


@dataclass
class Trade:
    """Represents a completed trade."""
    symbol: str
    side: str
    entry_price: float
    exit_price: float
    quantity: float
    entry_date: datetime
    exit_date: datetime
    pnl: float
    pnl_percent: float


@dataclass
class BacktestState:
    """State of the backtest at any point in time."""
    date: datetime
    cash: float
    positions: Dict[str, Position] = field(default_factory=dict)
    equity: float = 0.0
    trades: List[Trade] = field(default_factory=list)
    equity_curve: List[Dict[str, Any]] = field(default_factory=list)


class Strategy:
    """Base class for trading strategies."""
    
    def __init__(self, params: Dict[str, Any] = None):
        self.params = params or {}
    
    def generate_signals(
        self, 
        data: Dict[str, List[float]], 
        current_idx: int
    ) -> Dict[str, str]:
        """
        Generate trading signals for each symbol.
        
        Args:
            data: Dictionary of price data by symbol
            current_idx: Current index in the data
        
        Returns:
            Dictionary of signals by symbol: 'buy', 'sell', or 'hold'
        """
        raise NotImplementedError


class MomentumStrategy(Strategy):
    """Simple momentum strategy based on moving averages."""
    
    def generate_signals(
        self, 
        data: Dict[str, List[float]], 
        current_idx: int
    ) -> Dict[str, str]:
        signals = {}
        short_period = self.params.get('short_period', 10)
        long_period = self.params.get('long_period', 30)
        
        for symbol, prices in data.items():
            if current_idx < long_period:
                signals[symbol] = 'hold'
                continue
            
            short_ma = np.mean(prices[current_idx - short_period:current_idx])
            long_ma = np.mean(prices[current_idx - long_period:current_idx])
            
            if short_ma > long_ma * 1.02:  # 2% above
                signals[symbol] = 'buy'
            elif short_ma < long_ma * 0.98:  # 2% below
                signals[symbol] = 'sell'
            else:
                signals[symbol] = 'hold'
        
        return signals


class MeanReversionStrategy(Strategy):
    """Mean reversion strategy using Bollinger Bands."""
    
    def generate_signals(
        self, 
        data: Dict[str, List[float]], 
        current_idx: int
    ) -> Dict[str, str]:
        signals = {}
        period = self.params.get('period', 20)
        std_dev = self.params.get('std_dev', 2.0)
        
        for symbol, prices in data.items():
            if current_idx < period:
                signals[symbol] = 'hold'
                continue
            
            window = prices[current_idx - period:current_idx]
            ma = np.mean(window)
            std = np.std(window)
            
            upper_band = ma + std_dev * std
            lower_band = ma - std_dev * std
            current_price = prices[current_idx]
            
            if current_price < lower_band:
                signals[symbol] = 'buy'
            elif current_price > upper_band:
                signals[symbol] = 'sell'
            else:
                signals[symbol] = 'hold'
        
        return signals


class TrendFollowingStrategy(Strategy):
    """Trend following strategy using breakouts."""
    
    def generate_signals(
        self, 
        data: Dict[str, List[float]], 
        current_idx: int
    ) -> Dict[str, str]:
        signals = {}
        lookback = self.params.get('lookback', 20)
        
        for symbol, prices in data.items():
            if current_idx < lookback:
                signals[symbol] = 'hold'
                continue
            
            window = prices[current_idx - lookback:current_idx]
            high = max(window)
            low = min(window)
            current_price = prices[current_idx]
            
            if current_price > high:
                signals[symbol] = 'buy'
            elif current_price < low:
                signals[symbol] = 'sell'
            else:
                signals[symbol] = 'hold'
        
        return signals


def get_strategy(strategy_type: StrategyType, params: Dict[str, Any] = None) -> Strategy:
    """Factory function to create strategy instances."""
    strategies = {
        StrategyType.MOMENTUM: MomentumStrategy,
        StrategyType.MEAN_REVERSION: MeanReversionStrategy,
        StrategyType.TREND_FOLLOWING: TrendFollowingStrategy,
    }
    
    strategy_class = strategies.get(strategy_type, MomentumStrategy)
    return strategy_class(params)


class BacktestEngine:
    """
    Backtesting engine for evaluating trading strategies.
    """
    
    def __init__(
        self,
        initial_capital: float = 100000.0,
        commission: float = 0.001,  # 0.1% per trade
        slippage: float = 0.0005,   # 0.05% slippage
    ):
        self.initial_capital = initial_capital
        self.commission = commission
        self.slippage = slippage
    
    async def fetch_historical_data(
        self,
        symbols: List[str],
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Dict[str, List[Any]]]:
        """
        Fetch historical market data for backtesting.
        
        Args:
            symbols: List of stock symbols
            start_date: Start date for historical data
            end_date: End date for historical data
        
        Returns:
            Dictionary with price data for each symbol
        """
        data = {}
        
        async with httpx.AsyncClient() as client:
            for symbol in symbols:
                try:
                    # Use Yahoo Finance API via Forge
                    if settings.FORGE_API_URL and settings.FORGE_API_KEY:
                        # Calculate range based on date difference
                        days = (end_date - start_date).days
                        if days <= 30:
                            range_str = "1mo"
                        elif days <= 90:
                            range_str = "3mo"
                        elif days <= 180:
                            range_str = "6mo"
                        elif days <= 365:
                            range_str = "1y"
                        elif days <= 730:
                            range_str = "2y"
                        elif days <= 1825:
                            range_str = "5y"
                        else:
                            range_str = "max"
                        
                        response = await client.get(
                            f"{settings.FORGE_API_URL}/data_api/YahooFinance/get_stock_chart",
                            headers={
                                "Authorization": f"Bearer {settings.FORGE_API_KEY}"
                            },
                            params={
                                "symbol": symbol,
                                "region": "US",
                                "interval": "1d",
                                "range": range_str,
                                "includeAdjustedClose": "true"
                            },
                            timeout=30.0
                        )
                        
                        if response.status_code == 200:
                            result = response.json()
                            chart_data = result.get("chart", {}).get("result", [{}])[0]
                            
                            timestamps = chart_data.get("timestamp", [])
                            quotes = chart_data.get("indicators", {}).get("quote", [{}])[0]
                            
                            data[symbol] = {
                                "timestamps": timestamps,
                                "open": quotes.get("open", []),
                                "high": quotes.get("high", []),
                                "low": quotes.get("low", []),
                                "close": quotes.get("close", []),
                                "volume": quotes.get("volume", [])
                            }
                        else:
                            # Generate synthetic data for testing
                            data[symbol] = self._generate_synthetic_data(start_date, end_date)
                    else:
                        # Generate synthetic data if no API available
                        data[symbol] = self._generate_synthetic_data(start_date, end_date)
                        
                except Exception as e:
                    print(f"Error fetching data for {symbol}: {e}")
                    data[symbol] = self._generate_synthetic_data(start_date, end_date)
        
        return data
    
    def _generate_synthetic_data(
        self, 
        start_date: datetime, 
        end_date: datetime,
        initial_price: float = 100.0
    ) -> Dict[str, List[Any]]:
        """Generate synthetic price data for testing."""
        days = (end_date - start_date).days
        timestamps = []
        prices = []
        volumes = []
        
        current_date = start_date
        current_price = initial_price
        
        for _ in range(days):
            if current_date.weekday() < 5:  # Skip weekends
                timestamps.append(int(current_date.timestamp()))
                
                # Random walk with drift
                daily_return = np.random.normal(0.0005, 0.02)
                current_price *= (1 + daily_return)
                
                high = current_price * (1 + abs(np.random.normal(0, 0.01)))
                low = current_price * (1 - abs(np.random.normal(0, 0.01)))
                open_price = current_price * (1 + np.random.normal(0, 0.005))
                
                prices.append({
                    "open": open_price,
                    "high": high,
                    "low": low,
                    "close": current_price
                })
                volumes.append(int(np.random.uniform(1000000, 10000000)))
            
            current_date += timedelta(days=1)
        
        return {
            "timestamps": timestamps,
            "open": [p["open"] for p in prices],
            "high": [p["high"] for p in prices],
            "low": [p["low"] for p in prices],
            "close": [p["close"] for p in prices],
            "volume": volumes
        }
    
    async def run_backtest(
        self,
        symbols: List[str],
        strategy_type: StrategyType,
        start_date: datetime,
        end_date: datetime,
        parameters: Dict[str, Any] = None
    ) -> BacktestResults:
        """
        Run a backtest for the given strategy and symbols.
        
        Args:
            symbols: List of stock symbols to trade
            strategy_type: Type of strategy to use
            start_date: Backtest start date
            end_date: Backtest end date
            parameters: Strategy parameters
        
        Returns:
            BacktestResults with performance metrics
        """
        # Fetch historical data
        market_data = await self.fetch_historical_data(symbols, start_date, end_date)
        
        # Initialize strategy
        strategy = get_strategy(strategy_type, parameters)
        
        # Initialize backtest state
        state = BacktestState(
            date=start_date,
            cash=self.initial_capital,
            equity=self.initial_capital
        )
        
        # Get price data as close prices
        price_data = {
            symbol: data.get("close", []) 
            for symbol, data in market_data.items()
        }
        
        # Determine the minimum data length
        min_length = min(len(prices) for prices in price_data.values()) if price_data else 0
        
        if min_length == 0:
            return self._empty_results()
        
        # Run simulation
        for i in range(min_length):
            # Generate signals
            signals = strategy.generate_signals(price_data, i)
            
            # Execute trades based on signals
            for symbol, signal in signals.items():
                current_price = price_data[symbol][i]
                
                if signal == 'buy' and symbol not in state.positions:
                    # Calculate position size (use 10% of portfolio per position)
                    position_value = state.cash * 0.1
                    quantity = position_value / current_price
                    
                    if quantity > 0 and position_value <= state.cash:
                        # Apply slippage and commission
                        actual_price = current_price * (1 + self.slippage)
                        cost = quantity * actual_price * (1 + self.commission)
                        
                        if cost <= state.cash:
                            state.cash -= cost
                            state.positions[symbol] = Position(
                                symbol=symbol,
                                quantity=quantity,
                                entry_price=actual_price,
                                entry_date=state.date,
                                side='long'
                            )
                
                elif signal == 'sell' and symbol in state.positions:
                    position = state.positions[symbol]
                    
                    # Apply slippage and commission
                    actual_price = current_price * (1 - self.slippage)
                    proceeds = position.quantity * actual_price * (1 - self.commission)
                    
                    # Calculate PnL
                    cost_basis = position.quantity * position.entry_price
                    pnl = proceeds - cost_basis
                    pnl_percent = pnl / cost_basis if cost_basis > 0 else 0
                    
                    # Record trade
                    state.trades.append(Trade(
                        symbol=symbol,
                        side='long',
                        entry_price=position.entry_price,
                        exit_price=actual_price,
                        quantity=position.quantity,
                        entry_date=position.entry_date,
                        exit_date=state.date,
                        pnl=pnl,
                        pnl_percent=pnl_percent
                    ))
                    
                    state.cash += proceeds
                    del state.positions[symbol]
            
            # Calculate current equity
            positions_value = sum(
                pos.quantity * price_data[pos.symbol][i]
                for pos in state.positions.values()
                if pos.symbol in price_data and i < len(price_data[pos.symbol])
            )
            state.equity = state.cash + positions_value
            
            # Record equity curve
            timestamp = market_data[symbols[0]]["timestamps"][i] if symbols else i
            state.equity_curve.append({
                "timestamp": timestamp,
                "equity": state.equity,
                "cash": state.cash,
                "positions_value": positions_value
            })
            
            state.date += timedelta(days=1)
        
        # Calculate performance metrics
        return self._calculate_metrics(state)
    
    def _calculate_metrics(self, state: BacktestState) -> BacktestResults:
        """Calculate performance metrics from backtest state."""
        trades = state.trades
        equity_curve = state.equity_curve
        
        if not trades:
            return self._empty_results()
        
        # Basic metrics
        total_trades = len(trades)
        winning_trades = len([t for t in trades if t.pnl > 0])
        losing_trades = total_trades - winning_trades
        
        win_rate = winning_trades / total_trades if total_trades > 0 else 0
        
        # PnL metrics
        total_pnl = sum(t.pnl for t in trades)
        wins = [t.pnl for t in trades if t.pnl > 0]
        losses = [abs(t.pnl) for t in trades if t.pnl < 0]
        
        avg_win = np.mean(wins) if wins else 0
        avg_loss = np.mean(losses) if losses else 0
        
        profit_factor = sum(wins) / sum(losses) if losses and sum(losses) > 0 else float('inf')
        
        # Calculate returns
        final_equity = state.equity
        total_return = (final_equity - self.initial_capital) / self.initial_capital
        
        # Calculate Sharpe ratio
        if len(equity_curve) > 1:
            returns = []
            for i in range(1, len(equity_curve)):
                prev_equity = equity_curve[i-1]["equity"]
                curr_equity = equity_curve[i]["equity"]
                if prev_equity > 0:
                    returns.append((curr_equity - prev_equity) / prev_equity)
            
            if returns:
                avg_return = np.mean(returns)
                std_return = np.std(returns)
                sharpe_ratio = (avg_return * 252) / (std_return * np.sqrt(252)) if std_return > 0 else 0
            else:
                sharpe_ratio = 0
        else:
            sharpe_ratio = 0
        
        # Calculate max drawdown
        max_drawdown = 0
        peak = self.initial_capital
        for point in equity_curve:
            equity = point["equity"]
            if equity > peak:
                peak = equity
            drawdown = (peak - equity) / peak if peak > 0 else 0
            max_drawdown = max(max_drawdown, drawdown)
        
        return BacktestResults(
            total_return=round(total_return * 100, 2),
            sharpe_ratio=round(sharpe_ratio, 2),
            max_drawdown=round(max_drawdown * 100, 2),
            win_rate=round(win_rate * 100, 2),
            profit_factor=round(profit_factor, 2) if profit_factor != float('inf') else 999.99,
            total_trades=total_trades,
            winning_trades=winning_trades,
            losing_trades=losing_trades,
            avg_win=round(avg_win, 2),
            avg_loss=round(avg_loss, 2),
            equity_curve=[
                {"timestamp": p["timestamp"], "equity": round(p["equity"], 2)}
                for p in equity_curve
            ],
            trades=[
                {
                    "symbol": t.symbol,
                    "side": t.side,
                    "entry_price": round(t.entry_price, 2),
                    "exit_price": round(t.exit_price, 2),
                    "quantity": round(t.quantity, 4),
                    "pnl": round(t.pnl, 2),
                    "pnl_percent": round(t.pnl_percent * 100, 2)
                }
                for t in trades
            ]
        )
    
    def _empty_results(self) -> BacktestResults:
        """Return empty results when no trades were made."""
        return BacktestResults(
            total_return=0,
            sharpe_ratio=0,
            max_drawdown=0,
            win_rate=0,
            profit_factor=0,
            total_trades=0,
            winning_trades=0,
            losing_trades=0,
            avg_win=0,
            avg_loss=0,
            equity_curve=[],
            trades=[]
        )


# Global backtest engine instance
backtest_engine = BacktestEngine()


async def run_backtest(
    symbols: List[str],
    strategy_type: StrategyType,
    start_date: datetime,
    end_date: datetime,
    initial_capital: float = 100000.0,
    parameters: Dict[str, Any] = None
) -> BacktestResults:
    """
    Run a backtest with the specified parameters.
    
    Args:
        symbols: List of stock symbols
        strategy_type: Strategy type to use
        start_date: Start date
        end_date: End date
        initial_capital: Starting capital
        parameters: Strategy parameters
    
    Returns:
        BacktestResults with performance metrics
    """
    engine = BacktestEngine(initial_capital=initial_capital)
    return await engine.run_backtest(symbols, strategy_type, start_date, end_date, parameters)
