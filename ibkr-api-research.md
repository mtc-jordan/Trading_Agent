# Interactive Brokers (IBKR) API Research

## Overview
Interactive Brokers' Client Portal Web API delivers real-time access to trading functionality including:
- Live market data
- Market scanners
- Intra-day portfolio updates
- HTTP endpoints (synchronous)
- WebSocket (asynchronous, event-driven)

## Authentication Methods Available
1. **OAuth 1.0a** - Third-party authentication
2. **OAuth 2.0** - Modern OAuth flow
3. **SSO** - Single Sign-On
4. **CP Gateway** - Java-based Client Portal Gateway tool

## Requirements
- Active Interactive Brokers account (not demo)
- IBKR PRO account type
- Funded account
- Account must be fully activated

## Key Findings
- Supports both REST HTTP endpoints and WebSocket
- Multiple auth methods including OAuth 1.0a (what we need)
- Real-time market data available
- Portfolio and position tracking
- Order management

## Next Steps
- Research OAuth 1.0a specific endpoints
- Find API endpoint documentation
- Understand order placement flow
