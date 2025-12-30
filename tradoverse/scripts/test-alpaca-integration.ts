/**
 * Alpaca Integration Test Script
 * Tests account viewing, paper trading, and real-time quotes
 */

const ALPACA_API_KEY = process.env.ALPACA_API_KEY!;
const ALPACA_API_SECRET = process.env.ALPACA_API_SECRET!;
const ALPACA_BASE_URL = 'https://paper-api.alpaca.markets';
const ALPACA_DATA_URL = 'https://data.alpaca.markets';

interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string;
  currency: string;
  buying_power: string;
  cash: string;
  portfolio_value: string;
  pattern_day_trader: boolean;
  trading_blocked: boolean;
  transfers_blocked: boolean;
  account_blocked: boolean;
  created_at: string;
  equity: string;
  last_equity: string;
  long_market_value: string;
  short_market_value: string;
  initial_margin: string;
  maintenance_margin: string;
  daytrade_count: number;
}

interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  qty: string;
  avg_entry_price: string;
  side: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  current_price: string;
  lastday_price: string;
  change_today: string;
}

interface AlpacaOrder {
  id: string;
  client_order_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at: string | null;
  expired_at: string | null;
  canceled_at: string | null;
  failed_at: string | null;
  asset_id: string;
  symbol: string;
  asset_class: string;
  qty: string;
  filled_qty: string;
  type: string;
  side: string;
  time_in_force: string;
  status: string;
  extended_hours: boolean;
  legs: any[] | null;
}

interface AlpacaQuote {
  symbol: string;
  bid: number;
  ask: number;
  bid_size: number;
  ask_size: number;
  timestamp: string;
}

async function makeRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'APCA-API-KEY-ID': ALPACA_API_KEY,
      'APCA-API-SECRET-KEY': ALPACA_API_SECRET,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Alpaca API error (${response.status}): ${error}`);
  }
  
  return response.json();
}

async function getAccount(): Promise<AlpacaAccount> {
  return makeRequest(`${ALPACA_BASE_URL}/v2/account`);
}

async function getPositions(): Promise<AlpacaPosition[]> {
  return makeRequest(`${ALPACA_BASE_URL}/v2/positions`);
}

async function getOrders(status: string = 'all'): Promise<AlpacaOrder[]> {
  return makeRequest(`${ALPACA_BASE_URL}/v2/orders?status=${status}&limit=10`);
}

async function placeOrder(symbol: string, qty: number, side: 'buy' | 'sell', type: string = 'market'): Promise<AlpacaOrder> {
  return makeRequest(`${ALPACA_BASE_URL}/v2/orders`, {
    method: 'POST',
    body: JSON.stringify({
      symbol,
      qty: qty.toString(),
      side,
      type,
      time_in_force: 'day',
    }),
  });
}

async function getQuote(symbol: string): Promise<any> {
  return makeRequest(`${ALPACA_DATA_URL}/v2/stocks/${symbol}/quotes/latest`);
}

async function getMultipleQuotes(symbols: string[]): Promise<any> {
  const symbolsParam = symbols.join(',');
  return makeRequest(`${ALPACA_DATA_URL}/v2/stocks/quotes/latest?symbols=${symbolsParam}`);
}

async function getMarketClock(): Promise<any> {
  return makeRequest(`${ALPACA_BASE_URL}/v2/clock`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 ALPACA INTEGRATION TEST');
  console.log('='.repeat(60));
  
  // 1. VIEW ACCOUNT DETAILS
  console.log('\n📊 ACCOUNT DETAILS');
  console.log('-'.repeat(40));
  
  try {
    const account = await getAccount();
    console.log(`Account ID:        ${account.id}`);
    console.log(`Account Number:    ${account.account_number}`);
    console.log(`Status:            ${account.status}`);
    console.log(`Currency:          ${account.currency}`);
    console.log(`Buying Power:      $${parseFloat(account.buying_power).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`Cash:              $${parseFloat(account.cash).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`Portfolio Value:   $${parseFloat(account.portfolio_value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`Equity:            $${parseFloat(account.equity).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`Long Market Value: $${parseFloat(account.long_market_value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`Day Trade Count:   ${account.daytrade_count}`);
    console.log(`PDT Status:        ${account.pattern_day_trader ? 'Yes' : 'No'}`);
    console.log(`Trading Blocked:   ${account.trading_blocked ? 'Yes' : 'No'}`);
  } catch (error: any) {
    console.error(`❌ Error fetching account: ${error.message}`);
  }
  
  // 2. VIEW POSITIONS
  console.log('\n📈 CURRENT POSITIONS');
  console.log('-'.repeat(40));
  
  try {
    const positions = await getPositions();
    if (positions.length === 0) {
      console.log('No open positions');
    } else {
      for (const pos of positions) {
        const pl = parseFloat(pos.unrealized_pl);
        const plPercent = parseFloat(pos.unrealized_plpc) * 100;
        const plSign = pl >= 0 ? '+' : '';
        console.log(`\n${pos.symbol}:`);
        console.log(`  Quantity:      ${pos.qty} shares`);
        console.log(`  Avg Entry:     $${parseFloat(pos.avg_entry_price).toFixed(2)}`);
        console.log(`  Current Price: $${parseFloat(pos.current_price).toFixed(2)}`);
        console.log(`  Market Value:  $${parseFloat(pos.market_value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        console.log(`  P/L:           ${plSign}$${pl.toFixed(2)} (${plSign}${plPercent.toFixed(2)}%)`);
      }
    }
  } catch (error: any) {
    console.error(`❌ Error fetching positions: ${error.message}`);
  }
  
  // 3. CHECK MARKET STATUS
  console.log('\n⏰ MARKET STATUS');
  console.log('-'.repeat(40));
  
  try {
    const clock = await getMarketClock();
    console.log(`Market is:    ${clock.is_open ? '🟢 OPEN' : '🔴 CLOSED'}`);
    console.log(`Current Time: ${new Date(clock.timestamp).toLocaleString()}`);
    console.log(`Next Open:    ${new Date(clock.next_open).toLocaleString()}`);
    console.log(`Next Close:   ${new Date(clock.next_close).toLocaleString()}`);
  } catch (error: any) {
    console.error(`❌ Error fetching market clock: ${error.message}`);
  }
  
  // 4. GET REAL-TIME QUOTES
  console.log('\n💹 REAL-TIME QUOTES');
  console.log('-'.repeat(40));
  
  const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN'];
  
  try {
    const quotesResponse = await getMultipleQuotes(symbols);
    const quotes = quotesResponse.quotes;
    
    console.log('Symbol    Bid          Ask          Spread     Time');
    console.log('-'.repeat(60));
    
    for (const symbol of symbols) {
      if (quotes[symbol]) {
        const q = quotes[symbol];
        const spread = (q.ap - q.bp).toFixed(2);
        const time = new Date(q.t).toLocaleTimeString();
        console.log(`${symbol.padEnd(10)}$${q.bp.toFixed(2).padEnd(12)}$${q.ap.toFixed(2).padEnd(12)}$${spread.padEnd(10)}${time}`);
      }
    }
  } catch (error: any) {
    console.error(`❌ Error fetching quotes: ${error.message}`);
  }
  
  // 5. PLACE A PAPER TRADE (only if market is open or extended hours)
  console.log('\n🛒 PAPER TRADE TEST');
  console.log('-'.repeat(40));
  
  try {
    const clock = await getMarketClock();
    
    // Place a small test order for 1 share of AAPL
    console.log('Placing test order: BUY 1 share of AAPL (market order)...');
    
    const order = await placeOrder('AAPL', 1, 'buy', 'market');
    
    console.log(`✅ Order placed successfully!`);
    console.log(`  Order ID:     ${order.id}`);
    console.log(`  Symbol:       ${order.symbol}`);
    console.log(`  Side:         ${order.side.toUpperCase()}`);
    console.log(`  Quantity:     ${order.qty}`);
    console.log(`  Type:         ${order.type}`);
    console.log(`  Status:       ${order.status}`);
    console.log(`  Submitted At: ${new Date(order.submitted_at).toLocaleString()}`);
    
    if (order.filled_at) {
      console.log(`  Filled At:    ${new Date(order.filled_at).toLocaleString()}`);
      console.log(`  Filled Qty:   ${order.filled_qty}`);
    }
  } catch (error: any) {
    console.error(`❌ Error placing order: ${error.message}`);
    console.log('Note: Orders may fail if market is closed and order type is market.');
  }
  
  // 6. VIEW RECENT ORDERS
  console.log('\n📋 RECENT ORDERS');
  console.log('-'.repeat(40));
  
  try {
    const orders = await getOrders('all');
    
    if (orders.length === 0) {
      console.log('No recent orders');
    } else {
      console.log('Symbol    Side   Qty    Type       Status       Time');
      console.log('-'.repeat(70));
      
      for (const order of orders.slice(0, 10)) {
        const time = new Date(order.submitted_at).toLocaleString();
        console.log(`${order.symbol.padEnd(10)}${order.side.toUpperCase().padEnd(7)}${order.qty.padEnd(7)}${order.type.padEnd(11)}${order.status.padEnd(13)}${time}`);
      }
    }
  } catch (error: any) {
    console.error(`❌ Error fetching orders: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ ALPACA INTEGRATION TEST COMPLETE');
  console.log('='.repeat(60));
}

main().catch(console.error);
