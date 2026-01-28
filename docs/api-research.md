# API Research for Crypto Integration

## Binance Futures API

### Funding Rate Endpoints

**Get Funding Rate History**
- Endpoint: `GET /fapi/v1/fundingRate`
- Base URL: `https://fapi.binance.com`
- Rate Limit: 500/5min/IP
- Parameters:
  - symbol (STRING, optional)
  - startTime (LONG, optional) - Timestamp in ms
  - endTime (LONG, optional) - Timestamp in ms
  - limit (INT, optional) - Default 100, max 1000

**Get Funding Info**
- Endpoint: `GET /fapi/v1/fundingInfo`
- Returns current funding rate info for all symbols

**Mark Price**
- Endpoint: `GET /fapi/v1/premiumIndex`
- Returns mark price and funding rate for a symbol

### Order Endpoints (Requires API Key)
- Place Order: `POST /fapi/v1/order`
- Cancel Order: `DELETE /fapi/v1/order`
- Get Account: `GET /fapi/v2/account`
- Get Position: `GET /fapi/v2/positionRisk`

### Authentication
- Requires API Key and Secret
- Signature: HMAC SHA256 of query string
- Headers: X-MBX-APIKEY
