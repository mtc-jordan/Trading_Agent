"""
TradoVerse API Tests
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
async def client():
    """Create async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health_check(client):
    """Test health check endpoint."""
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "TradoVerse API"


@pytest.mark.asyncio
async def test_root_endpoint(client):
    """Test root API endpoint."""
    response = await client.get("/api")
    assert response.status_code == 200
    data = response.json()
    assert "name" in data
    assert "version" in data


@pytest.mark.asyncio
async def test_subscription_tiers(client):
    """Test subscription tiers endpoint."""
    response = await client.get("/api/v1/subscriptions/tiers")
    assert response.status_code == 200
    data = response.json()
    assert "tiers" in data
    assert len(data["tiers"]) == 4  # Free, Starter, Pro, Elite


@pytest.mark.asyncio
async def test_market_search(client):
    """Test market search endpoint (requires auth)."""
    response = await client.get("/api/v1/market/search?query=AAPL")
    # Should return 401 without auth
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_ai_agents_list(client):
    """Test AI agents list endpoint (requires auth)."""
    response = await client.get("/api/v1/analysis/agents")
    # Should return 401 without auth
    assert response.status_code == 401


class TestSubscriptionTiers:
    """Test subscription tier features."""
    
    def test_free_tier_features(self):
        """Test free tier has correct features."""
        from app.core.config import get_tier_features
        features = get_tier_features("free")
        assert features["ai_agents"] == 2
        assert features["max_bots"] == 1
        assert features["live_trading_enabled"] == False
    
    def test_starter_tier_features(self):
        """Test starter tier has correct features."""
        from app.core.config import get_tier_features
        features = get_tier_features("starter")
        assert features["ai_agents"] == 4
        assert features["max_bots"] == 3
        assert features["live_trading_enabled"] == True
    
    def test_pro_tier_features(self):
        """Test pro tier has correct features."""
        from app.core.config import get_tier_features
        features = get_tier_features("pro")
        assert features["ai_agents"] == 7
        assert features["max_bots"] == 10
        assert features["api_access"] == True
    
    def test_elite_tier_features(self):
        """Test elite tier has correct features."""
        from app.core.config import get_tier_features
        features = get_tier_features("elite")
        assert features["ai_agents"] == 7
        assert features["max_bots"] == -1  # Unlimited
        assert features["priority_support"] == True


class TestAIAgents:
    """Test AI agent functionality."""
    
    def test_agent_types(self):
        """Test all 7 agent types exist."""
        from app.schemas.schemas import AgentType
        agents = list(AgentType)
        assert len(agents) == 7
        assert AgentType.TECHNICAL in agents
        assert AgentType.FUNDAMENTAL in agents
        assert AgentType.SENTIMENT in agents
        assert AgentType.RISK in agents
        assert AgentType.MICROSTRUCTURE in agents
        assert AgentType.MACRO in agents
        assert AgentType.QUANT in agents
    
    def test_recommendation_types(self):
        """Test recommendation types."""
        from app.schemas.schemas import Recommendation
        recommendations = list(Recommendation)
        assert Recommendation.STRONG_BUY in recommendations
        assert Recommendation.BUY in recommendations
        assert Recommendation.HOLD in recommendations
        assert Recommendation.SELL in recommendations
        assert Recommendation.STRONG_SELL in recommendations


class TestBacktesting:
    """Test backtesting functionality."""
    
    def test_strategy_types(self):
        """Test strategy types exist."""
        from app.models.models import StrategyType
        strategies = list(StrategyType)
        assert StrategyType.MOMENTUM in strategies
        assert StrategyType.MEAN_REVERSION in strategies
        assert StrategyType.TREND_FOLLOWING in strategies
    
    def test_backtest_status(self):
        """Test backtest status types."""
        from app.models.models import BacktestStatus
        statuses = list(BacktestStatus)
        assert BacktestStatus.PENDING in statuses
        assert BacktestStatus.RUNNING in statuses
        assert BacktestStatus.COMPLETED in statuses
        assert BacktestStatus.FAILED in statuses


class TestModels:
    """Test database models."""
    
    def test_user_roles(self):
        """Test user roles."""
        from app.models.models import UserRole
        roles = list(UserRole)
        assert UserRole.USER in roles
        assert UserRole.ADMIN in roles
    
    def test_account_types(self):
        """Test account types."""
        from app.models.models import AccountType
        types = list(AccountType)
        assert AccountType.PAPER in types
        assert AccountType.LIVE in types
    
    def test_bot_status(self):
        """Test bot status types."""
        from app.models.models import BotStatus
        statuses = list(BotStatus)
        assert BotStatus.ACTIVE in statuses
        assert BotStatus.PAUSED in statuses
        assert BotStatus.STOPPED in statuses


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
