# Etherscan API Research

## API V2 Overview
- Unified API across 60+ EVM-compatible chains
- Single API key works across all chains
- Use `chainid` parameter to specify chain (1 for Ethereum, 8453 for Base, etc.)

## Key Endpoints for Our Use Case

### 1. Get Contract ABI
```
GET https://api.etherscan.io/v2/api
?chainid=1
&module=contract
&action=getabi
&address=0xContractAddress
&apikey=YourApiKey
```
- Returns ABI for verified contracts
- Used to check if contract is verified

### 2. Get Contract Source Code
```
GET https://api.etherscan.io/v2/api
?chainid=1
&module=contract
&action=getsourcecode
&address=0xContractAddress
&apikey=YourApiKey
```
- Returns source code, compiler version, optimization settings
- Includes verification status

### 3. Get Contract Creator
```
GET https://api.etherscan.io/v2/api
?chainid=1
&module=contract
&action=getcontractcreation
&contractaddresses=0xAddress1,0xAddress2
&apikey=YourApiKey
```
- Returns creator address and creation tx hash

### 4. Token Holder Distribution (PRO)
- Top holders endpoint available
- Requires PRO API key for detailed holder data

## Rate Limits
- Free tier: 5 calls/second
- PRO tier: Higher limits available

## Supported Chains
- Ethereum (1)
- BSC (56)
- Polygon (137)
- Arbitrum (42161)
- Optimism (10)
- Base (8453)
- And 50+ more

## Implementation Notes
- All responses in JSON format
- Error handling via status field
- Cache responses to avoid rate limits


# Solscan API Research

## API v2 Overview
- Pro API for Solana blockchain data
- Requires API key for authentication
- Base URL: https://pro-api.solscan.io/v2.0

## Available API Categories
1. Account APIs - Account data and transactions
2. Token APIs - SPL token metadata and holders
3. NFT APIs - NFT collection and item data
4. Transaction APIs - Transaction details
5. Block APIs - Block information
6. Market APIs - Market data and prices
7. Program APIs - Program/smart contract data
8. Monitoring APIs - Real-time monitoring

## Public API (Free)
- Base URL: https://public-api.solscan.io
- Chain Information: /chaininfo
- Limited rate limits

## Key Endpoints for Our Use Case

### Token Metadata
```
GET https://pro-api.solscan.io/v2.0/token/meta
?address=TokenMintAddress
```

### Token Holders
```
GET https://pro-api.solscan.io/v2.0/token/holders
?address=TokenMintAddress
&page=1
&page_size=10
```

### Account Tokens
```
GET https://pro-api.solscan.io/v2.0/account/tokens
?address=WalletAddress
```

## Implementation Notes
- All Pro API requests require token header
- Rate limits apply based on plan
- Responses in JSON format
