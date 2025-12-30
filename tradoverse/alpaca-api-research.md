# Alpaca API Research Notes

## Overview
Alpaca is an API-first stock, options, and crypto brokerage platform. Commission-free trading with advanced order types.

## Trading API Features

### Account Types
- **Paper Trading**: Free, real-time simulation environment for testing algorithms
- **Live Brokerage**: Real money trading for individuals and businesses
- **Crypto Accounts**: Trade crypto 24/7

### Order Types Supported
1. **Market Order** - Execute at current market price
2. **Limit Order** - Execute at specified price or better
3. **Stop Order** - Trigger market order when price reaches stop price
4. **Stop Limit Order** - Trigger limit order when price reaches stop price
5. **Bracket Orders** - Entry order with take-profit and stop-loss
6. **OCO Orders** - One-Cancels-Other orders
7. **OTO Orders** - One-Triggers-Other orders
8. **Trailing Stop Orders** - Dynamic stop price that follows market

### Time in Force Options
- DAY - Valid for the trading day
- GTC - Good Till Canceled
- IOC - Immediate or Cancel
- FOK - Fill or Kill
- OPG - Market on Open
- CLS - Market on Close

### Trading Hours
- **Overnight**: 8:00pm - 4:00am ET (Sunday to Friday)
- **Pre-market**: 4:00am - 9:30am ET (Monday to Friday)
- **Regular**: 9:30am - 4:00pm ET (Monday to Friday)
- **After-hours**: 4:00pm - 8:00pm ET (Monday to Friday)

### Extended Hours Trading
- Must use limit orders with time_in_force = day
- Set extended_hours = true parameter

### Buying Power
- Up to 4X intraday buying power
- Up to 2X overnight buying power
- Short selling supported
- Margin trading available

### Fractional Trading
- Buy as little as $1 worth of shares
- Over 2,000 US equities supported
- Only market orders for fractional trading

### Key Features
- Unique order IDs (client-provided or system-generated)
- Real-time order status via streaming interface
- IPO symbol support with limit order requirement
- User protections enabled

## API Endpoints (Trading)
- POST /v2/orders - Place order
- GET /v2/orders - List orders
- GET /v2/orders/{order_id} - Get order by ID
- DELETE /v2/orders/{order_id} - Cancel order
- DELETE /v2/orders - Cancel all orders
- GET /v2/positions - List positions
- GET /v2/positions/{symbol} - Get position
- DELETE /v2/positions/{symbol} - Close position
- GET /v2/account - Get account info
- GET /v2/account/activities - Get account activities

## Authentication
- API Key + Secret Key
- OAuth2 for third-party apps (Connect API)
- Base URLs:
  - Paper: https://paper-api.alpaca.markets
  - Live: https://api.alpaca.markets


## Options Trading API

### Trading Levels
| Level | Supported Trades | Validation |
|-------|------------------|------------|
| 0 | Options trading disabled | N/A |
| 1 | Sell covered call, Sell cash-secured put | Must own underlying shares, sufficient buying power |
| 2 | Level 1 + Buy call, Buy put | Sufficient options buying power |
| 3 | Level 1,2 + Buy call spread, Buy put spread | Sufficient options buying power |

### Options Contract Format
- Symbol format: `AAPL240119C00100000` (AAPL Jan 19 2024 100 Call)
- Contract fields: id, symbol, name, status, tradable, expiration_date, root_symbol, underlying_symbol, type (call/put), style (american), strike_price, size, open_interest, close_price

### Options Endpoints
- GET /v2/options/contracts - List option contracts
- GET /v2/options/contracts/{symbol_or_id} - Get specific contract
- Query params: underlying_symbols, expiration_date_lte, limit

### Options Order Requirements
- qty must be whole number (no fractional)
- notional must NOT be populated
- time_in_force must be "day"
- extended_hours must be false or not populated
- type must be "market" or "limit"

### Options Features
- Exercise instructions via POST /v2/positions/{symbol}/exercise
- Auto-exercise ITM contracts at expiry (by $0.01 or more)
- Do Not Exercise (DNE) via support team
- Assignment notifications via REST API polling
- Real-time and historical options market data

### Paper Trading
- Options enabled by default in paper environment
- Can disable via Trading Dashboard > Account > Configure


## Market Data API

### Overview
Alpaca Market Data API provides real-time and historical data via HTTP and WebSocket protocols for equities, options, crypto, and news.

### Base URL
- Production: `https://data.alpaca.markets/{version}`
- Sandbox: `https://data.sandbox.alpaca.markets/{version}`

### Subscription Plans

| Feature | Basic (Free) | Algo Trader Plus ($99/mo) |
|---------|--------------|---------------------------|
| Securities | US Stocks & ETFs | US Stocks & ETFs |
| Real-time coverage | IEX only (~2.5% volume) | All US Exchanges (100% volume) |
| WebSocket subscriptions | 30 symbols | Unlimited |
| Historical data | Since 2016 | Since 2016 |
| Historical limitation | 15 min delayed | No restriction |
| API calls | 200/min | 10,000/min |

### Data Sources (feed parameter)
| Source | Description |
|--------|-------------|
| iex | IEX Exchange only (~2.5% volume) - Free tier |
| sip | All US exchanges via SIP (100% volume) - Paid |
| boats | Blue Ocean ATS - Extended hours trading |
| overnight | Alpaca's derived feed from BOATS (15 min delayed) |

### Historical Data Types

#### Stocks
- **Trades**: Individual trade executions with price, size, exchange, conditions
- **Quotes**: NBBO (National Best Bid/Offer) with bid/ask prices and sizes
- **Bars**: OHLCV aggregated data (1Min, 5Min, 15Min, 30Min, 1Hour, 1Day, 1Week, 1Month)
- **Snapshots**: Latest trade, quote, minute bar, daily bar, previous daily bar
- **Auctions**: Opening and closing auction data

#### Crypto
- **Trades**: Crypto trade executions
- **Quotes**: Best bid/offer from exchanges
- **Bars**: OHLCV for crypto pairs (BTC/USD, ETH/USD, etc.)
- **Snapshots**: Latest crypto market data
- Supported exchanges: Coinbase, Gemini, Kraken, etc.

#### Options
- **Trades**: Options trade executions
- **Quotes**: Options bid/ask with Greeks
- **Bars**: Options OHLCV data
- **Snapshots**: Latest options data
- Basic: Indicative feed only
- Algo Trader Plus: Full OPRA feed

#### News
- **News Articles**: Financial news with sentiment analysis
- Filter by symbols, dates, sources
- Includes headline, summary, author, source, URL

### WebSocket Streaming

#### Stock Streams
- `wss://stream.data.alpaca.markets/v2/{feed}` (sip, iex)
- Subscribe to: trades, quotes, bars, dailyBars, updatedBars, statuses

#### Crypto Streams
- `wss://stream.data.alpaca.markets/v1beta3/crypto/{exchange}`
- Subscribe to: trades, quotes, bars, updatedBars, dailyBars, orderbooks

#### Options Streams
- `wss://stream.data.alpaca.markets/v1beta1/options`
- Subscribe to: trades, quotes

#### News Streams
- `wss://stream.data.alpaca.markets/v1beta1/news`
- Subscribe to news articles in real-time

### Authentication
- Header: `APCA-API-KEY-ID` and `APCA-API-SECRET-KEY`
- WebSocket: Send auth message after connection


## Complete API Endpoints Reference

### Trading API Endpoints

#### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /v2/orders | Create a new order |
| GET | /v2/orders | Get all orders |
| DELETE | /v2/orders | Cancel all orders |
| GET | /v2/orders:by_client_order_id | Get order by client order ID |
| GET | /v2/orders/{order_id} | Get order by ID |
| PATCH | /v2/orders/{order_id} | Replace/modify order |
| DELETE | /v2/orders/{order_id} | Cancel order by ID |

#### Order Parameters
- **symbol**: Stock symbol, asset ID, or currency pair
- **qty**: Number of shares (can be fractional for market/day orders)
- **notional**: Dollar amount (alternative to qty, market orders only)
- **side**: buy, sell
- **type**: market, limit, stop, stop_limit, trailing_stop
- **time_in_force**: day, gtc, opg, cls, ioc, fok
- **limit_price**: Required for limit/stop_limit orders
- **stop_price**: Required for stop/stop_limit orders
- **trail_price/trail_percent**: For trailing_stop orders
- **extended_hours**: Enable pre/after market trading
- **client_order_id**: Custom order ID (max 128 chars)
- **order_class**: simple, bracket, oco, oto, mleg (for options)
- **position_intent**: buy_to_open, buy_to_close, sell_to_open, sell_to_close

#### Positions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /v2/positions | Get all positions |
| GET | /v2/positions/{symbol_or_asset_id} | Get position by symbol |
| DELETE | /v2/positions | Close all positions |
| DELETE | /v2/positions/{symbol_or_asset_id} | Close specific position |

#### Account
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /v2/account | Get account info |
| GET | /v2/account/portfolio/history | Get portfolio history |
| GET | /v2/account/activities | Get account activities |
| GET | /v2/account/configurations | Get account config |
| PATCH | /v2/account/configurations | Update account config |

#### Assets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /v2/assets | Get all assets |
| GET | /v2/assets/{symbol_or_asset_id} | Get asset by symbol |

### Market Data API Endpoints

#### Stock Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /v2/stocks/{symbol}/trades | Get stock trades |
| GET | /v2/stocks/{symbol}/trades/latest | Get latest trade |
| GET | /v2/stocks/trades | Get multi-stock trades |
| GET | /v2/stocks/{symbol}/quotes | Get stock quotes |
| GET | /v2/stocks/{symbol}/quotes/latest | Get latest quote |
| GET | /v2/stocks/quotes | Get multi-stock quotes |
| GET | /v2/stocks/{symbol}/bars | Get stock bars (OHLCV) |
| GET | /v2/stocks/bars | Get multi-stock bars |
| GET | /v2/stocks/snapshots | Get stock snapshots |
| GET | /v2/stocks/{symbol}/snapshot | Get single snapshot |
| GET | /v2/stocks/auctions | Get auction data |

#### Options Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /v2/options/contracts | Get option contracts |
| GET | /v2/options/contracts/{symbol_or_id} | Get specific contract |
| GET | /v2/options/trades | Get options trades |
| GET | /v2/options/quotes | Get options quotes |
| GET | /v2/options/bars | Get options bars |
| GET | /v2/options/snapshots | Get options snapshots |

#### Crypto Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /v1beta3/crypto/{loc}/trades | Get crypto trades |
| GET | /v1beta3/crypto/{loc}/quotes | Get crypto quotes |
| GET | /v1beta3/crypto/{loc}/bars | Get crypto bars |
| GET | /v1beta3/crypto/{loc}/snapshots | Get crypto snapshots |
| GET | /v1beta3/crypto/{loc}/orderbooks | Get orderbooks |

#### News
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /v1beta1/news | Get news articles |

### Base URLs
| Environment | Trading API | Market Data API |
|-------------|-------------|-----------------|
| Paper | https://paper-api.alpaca.markets | https://data.alpaca.markets |
| Live | https://api.alpaca.markets | https://data.alpaca.markets |
| Sandbox | https://broker-api.sandbox.alpaca.markets | https://data.sandbox.alpaca.markets |


---

# TradoVerse Integration Plan

## Executive Summary

Alpaca provides a comprehensive, commission-free trading API that is ideal for TradoVerse as the default broker connection. It supports stocks, ETFs, options, and crypto trading with both paper and live trading environments.

## Key Advantages of Alpaca for TradoVerse

1. **Commission-Free Trading** - No trading fees for stocks, ETFs, and options
2. **Paper Trading** - Perfect for our Paper Trading feature and strategy backtesting
3. **Real-Time Data** - WebSocket streaming for live market data
4. **Multi-Asset Support** - Stocks, Options, Crypto all in one API
5. **Fractional Shares** - Supports fractional trading for accessibility
6. **Extended Hours** - Pre-market and after-hours trading support
7. **OAuth Support** - Easy user authentication flow
8. **Well-Documented** - Comprehensive API documentation and SDKs

## Integration Architecture

### Phase 1: Core Trading Integration
```
TradoVerse Platform
├── AlpacaService (server/services/brokers/AlpacaService.ts)
│   ├── Authentication (API keys + OAuth)
│   ├── Account Management
│   ├── Order Management
│   ├── Position Tracking
│   └── Portfolio History
├── AlpacaMarketData (server/services/market-data/AlpacaMarketData.ts)
│   ├── Real-time Quotes (WebSocket)
│   ├── Historical Bars
│   ├── Trade Data
│   └── News Feed
└── AlpacaOptions (server/services/options/AlpacaOptions.ts)
    ├── Options Chains
    ├── Options Orders
    └── Greeks Data
```

### Phase 2: Feature Mapping

| TradoVerse Feature | Alpaca API Integration |
|-------------------|------------------------|
| Paper Trading | Paper Trading API (paper-api.alpaca.markets) |
| Live Trading | Trading API (api.alpaca.markets) |
| Real-time Quotes | WebSocket Stream (stream.data.alpaca.markets) |
| Historical Data | Historical API (/v2/stocks/bars) |
| Portfolio Tracking | Account API (/v2/account, /v2/positions) |
| Order Management | Orders API (/v2/orders) |
| Options Trading | Options API (/v2/options/*) |
| Crypto Trading | Crypto API (/v1beta3/crypto/*) |
| News Feed | News API (/v1beta1/news) |
| Strategy Alerts | WebSocket + Order Events |

### Phase 3: Data Flow

```
User Action → TradoVerse UI → tRPC Router → AlpacaService → Alpaca API
                                                    ↓
                                              Response/WebSocket
                                                    ↓
                                              TradoVerse UI Update
```

## Implementation Checklist

### Backend Services
- [ ] Create AlpacaAuthService for API key management and OAuth
- [ ] Create AlpacaAccountService for account operations
- [ ] Create AlpacaOrderService for order placement and management
- [ ] Create AlpacaPositionService for position tracking
- [ ] Create AlpacaMarketDataService for quotes and bars
- [ ] Create AlpacaWebSocketService for real-time streaming
- [ ] Create AlpacaOptionsService for options trading
- [ ] Create AlpacaCryptoService for crypto trading
- [ ] Create AlpacaNewsService for news feed

### Database Schema Updates
- [ ] Add alpaca_credentials table for user API keys
- [ ] Add alpaca_orders table for order history
- [ ] Add alpaca_positions table for position snapshots
- [ ] Add alpaca_watchlists table for synced watchlists

### Frontend Components
- [ ] AlpacaConnectionSetup - API key input and OAuth flow
- [ ] AlpacaAccountOverview - Account balance and buying power
- [ ] AlpacaOrderForm - Place orders with all order types
- [ ] AlpacaPositions - View and manage positions
- [ ] AlpacaOrderHistory - View order history and status
- [ ] AlpacaRealTimeQuotes - Live price updates
- [ ] AlpacaOptionsChain - Options chain viewer
- [ ] AlpacaCryptoTrading - Crypto trading interface

### tRPC Routes
- [ ] alpaca.connect - Connect Alpaca account
- [ ] alpaca.disconnect - Disconnect account
- [ ] alpaca.getAccount - Get account info
- [ ] alpaca.getPositions - Get all positions
- [ ] alpaca.getOrders - Get order history
- [ ] alpaca.placeOrder - Place new order
- [ ] alpaca.cancelOrder - Cancel order
- [ ] alpaca.getQuote - Get real-time quote
- [ ] alpaca.getBars - Get historical bars
- [ ] alpaca.getOptionsChain - Get options chain
- [ ] alpaca.getNews - Get news articles

## API Rate Limits

| Tier | API Calls | WebSocket Subscriptions |
|------|-----------|------------------------|
| Basic (Free) | 200/min | 30 symbols |
| Algo Trader Plus ($99/mo) | 10,000/min | Unlimited |

## Security Considerations

1. **API Key Storage** - Encrypt API keys at rest using AES-256
2. **OAuth Tokens** - Store refresh tokens securely, auto-refresh access tokens
3. **Rate Limiting** - Implement client-side rate limiting to avoid API bans
4. **Error Handling** - Graceful handling of API errors and retries
5. **Audit Logging** - Log all trading actions for compliance

## Estimated Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1: Core Services | 2-3 days | Auth, Account, Orders, Positions |
| Phase 2: Market Data | 1-2 days | Quotes, Bars, WebSocket |
| Phase 3: Options & Crypto | 1-2 days | Options chains, Crypto trading |
| Phase 4: UI Components | 2-3 days | All frontend components |
| Phase 5: Testing | 1-2 days | Unit tests, integration tests |
| **Total** | **7-12 days** | Full Alpaca integration |

## Next Steps

1. **Create AlpacaService base class** with authentication and error handling
2. **Implement Paper Trading first** for safe testing
3. **Add WebSocket streaming** for real-time data
4. **Build UI components** for order placement and position management
5. **Add Options trading** support
6. **Implement Crypto trading** support
7. **Write comprehensive tests** for all services
8. **Document API usage** for users

