# Interactive Brokers API Integration Notes

## Overview
Interactive Brokers uses OAuth 1.0A Extended for third-party API authentication. This is more complex than standard OAuth 2.0 and requires RSA-SHA256 signatures.

## Third-Party Registration Process
1. Third-party platforms must receive Compliance approval before integration
2. Register with Interactive Brokers to obtain a `consumer_key` (25-character hex string)
3. Provide callback URLs during registration
4. Generate RSA key pair for signing requests

## OAuth 1.0A Extended Flow

### Step 1: Request Token
**Endpoint:** `POST https://api.ibkr.com/v1/api/oauth/request_token`

**Required OAuth Parameters:**
| Parameter | Description |
|-----------|-------------|
| `oauth_consumer_key` | 25-char hex string from IB registration |
| `oauth_signature_method` | Must be `RSA-SHA256` |
| `oauth_signature` | RSA-SHA256 signed base string |
| `oauth_timestamp` | Unix timestamp in seconds |
| `oauth_nonce` | Random unique string per request |
| `oauth_callback` | Callback URL or `oob` for localhost |

**Response:**
```json
{
  "oauth_token": "b9082d68cfef06b030de"
}
```

### Step 2: User Authorization
**Endpoint:** `https://interactivebrokers.com/authorize?oauth_token={REQUEST_TOKEN}`

- User logs in with IBKR credentials
- After login, redirected to callback URL with:
  - `oauth_token` - the request token
  - `oauth_verifier` - verification code for next step

### Step 3: Access Token
**Endpoint:** `POST https://api.ibkr.com/v1/api/oauth/access_token`

**Required OAuth Parameters:**
- All parameters from Step 1
- `oauth_token` - request token from Step 1
- `oauth_verifier` - from Step 2 redirect

**Response:**
```json
{
  "oauth_token": "ACCESS_TOKEN_HERE",
  "is_paper": false
}
```

### Step 4: Live Session Token (LST)
**Endpoint:** `POST https://api.ibkr.com/v1/api/oauth/live_session_token`

This step uses Diffie-Hellman key exchange to establish a session token.

**Required Parameters:**
- `diffie_hellman_challenge` - DH challenge value
- Standard OAuth parameters with access token

**Response:**
```json
{
  "diffie_hellman_response": "...",
  "live_session_token_signature": "...",
  "live_session_token_expiration": 1722973251000
}
```

### Step 5: Computing the Live Session Token
1. Calculate shared secret K using DH response
2. Prepend bytes to access token secret
3. HMAC-SHA1 hash to get final LST

## Making Authenticated Requests

### Authorization Header Format
```
OAuth oauth_consumer_key="CONSUMER_KEY",
      oauth_nonce="RANDOM_NONCE",
      oauth_signature="SIGNATURE",
      oauth_signature_method="HMAC-SHA256",
      oauth_timestamp="TIMESTAMP",
      oauth_token="ACCESS_TOKEN",
      realm="REALM"
```

### Required Headers
- `Authorization`: OAuth header
- `User-Agent`: Client identifier

## API Endpoints

### Base URL
- **Production:** `https://api.ibkr.com/v1/api/`

### Trading Endpoints
- `GET /portfolio/accounts` - List accounts
- `GET /portfolio/{accountId}/positions` - Get positions
- `POST /iserver/account/{accountId}/orders` - Place order
- `GET /iserver/account/orders` - Get orders
- `DELETE /iserver/account/{accountId}/order/{orderId}` - Cancel order

### Market Data Endpoints
- `GET /iserver/marketdata/snapshot` - Get quotes
- `GET /iserver/marketdata/history` - Historical data

## Important Notes

1. **Compliance Approval Required**: Third-party vendors must receive compliance approval before integration
2. **RSA Key Pair**: Must generate and securely store RSA keys for signing
3. **Session Expiration**: Live session tokens expire and must be refreshed
4. **Paper vs Live**: `is_paper` flag indicates account type
5. **Rate Limits**: Be mindful of API rate limits

## Python Libraries Required
- `pycryptodome` - For RSA signatures
- `requests` - HTTP client
- `base64` - Encoding
- `json` - JSON parsing

## Signature Creation Process
```python
# 1. Create base string
params_string = "&".join([f"{k}={v}" for k, v in sorted(oauth_params.items())])
base_string = f"POST&{quote_plus(url)}&{quote(params_string)}"

# 2. Sign with RSA-SHA256
encoded_base_string = base_string.encode("utf-8")
sha256_hash = SHA256.new(data=encoded_base_string)
signature = PKCS1_v1_5_Signature.new(rsa_key=private_key).sign(msg_hash=sha256_hash)
b64_signature = base64.b64encode(signature).decode("utf-8")
```
