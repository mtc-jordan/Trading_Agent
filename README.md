# TradoVerse - AI-Powered Trading Platform

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Stripe-008CDD?style=for-the-badge&logo=stripe&logoColor=white" alt="Stripe"/>
</p>

TradoVerse is a comprehensive AI-powered trading SaaS platform featuring a unique **7-agent consensus system** that mimics how professional hedge funds operate. The platform provides institutional-grade analysis to retail traders through specialized AI agents that collaborate and vote on every trading decision.

## 🚀 Features

### 7-Agent AI Consensus System
- **Technical Analysis Agent** - Analyzes price charts, patterns, and technical indicators
- **Fundamental Analysis Agent** - Evaluates company financials, valuations, and business fundamentals
- **Sentiment Analysis Agent** - Processes market sentiment from news and social media
- **Risk Management Agent** - Assesses and manages trading risks with veto power
- **Market Microstructure Agent** - Analyzes order flow, liquidity, and market mechanics
- **Macroeconomic Agent** - Evaluates macroeconomic factors affecting markets
- **Quantitative Agent** - Applies statistical and mathematical models

### Trading Features
- **Automated Trading Bots** - Create and deploy algorithmic trading strategies
- **Paper Trading** - Practice with $100K virtual capital
- **Live Trading** - Connect to real brokers (with proper tier)
- **Backtesting Engine** - Test strategies with historical data from 2010+
- **Portfolio Analytics** - Sharpe ratio, drawdown, win rate, profit factor

### Platform Features
- **Bot Marketplace** - Share and copy trading strategies
- **Leaderboard** - Track top-performing bots
- **Real-time Market Data** - Yahoo Finance integration
- **Subscription Tiers** - Free, Starter, Pro, Elite plans
- **Admin Dashboard** - Platform management and analytics

## 🏗️ Architecture

```
tradoverse/
├── backend/                 # FastAPI Backend (Python)
│   ├── app/
│   │   ├── api/            # API route handlers
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── accounts.py
│   │   │   ├── bots.py
│   │   │   ├── analysis.py
│   │   │   ├── backtest.py
│   │   │   ├── portfolio.py
│   │   │   ├── marketplace.py
│   │   │   ├── admin.py
│   │   │   ├── market_data.py
│   │   │   └── subscriptions.py
│   │   ├── core/           # Core configuration
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── security.py
│   │   ├── models/         # SQLAlchemy models
│   │   │   └── models.py
│   │   ├── schemas/        # Pydantic schemas
│   │   │   └── schemas.py
│   │   ├── services/       # Business logic
│   │   │   ├── ai_agents.py
│   │   │   ├── backtesting.py
│   │   │   ├── market_data.py
│   │   │   └── stripe_service.py
│   │   └── main.py         # FastAPI app entry
│   ├── tests/              # Python tests
│   └── requirements.txt
│
├── client/                  # React Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   │   ├── Home.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Analysis.tsx
│   │   │   ├── Bots.tsx
│   │   │   ├── Backtest.tsx
│   │   │   ├── Portfolio.tsx
│   │   │   ├── Marketplace.tsx
│   │   │   ├── Admin.tsx
│   │   │   └── Pricing.tsx
│   │   ├── lib/
│   │   │   └── api.ts      # FastAPI client
│   │   └── App.tsx
│   └── package.json
│
└── drizzle/                 # Database migrations (tRPC legacy)
```

## 🛠️ Tech Stack

### Backend (FastAPI)
- **Framework**: FastAPI 0.115+
- **Language**: Python 3.11+
- **Database**: PostgreSQL with SQLAlchemy 2.0
- **Authentication**: JWT with python-jose
- **Payments**: Stripe
- **AI/ML**: OpenAI API, NumPy, Pandas

### Frontend (React)
- **Framework**: React 19 with TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **State Management**: TanStack Query
- **Charts**: Recharts

## 📦 Installation

### Prerequisites
- Python 3.11+
- Node.js 22+
- PostgreSQL 14+
- pnpm

### Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
# Navigate to client
cd client

# Install dependencies
pnpm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
pnpm dev
```

## 🔧 Environment Variables

### Backend (.env)
```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/tradoverse

# Security
JWT_SECRET=your-super-secret-jwt-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OpenAI (for AI agents)
OPENAI_API_KEY=sk-...

# Yahoo Finance API
YAHOO_FINANCE_API_KEY=your-api-key
```

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## 📊 Subscription Tiers

| Feature | Free | Starter ($29/mo) | Pro ($79/mo) | Elite ($199/mo) |
|---------|------|------------------|--------------|-----------------|
| AI Agents | 2 | 4 | 7 | 7 |
| Trading Bots | 1 | 3 | 10 | Unlimited |
| Paper Trading | ✅ | ✅ | ✅ | ✅ |
| Live Trading | ❌ | ✅ | ✅ | ✅ |
| Backtesting | 1 year | 5 years | 10 years | Full history |
| API Access | ❌ | ❌ | ✅ | ✅ |
| Priority Support | ❌ | ❌ | ❌ | ✅ |

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest -v
```

### Frontend Tests
```bash
cd client
pnpm test
```

## 📚 API Documentation

Once the backend is running, access the interactive API documentation:
- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

## 🔒 Security

- JWT-based authentication
- Role-based access control (RBAC)
- Multi-tenant data isolation
- Stripe webhook signature verification
- Rate limiting on API endpoints

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [React](https://react.dev/) - UI library
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components
- [Stripe](https://stripe.com/) - Payment processing
- [Yahoo Finance](https://finance.yahoo.com/) - Market data

---

<p align="center">
  Built with ❤️ by the TradoVerse Team
</p>
