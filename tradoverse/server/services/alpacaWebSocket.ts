/**
 * Alpaca Real-Time WebSocket Streaming Service
 * Connects to Alpaca's streaming API for live market data
 */

import WebSocket from 'ws';
import { broadcastPriceUpdate, getActiveSymbolSubscriptions, PriceUpdate } from '../_core/websocket';

// Alpaca WebSocket endpoints
const ALPACA_STREAM_URL = 'wss://stream.data.alpaca.markets/v2/iex'; // IEX for free tier
const ALPACA_STREAM_SIP_URL = 'wss://stream.data.alpaca.markets/v2/sip'; // SIP for paid tier

// Connection state
let ws: WebSocket | null = null;
let isConnected = false;
let isAuthenticated = false;
let reconnectAttempts = 0;
let reconnectTimeout: NodeJS.Timeout | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;
let subscribedSymbols: Set<string> = new Set();

// Configuration
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_BASE = 1000; // 1 second
const RECONNECT_DELAY_MAX = 30000; // 30 seconds
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

// Last known prices for calculating changes
const lastPrices: Map<string, { price: number; timestamp: number }> = new Map();

// API credentials from environment
const ALPACA_API_KEY = process.env.ALPACA_API_KEY || '';
const ALPACA_API_SECRET = process.env.ALPACA_API_SECRET || '';

/**
 * Message types from Alpaca WebSocket
 */
interface AlpacaMessage {
  T: string; // Message type
  msg?: string; // Message content (for errors)
  S?: string; // Symbol
  p?: number; // Trade price
  s?: number; // Trade size
  t?: string; // Timestamp
  c?: string[]; // Conditions
  bp?: number; // Bid price
  ap?: number; // Ask price
  bs?: number; // Bid size
  as?: number; // Ask size
  bx?: string; // Bid exchange
  ax?: string; // Ask exchange
  z?: string; // Tape
}

/**
 * Initialize the Alpaca WebSocket connection
 */
export function initializeAlpacaStream(): void {
  if (!ALPACA_API_KEY || !ALPACA_API_SECRET) {
    console.log('[AlpacaWS] API credentials not configured, skipping WebSocket initialization');
    return;
  }

  connect();
}

/**
 * Connect to Alpaca WebSocket
 */
function connect(): void {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    console.log('[AlpacaWS] Already connected or connecting');
    return;
  }

  console.log('[AlpacaWS] Connecting to Alpaca streaming API...');

  ws = new WebSocket(ALPACA_STREAM_URL);

  ws.on('open', () => {
    console.log('[AlpacaWS] WebSocket connection opened');
    isConnected = true;
    reconnectAttempts = 0;
    authenticate();
    startHeartbeat();
  });

  ws.on('message', (data: WebSocket.Data) => {
    try {
      const messages: AlpacaMessage[] = JSON.parse(data.toString());
      handleMessages(messages);
    } catch (error) {
      console.error('[AlpacaWS] Error parsing message:', error);
    }
  });

  ws.on('error', (error: Error) => {
    console.error('[AlpacaWS] WebSocket error:', error.message);
  });

  ws.on('close', (code: number, reason: Buffer) => {
    console.log(`[AlpacaWS] WebSocket closed: ${code} - ${reason.toString()}`);
    isConnected = false;
    isAuthenticated = false;
    stopHeartbeat();
    scheduleReconnect();
  });
}

/**
 * Authenticate with Alpaca
 */
function authenticate(): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const authMessage = {
    action: 'auth',
    key: ALPACA_API_KEY,
    secret: ALPACA_API_SECRET,
  };

  ws.send(JSON.stringify(authMessage));
  console.log('[AlpacaWS] Sent authentication request');
}

/**
 * Handle incoming messages from Alpaca
 */
function handleMessages(messages: AlpacaMessage[]): void {
  for (const msg of messages) {
    switch (msg.T) {
      case 'success':
        if (msg.msg === 'connected') {
          console.log('[AlpacaWS] Connected to Alpaca stream');
        } else if (msg.msg === 'authenticated') {
          console.log('[AlpacaWS] Successfully authenticated');
          isAuthenticated = true;
          // Resubscribe to previously subscribed symbols
          if (subscribedSymbols.size > 0) {
            subscribeToSymbols(Array.from(subscribedSymbols));
          }
          // Also subscribe to any active WebSocket subscriptions
          syncWithClientSubscriptions();
        }
        break;

      case 'error':
        console.error(`[AlpacaWS] Error: ${msg.msg}`);
        if (msg.msg?.includes('auth')) {
          console.error('[AlpacaWS] Authentication failed - check API credentials');
        }
        break;

      case 'subscription':
        console.log('[AlpacaWS] Subscription confirmed');
        break;

      case 't': // Trade
        handleTrade(msg);
        break;

      case 'q': // Quote
        handleQuote(msg);
        break;

      case 'b': // Bar (minute aggregates)
        handleBar(msg);
        break;

      default:
        // Unknown message type
        break;
    }
  }
}

/**
 * Handle trade message
 */
function handleTrade(msg: AlpacaMessage): void {
  if (!msg.S || !msg.p) return;

  const symbol = msg.S;
  const price = msg.p;
  const timestamp = msg.t ? new Date(msg.t).getTime() : Date.now();

  // Calculate change from last known price
  const lastPrice = lastPrices.get(symbol);
  let change = 0;
  let changePercent = 0;

  if (lastPrice) {
    change = price - lastPrice.price;
    changePercent = (change / lastPrice.price) * 100;
  }

  // Update last known price
  lastPrices.set(symbol, { price, timestamp });

  // Broadcast to connected clients
  const update: PriceUpdate = {
    symbol,
    price,
    change,
    changePercent,
    volume: msg.s || 0,
    timestamp,
  };

  broadcastPriceUpdate(update);
}

/**
 * Handle quote message (bid/ask)
 */
function handleQuote(msg: AlpacaMessage): void {
  if (!msg.S) return;

  const symbol = msg.S;
  const bidPrice = msg.bp || 0;
  const askPrice = msg.ap || 0;
  const midPrice = (bidPrice + askPrice) / 2;
  const timestamp = msg.t ? new Date(msg.t).getTime() : Date.now();

  // Use mid price if we have both bid and ask
  if (bidPrice > 0 && askPrice > 0) {
    const lastPrice = lastPrices.get(symbol);
    let change = 0;
    let changePercent = 0;

    if (lastPrice) {
      change = midPrice - lastPrice.price;
      changePercent = (change / lastPrice.price) * 100;
    }

    lastPrices.set(symbol, { price: midPrice, timestamp });

    const update: PriceUpdate = {
      symbol,
      price: midPrice,
      change,
      changePercent,
      volume: 0,
      timestamp,
    };

    broadcastPriceUpdate(update);
  }
}

/**
 * Handle bar message (OHLCV aggregates)
 */
function handleBar(msg: AlpacaMessage): void {
  // Bars are typically used for charting, not real-time price updates
  // We can implement this later if needed
}

/**
 * Subscribe to symbols for real-time updates
 */
export function subscribeToSymbols(symbols: string[]): void {
  if (!ws || ws.readyState !== WebSocket.OPEN || !isAuthenticated) {
    // Store symbols for later subscription
    symbols.forEach(s => subscribedSymbols.add(s.toUpperCase()));
    console.log(`[AlpacaWS] Queued subscription for: ${symbols.join(', ')}`);
    return;
  }

  const upperSymbols = symbols.map(s => s.toUpperCase());
  upperSymbols.forEach(s => subscribedSymbols.add(s));

  const subscribeMessage = {
    action: 'subscribe',
    trades: upperSymbols,
    quotes: upperSymbols,
  };

  ws.send(JSON.stringify(subscribeMessage));
  console.log(`[AlpacaWS] Subscribed to: ${upperSymbols.join(', ')}`);
}

/**
 * Unsubscribe from symbols
 */
export function unsubscribeFromSymbols(symbols: string[]): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const upperSymbols = symbols.map(s => s.toUpperCase());
  upperSymbols.forEach(s => subscribedSymbols.delete(s));

  const unsubscribeMessage = {
    action: 'unsubscribe',
    trades: upperSymbols,
    quotes: upperSymbols,
  };

  ws.send(JSON.stringify(unsubscribeMessage));
  console.log(`[AlpacaWS] Unsubscribed from: ${upperSymbols.join(', ')}`);
}

/**
 * Sync subscriptions with client WebSocket subscriptions
 */
function syncWithClientSubscriptions(): void {
  const activeSymbols = getActiveSymbolSubscriptions();
  if (activeSymbols.length > 0) {
    subscribeToSymbols(activeSymbols);
  }
}

/**
 * Schedule reconnection with exponential backoff
 */
function scheduleReconnect(): void {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('[AlpacaWS] Max reconnection attempts reached');
    return;
  }

  const delay = Math.min(
    RECONNECT_DELAY_BASE * Math.pow(2, reconnectAttempts),
    RECONNECT_DELAY_MAX
  );

  reconnectAttempts++;
  console.log(`[AlpacaWS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

  reconnectTimeout = setTimeout(() => {
    connect();
  }, delay);
}

/**
 * Start heartbeat to keep connection alive
 */
function startHeartbeat(): void {
  stopHeartbeat();
  heartbeatInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      // Alpaca doesn't require explicit ping, but we can check connection health
      // by monitoring if we're receiving data
    }
  }, HEARTBEAT_INTERVAL);
}

/**
 * Stop heartbeat
 */
function stopHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

/**
 * Get connection status
 */
export function getAlpacaStreamStatus(): {
  connected: boolean;
  authenticated: boolean;
  subscribedSymbols: string[];
  reconnectAttempts: number;
} {
  return {
    connected: isConnected,
    authenticated: isAuthenticated,
    subscribedSymbols: Array.from(subscribedSymbols),
    reconnectAttempts,
  };
}

/**
 * Disconnect from Alpaca WebSocket
 */
export function disconnectAlpacaStream(): void {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  stopHeartbeat();

  if (ws) {
    ws.close();
    ws = null;
  }

  isConnected = false;
  isAuthenticated = false;
  subscribedSymbols.clear();
  console.log('[AlpacaWS] Disconnected from Alpaca stream');
}

/**
 * Force reconnect
 */
export function reconnectAlpacaStream(): void {
  disconnectAlpacaStream();
  reconnectAttempts = 0;
  connect();
}

// Export for testing
export const __testing = {
  handleTrade,
  handleQuote,
  handleMessages,
  lastPrices,
};
