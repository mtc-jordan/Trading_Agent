# IBKR OAuth 2.0 Research Findings

## Authentication Methods Available

### 1. OAuth 2.0 (beta)
- Supports **first-party** (accessing one's own accounts) and **third-party** (accessing accounts of unaffiliated IB clients with their authorization)
- Offers access to **account management AND trading features**
- Uses `private_key_jwt` client authentication (RFC 7521 and RFC 7523)
- Client authenticates by presenting a signed JWT token called `client_assertion`
- Authorization server validates against public key(s) provided during registration

### 2. OAuth 1.0a
- Supports first-party and third-party usage
- Offers access to **trading features only** (no account management)
- More complex RSA-SHA256 signature process

### 3. SSO (Single Sign-On)
- Available to Financial Advisors and Introducing Brokers only
- For clients under your management

### 4. Client Portal Gateway (for Individuals)
- Small Java program that runs locally
- Routes local web requests with appropriate authentication
- No partnership required

## Access Types

### For Organizations (Institutional)
- Contact API Solutions team: api-solutions@interactivebrokers.com
- Need to provide: Firm Name, Firm Type, API Services needed, Intended usage

### For Individuals (Retail)
- Use Client Portal Gateway
- Account must be "IBKR Pro" type
- Account must be fully open and funded

### For Third Parties
- Must seek approval for OAuth 1.0a
- Must receive Compliance approval before integration

## Key Endpoints (from documentation)

Base URL: `https://api.ibkr.com`

### OAuth 2.0 Flow
1. Generate JWT client_assertion with private key
2. Exchange for access token
3. Use access token for API requests

### Trading API Endpoints
- `/v1/api/portfolio/accounts` - Get accounts
- `/v1/api/iserver/account/{accountId}/orders` - Place orders
- `/v1/api/portfolio/{accountId}/positions` - Get positions
- `/v1/api/iserver/marketdata/snapshot` - Market data
- `/v1/api/iserver/contract/search` - Contract search

## Implementation Strategy for TradoVerse

Since IBKR OAuth 2.0 requires:
1. Business registration with IBKR
2. Public key registration
3. JWT client_assertion signing

We will implement:
1. **IBKRBrokerAdapter** with OAuth 2.0 JWT flow
2. **Configuration for client_id and private key** (users provide their own)
3. **Fallback to Client Portal Gateway** for individual users

## API Capabilities

| Feature | OAuth 2.0 | OAuth 1.0a | Gateway |
|---------|-----------|------------|---------|
| Trading | ✅ | ✅ | ✅ |
| Account Management | ✅ | ❌ | ✅ |
| Market Data | ✅ | ✅ | ✅ |
| Portfolio | ✅ | ✅ | ✅ |
| Third-Party Access | ✅ | ✅ | ❌ |

## IBKR REST API Endpoints (v2.17.0)

Base URL: `https://api.ibkr.com`

### Trading Endpoints

#### Accounts
- `GET /iserver/account/{accountId}/summary` - General account summary
- `GET /iserver/account/{accountId}/summary/available_funds` - Available funds
- `GET /iserver/account/{accountId}/summary/balances` - Account balances
- `POST /iserver/account` - Switch active account
- `GET /iserver/account/pnl/partitioned` - Account P&L

#### Orders
- `GET /iserver/account/order/status/{orderId}` - Get order status
- `GET /iserver/account/orders` - Get open orders and filled/cancelled orders
- `GET /iserver/account/trades` - Get list of trades
- `POST /iserver/account/{accountId}/orders` - Submit new order(s)
- `POST /iserver/account/{accountId}/orders/{orderId}` - Modify existing order
- `DELETE /iserver/account/{accountId}/order/{orderId}` - Cancel order
- `POST /iserver/account/{accountId}/orders/whatif` - Preview order effects
- `POST /iserver/reply/{replyId}` - Respond to server prompt

#### Portfolio
- `GET /portfolio/accounts` - Get portfolio accounts
- `GET /portfolio/{accountId}/positions` - Get positions
- `GET /portfolio/{accountId}/position/{conid}` - Get specific position

#### Market Data
- `GET /iserver/marketdata/snapshot` - Get market data snapshot
- `GET /iserver/marketdata/history` - Get historical data
- `GET /iserver/secdef/search` - Search securities
- `GET /iserver/contract/{conid}/info` - Get contract info

#### Session
- `GET /iserver/auth/status` - Check auth status
- `POST /iserver/auth/ssodh/init` - Initialize SSO
- `POST /tickle` - Keep session alive
- `POST /logout` - Logout

### Authorization Endpoints
- `POST /oauth2/api/v1/token` - Get access token (OAuth 2.0)
- `POST /oauth/request_token` - Request token (OAuth 1.0a)
- `POST /oauth/access_token` - Access token (OAuth 1.0a)
- `GET /oauth/live_session_token` - Live session token (OAuth 1.0a)
