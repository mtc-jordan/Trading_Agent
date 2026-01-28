/**
 * Alpaca API Credentials Validation Test
 * Tests that the configured Alpaca API credentials are valid
 */

import { describe, it, expect } from 'vitest';

describe('Alpaca API Credentials Validation', () => {
  const ALPACA_API_KEY = process.env.ALPACA_API_KEY;
  const ALPACA_API_SECRET = process.env.ALPACA_API_SECRET;
  
  // Use paper trading API by default for safety
  const ALPACA_BASE_URL = 'https://paper-api.alpaca.markets';
  
  it('should have ALPACA_API_KEY environment variable set', () => {
    expect(ALPACA_API_KEY).toBeDefined();
    expect(ALPACA_API_KEY).not.toBe('');
    expect(typeof ALPACA_API_KEY).toBe('string');
  });
  
  it('should have ALPACA_API_SECRET environment variable set', () => {
    expect(ALPACA_API_SECRET).toBeDefined();
    expect(ALPACA_API_SECRET).not.toBe('');
    expect(typeof ALPACA_API_SECRET).toBe('string');
  });
  
  it('should successfully authenticate with Alpaca API', async () => {
    // Skip if credentials are not set
    if (!ALPACA_API_KEY || !ALPACA_API_SECRET) {
      console.log('Skipping API test - credentials not set');
      return;
    }
    
    // Call the Alpaca account endpoint to verify credentials
    const response = await fetch(`${ALPACA_BASE_URL}/v2/account`, {
      method: 'GET',
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_API_SECRET,
        'Content-Type': 'application/json',
      },
    });
    
    // Check response status
    expect(response.status).toBe(200);
    
    // Parse and validate response
    const account = await response.json();
    
    // Verify we got account data back
    expect(account).toBeDefined();
    expect(account.id).toBeDefined();
    expect(account.account_number).toBeDefined();
    expect(account.status).toBeDefined();
    
    // Log account info for verification
    console.log('✅ Alpaca API credentials validated successfully!');
    console.log(`   Account ID: ${account.id}`);
    console.log(`   Account Number: ${account.account_number}`);
    console.log(`   Status: ${account.status}`);
    console.log(`   Buying Power: $${parseFloat(account.buying_power).toLocaleString()}`);
    console.log(`   Cash: $${parseFloat(account.cash).toLocaleString()}`);
    console.log(`   Portfolio Value: $${parseFloat(account.portfolio_value).toLocaleString()}`);
  });
  
  it('should be able to fetch market clock', async () => {
    // Skip if credentials are not set
    if (!ALPACA_API_KEY || !ALPACA_API_SECRET) {
      console.log('Skipping market clock test - credentials not set');
      return;
    }
    
    const response = await fetch(`${ALPACA_BASE_URL}/v2/clock`, {
      method: 'GET',
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_API_SECRET,
        'Content-Type': 'application/json',
      },
    });
    
    expect(response.status).toBe(200);
    
    const clock = await response.json();
    expect(clock).toBeDefined();
    expect(clock.timestamp).toBeDefined();
    expect(typeof clock.is_open).toBe('boolean');
    
    console.log(`   Market is ${clock.is_open ? 'OPEN' : 'CLOSED'}`);
    console.log(`   Next open: ${clock.next_open}`);
    console.log(`   Next close: ${clock.next_close}`);
  });
});
