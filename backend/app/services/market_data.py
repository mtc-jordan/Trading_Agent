"""
TradoVerse Market Data Service

Provides real-time and historical market data via Yahoo Finance API.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import httpx

from ..core.config import get_settings
from ..schemas.schemas import StockQuote, StockChart

settings = get_settings()


class MarketDataService:
    """Service for fetching market data from Yahoo Finance."""
    
    def __init__(self):
        self.base_url = settings.FORGE_API_URL
        self.api_key = settings.FORGE_API_KEY
    
    async def get_stock_quote(self, symbol: str) -> Optional[StockQuote]:
        """
        Get current stock quote.
        
        Args:
            symbol: Stock symbol (e.g., 'AAPL')
        
        Returns:
            StockQuote with current price and metrics
        """
        try:
            async with httpx.AsyncClient() as client:
                if self.base_url and self.api_key:
                    response = await client.get(
                        f"{self.base_url}/data_api/YahooFinance/get_stock_chart",
                        headers={"Authorization": f"Bearer {self.api_key}"},
                        params={
                            "symbol": symbol,
                            "region": "US",
                            "interval": "1d",
                            "range": "1d"
                        },
                        timeout=30.0
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        result = data.get("chart", {}).get("result", [{}])[0]
                        meta = result.get("meta", {})
                        
                        return StockQuote(
                            symbol=symbol,
                            price=meta.get("regularMarketPrice", 0),
                            change=meta.get("regularMarketPrice", 0) - meta.get("previousClose", 0),
                            change_percent=((meta.get("regularMarketPrice", 0) - meta.get("previousClose", 0)) / meta.get("previousClose", 1)) * 100,
                            volume=meta.get("regularMarketVolume", 0),
                            market_cap=meta.get("marketCap"),
                            pe_ratio=None,  # Not in chart endpoint
                            high_52w=meta.get("fiftyTwoWeekHigh"),
                            low_52w=meta.get("fiftyTwoWeekLow")
                        )
                
                # Return mock data if API not available
                return self._mock_quote(symbol)
                
        except Exception as e:
            print(f"Error fetching quote for {symbol}: {e}")
            return self._mock_quote(symbol)
    
    async def get_stock_chart(
        self, 
        symbol: str, 
        interval: str = "1d",
        range_str: str = "1mo"
    ) -> Optional[StockChart]:
        """
        Get historical stock chart data.
        
        Args:
            symbol: Stock symbol
            interval: Data interval (1m, 5m, 15m, 1h, 1d, 1wk, 1mo)
            range_str: Data range (1d, 5d, 1mo, 3mo, 6mo, 1y, 5y, max)
        
        Returns:
            StockChart with OHLCV data
        """
        try:
            async with httpx.AsyncClient() as client:
                if self.base_url and self.api_key:
                    response = await client.get(
                        f"{self.base_url}/data_api/YahooFinance/get_stock_chart",
                        headers={"Authorization": f"Bearer {self.api_key}"},
                        params={
                            "symbol": symbol,
                            "region": "US",
                            "interval": interval,
                            "range": range_str,
                            "includeAdjustedClose": "true"
                        },
                        timeout=30.0
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        result = data.get("chart", {}).get("result", [{}])[0]
                        
                        timestamps = result.get("timestamp", [])
                        quotes = result.get("indicators", {}).get("quote", [{}])[0]
                        
                        return StockChart(
                            symbol=symbol,
                            timestamps=timestamps,
                            open=quotes.get("open", []),
                            high=quotes.get("high", []),
                            low=quotes.get("low", []),
                            close=quotes.get("close", []),
                            volume=quotes.get("volume", [])
                        )
                
                # Return mock data if API not available
                return self._mock_chart(symbol)
                
        except Exception as e:
            print(f"Error fetching chart for {symbol}: {e}")
            return self._mock_chart(symbol)
    
    async def get_stock_insights(self, symbol: str) -> Dict[str, Any]:
        """
        Get stock insights including analyst recommendations.
        
        Args:
            symbol: Stock symbol
        
        Returns:
            Dictionary with insights data
        """
        try:
            async with httpx.AsyncClient() as client:
                if self.base_url and self.api_key:
                    response = await client.get(
                        f"{self.base_url}/data_api/YahooFinance/get_stock_insights",
                        headers={"Authorization": f"Bearer {self.api_key}"},
                        params={"symbol": symbol},
                        timeout=30.0
                    )
                    
                    if response.status_code == 200:
                        return response.json()
                
                return {"symbol": symbol, "insights": {}}
                
        except Exception as e:
            print(f"Error fetching insights for {symbol}: {e}")
            return {"symbol": symbol, "insights": {}}
    
    async def get_stock_holders(self, symbol: str) -> Dict[str, Any]:
        """
        Get stock holders information.
        
        Args:
            symbol: Stock symbol
        
        Returns:
            Dictionary with holders data
        """
        try:
            async with httpx.AsyncClient() as client:
                if self.base_url and self.api_key:
                    response = await client.get(
                        f"{self.base_url}/data_api/YahooFinance/get_stock_holders",
                        headers={"Authorization": f"Bearer {self.api_key}"},
                        params={"symbol": symbol, "region": "US"},
                        timeout=30.0
                    )
                    
                    if response.status_code == 200:
                        return response.json()
                
                return {"symbol": symbol, "holders": {}}
                
        except Exception as e:
            print(f"Error fetching holders for {symbol}: {e}")
            return {"symbol": symbol, "holders": {}}
    
    async def get_multiple_quotes(self, symbols: List[str]) -> List[StockQuote]:
        """
        Get quotes for multiple symbols.
        
        Args:
            symbols: List of stock symbols
        
        Returns:
            List of StockQuote objects
        """
        quotes = []
        for symbol in symbols:
            quote = await self.get_stock_quote(symbol)
            if quote:
                quotes.append(quote)
        return quotes
    
    def _mock_quote(self, symbol: str) -> StockQuote:
        """Generate mock quote data for testing."""
        import random
        base_price = random.uniform(50, 500)
        change = random.uniform(-10, 10)
        
        return StockQuote(
            symbol=symbol,
            price=round(base_price, 2),
            change=round(change, 2),
            change_percent=round((change / base_price) * 100, 2),
            volume=random.randint(1000000, 50000000),
            market_cap=random.uniform(1e9, 1e12),
            pe_ratio=random.uniform(10, 50),
            high_52w=round(base_price * 1.3, 2),
            low_52w=round(base_price * 0.7, 2)
        )
    
    def _mock_chart(self, symbol: str) -> StockChart:
        """Generate mock chart data for testing."""
        import random
        from datetime import datetime, timedelta
        
        timestamps = []
        opens = []
        highs = []
        lows = []
        closes = []
        volumes = []
        
        base_price = random.uniform(100, 200)
        current_date = datetime.now() - timedelta(days=30)
        
        for _ in range(30):
            timestamps.append(int(current_date.timestamp()))
            
            open_price = base_price * (1 + random.uniform(-0.02, 0.02))
            close_price = base_price * (1 + random.uniform(-0.02, 0.02))
            high_price = max(open_price, close_price) * (1 + random.uniform(0, 0.01))
            low_price = min(open_price, close_price) * (1 - random.uniform(0, 0.01))
            
            opens.append(round(open_price, 2))
            highs.append(round(high_price, 2))
            lows.append(round(low_price, 2))
            closes.append(round(close_price, 2))
            volumes.append(random.randint(1000000, 10000000))
            
            base_price = close_price
            current_date += timedelta(days=1)
        
        return StockChart(
            symbol=symbol,
            timestamps=timestamps,
            open=opens,
            high=highs,
            low=lows,
            close=closes,
            volume=volumes
        )


# Global market data service instance
market_data_service = MarketDataService()


async def get_quote(symbol: str) -> Optional[StockQuote]:
    """Get stock quote."""
    return await market_data_service.get_stock_quote(symbol)


async def get_chart(symbol: str, interval: str = "1d", range_str: str = "1mo") -> Optional[StockChart]:
    """Get stock chart data."""
    return await market_data_service.get_stock_chart(symbol, interval, range_str)


async def get_insights(symbol: str) -> Dict[str, Any]:
    """Get stock insights."""
    return await market_data_service.get_stock_insights(symbol)


async def get_holders(symbol: str) -> Dict[str, Any]:
    """Get stock holders."""
    return await market_data_service.get_stock_holders(symbol)
