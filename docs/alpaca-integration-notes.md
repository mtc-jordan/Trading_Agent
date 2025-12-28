# Alpaca API Integration Notes

## OAuth2 Authentication Flow

### Overview
Alpaca implements OAuth 2.0 to allow third-party applications to access Alpaca Trading API on behalf of end-users.

### Key Points
- Requires `client_id` and `client_secret` from app registration
- Single OAuth token can authorize: one live account, one paper account, or both
- Users with multiple paper accounts must authorize each separately

### OAuth Flow Steps

1. **Request Connection on Behalf of User**
   - Redirect to: `https://app.alpaca.markets/oauth/authorize`
   - Required parameters:
     - `response_type`: Must be `code`
     - `client_id`: Your registered client ID
     - `redirect_uri`: Must match whitelisted URIs
   - Optional parameters:
     - `state`: Random string for CSRF protection
     - `scope`: Space-delimited scopes (default: read-only)
     - `env`: `live` or `paper` (if not specified, prompts for both)

2. **User Authorization**
   - User sees consent screen
   - User approves access to their Alpaca account

3. **Redirect Back with Code**
   - Alpaca redirects to `redirect_uri` with `code` parameter
   - Example: `https://example.com/oauth/callback?code=67f74f5a-a2cc-4ebd-88b4-22453fe07994&state=...`

4. **Exchange Code for Access Token**
   - POST to: `https://api.alpaca.markets/oauth/token`
   - Content-Type: `application/x-www-form-urlencoded`
   - Parameters:
     - `grant_type`: `authorization_code`
     - `code`: The authorization code
     - `client_id`: Your client ID
     - `client_secret`: Your client secret
     - `redirect_uri`: Same as step 1
   - **IMPORTANT**: This request must be server-side (not visible to users)

5. **Receive Access Token**
   ```json
   {
     "access_token": "79500537-5796-4230-9661-7f7108877c60",
     "token_type": "bearer",
     "scope": "account:write trading"
   }
   ```

### Available Scopes
| Scope | Description |
|-------|-------------|
| `account:write` | Write access for account configurations and watchlists |
| `trading` | Place, cancel or modify orders |
| `data` | Access to the Data API |

### API Endpoints
- **Live Trading**: `https://api.alpaca.markets/v2/...`
- **Paper Trading**: `https://paper-api.alpaca.markets/v2/...`

### Making API Calls
Use Bearer token authentication:
```bash
curl https://api.alpaca.markets/v2/account \
  -H 'Authorization: Bearer {access_token}'
```

### WebSocket Authentication
```json
{
  "action": "authenticate",
  "data": {
    "oauth_token": "79500537-5796-4230-9661-7f7108877c60"
  }
}
```

### Important Notes
- Most users can have only 1 active stream connection
- If connection is used by another app, receive 406 error: "connection limit exceeded"


## Trading API Endpoints

### Base URLs
- **Paper Trading**: `https://paper-api.alpaca.markets/v2/`
- **Live Trading**: `https://api.alpaca.markets/v2/`

### Orders API

#### Create Order - POST /v2/orders
**Required Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `symbol` | string | Stock symbol, asset ID, or currency pair |
| `qty` | string | Number of shares (can be fractional for market/day orders) |
| `side` | enum | `buy` or `sell` |
| `type` | enum | `market`, `limit`, `stop`, `stop_limit`, `trailing_stop` |
| `time_in_force` | enum | `day`, `gtc`, `opg`, `cls`, `ioc`, `fok` |

**Optional Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `notional` | string | Dollar amount (alternative to qty, market orders only) |
| `limit_price` | string | Required for limit/stop_limit orders |
| `stop_price` | string | Required for stop/stop_limit orders |
| `trail_price` | string | For trailing_stop orders |
| `trail_percent` | string | For trailing_stop orders |
| `extended_hours` | boolean | Enable pre/after market trading (limit orders only) |
| `client_order_id` | string | Custom order ID (max 128 chars) |
| `order_class` | enum | `simple`, `bracket`, `oco`, `oto`, `mleg` |
| `take_profit` | object | Take profit settings for bracket orders |
| `stop_loss` | object | Stop loss settings for bracket orders |

**Order Types by Asset:**
- Equity: market, limit, stop, stop_limit, trailing_stop
- Options: market, limit
- Crypto: market, limit, stop_limit

**Time in Force by Asset:**
- Equity: day, gtc, opg, cls, ioc, fok
- Options: day
- Crypto: gtc, ioc

#### Other Order Endpoints
- `GET /v2/orders` - Get all orders
- `DELETE /v2/orders` - Cancel all orders
- `GET /v2/orders/{order_id}` - Get order by ID
- `GET /v2/orders:by_client_order_id` - Get order by client order ID
- `PATCH /v2/orders/{order_id}` - Replace/modify order
- `DELETE /v2/orders/{order_id}` - Cancel specific order

### Positions API
- `GET /v2/positions` - Get all positions
- `GET /v2/positions/{symbol}` - Get position by symbol
- `DELETE /v2/positions` - Close all positions
- `DELETE /v2/positions/{symbol}` - Close position

### Account API
- `GET /v2/account` - Get account info (buying power, equity, etc.)

### Response Codes
- 200: Success
- 403: Forbidden (insufficient buying power/shares)
- 422: Unprocessable (invalid parameters)
