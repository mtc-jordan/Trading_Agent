# Coinbase Advanced Trade API Research

## Base URL
- Primary: `https://api.coinbase.com`
- Advanced Trade: `https://api.coinbase.com/api/v3/brokerage`

## Authentication
Coinbase uses JWT (JSON Web Token) authentication with Ed25519 or ECDSA signatures.

### JWT Generation
- Requires: `key_name` (API Key ID) and `key_secret` (Private Key)
- JWT expires after 2 minutes
- Include as Bearer token: `Authorization: Bearer {JWT}`

### JWT Structure
- Header: Algorithm (ES256 for ECDSA, EdDSA for Ed25519)
- Payload: Claims including user identity, role, expiration
- Signature: Cryptographic signature

## Key Endpoints

### Accounts
- **GET /api/v3/brokerage/accounts** - List all accounts
- **GET /api/v3/brokerage/accounts/{account_uuid}** - Get specific account

### Orders
- **POST /api/v3/brokerage/orders** - Create order
- **GET /api/v3/brokerage/orders/historical/{order_id}** - Get order details
- **POST /api/v3/brokerage/orders/batch_cancel** - Cancel orders
- **GET /api/v3/brokerage/orders/historical/batch** - List orders

### Products (Market Data)
- **GET /api/v3/brokerage/products** - List products
- **GET /api/v3/brokerage/products/{product_id}** - Get product
- **GET /api/v3/brokerage/products/{product_id}/ticker** - Get ticker

### Portfolios
- **GET /api/v3/brokerage/portfolios** - List portfolios
- **GET /api/v3/brokerage/portfolios/{portfolio_uuid}** - Get portfolio

## Order Types
- MARKET
- LIMIT
- STOP
- STOP_LIMIT

## Code Sample (JavaScript)
```javascript
const { generateJwt } = require("@coinbase/cdp-sdk/auth");

const token = await generateJwt({
  apiKeyId: process.env.KEY_NAME,
  apiKeySecret: process.env.KEY_SECRET,
  requestMethod: 'GET',
  requestHost: 'api.coinbase.com',
  requestPath: '/api/v3/brokerage/accounts',
  expiresIn: 120
});

// Use token in request
fetch('https://api.coinbase.com/api/v3/brokerage/accounts', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## OAuth 2.0 (Alternative)
Coinbase also supports OAuth 2.0 for third-party apps:
- Authorization URL: `https://www.coinbase.com/oauth/authorize`
- Token URL: `https://api.coinbase.com/oauth/token`
- Scopes: `wallet:accounts:read`, `wallet:orders:create`, etc.
