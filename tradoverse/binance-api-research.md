# Binance API Research

## Base URL
- Primary: `https://api.binance.com`
- Alternatives: `https://api1.binance.com`, `https://api2.binance.com`, etc.

## Authentication
- Supports HMAC-SHA256, RSA, and Ed25519 signatures
- API Key + Secret Key required
- Signature = HMAC-SHA256(queryString, secretKey)
- Headers: `X-MBX-APIKEY: {apiKey}`

## Key Endpoints

### Account Information
- **GET /api/v3/account** - Get account balances and info
  - Weight: 20
  - Parameters: `omitZeroBalances` (optional), `timestamp` (required), `signature` (required)
  - Response includes: `balances[]` with `asset`, `free`, `locked`

### Orders
- **POST /api/v3/order** - Place new order
  - Parameters: `symbol`, `side` (BUY/SELL), `type` (LIMIT/MARKET), `quantity`, `price` (for LIMIT)
  
- **GET /api/v3/order** - Query order status
  - Parameters: `symbol`, `orderId` or `origClientOrderId`
  
- **DELETE /api/v3/order** - Cancel order
  - Parameters: `symbol`, `orderId` or `origClientOrderId`

- **GET /api/v3/openOrders** - Get all open orders
  - Parameters: `symbol` (optional)

- **GET /api/v3/allOrders** - Get all orders (active, canceled, filled)
  - Parameters: `symbol`, `startTime`, `endTime`, `limit`

### Market Data
- **GET /api/v3/ticker/price** - Get current price
- **GET /api/v3/ticker/24hr** - 24hr price change statistics

## Signature Generation (HMAC-SHA256)
```javascript
const crypto = require('crypto');

function generateSignature(queryString, secretKey) {
  return crypto
    .createHmac('sha256', secretKey)
    .update(queryString)
    .digest('hex');
}

// Example request
const timestamp = Date.now();
const queryString = `timestamp=${timestamp}`;
const signature = generateSignature(queryString, secretKey);
const url = `https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`;
```

## Rate Limits
- Request weight limits per minute
- Order limits per second and per day
- IP-based and UID-based limits

## Order Types
- LIMIT
- MARKET
- STOP_LOSS
- STOP_LOSS_LIMIT
- TAKE_PROFIT
- TAKE_PROFIT_LIMIT
- LIMIT_MAKER
