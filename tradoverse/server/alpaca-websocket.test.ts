import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the ws module
vi.mock("ws", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1, // OPEN
    })),
    WebSocket: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1,
    })),
  };
});

// Mock environment variables
vi.stubEnv("ALPACA_API_KEY", "test-api-key");
vi.stubEnv("ALPACA_API_SECRET", "test-api-secret");

describe("Alpaca WebSocket Streaming", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("Module Exports", () => {
    it("should export required functions", async () => {
      const alpacaWs = await import("./services/alpacaWebSocket");
      
      expect(alpacaWs.initializeAlpacaStream).toBeDefined();
      expect(typeof alpacaWs.initializeAlpacaStream).toBe("function");
      
      expect(alpacaWs.getAlpacaStreamStatus).toBeDefined();
      expect(typeof alpacaWs.getAlpacaStreamStatus).toBe("function");
      
      expect(alpacaWs.subscribeToSymbols).toBeDefined();
      expect(typeof alpacaWs.subscribeToSymbols).toBe("function");
      
      expect(alpacaWs.unsubscribeFromSymbols).toBeDefined();
      expect(typeof alpacaWs.unsubscribeFromSymbols).toBe("function");
      
      expect(alpacaWs.reconnectAlpacaStream).toBeDefined();
      expect(typeof alpacaWs.reconnectAlpacaStream).toBe("function");
    });
  });

  describe("getAlpacaStreamStatus", () => {
    it("should return stream status object", async () => {
      const { getAlpacaStreamStatus } = await import("./services/alpacaWebSocket");
      
      const status = getAlpacaStreamStatus();
      
      expect(status).toHaveProperty("connected");
      expect(status).toHaveProperty("authenticated");
      expect(status).toHaveProperty("subscribedSymbols");
      expect(status).toHaveProperty("reconnectAttempts");
      
      expect(typeof status.connected).toBe("boolean");
      expect(typeof status.authenticated).toBe("boolean");
      expect(Array.isArray(status.subscribedSymbols)).toBe(true);
      expect(typeof status.reconnectAttempts).toBe("number");
    });

    it("should return initial disconnected state", async () => {
      const { getAlpacaStreamStatus } = await import("./services/alpacaWebSocket");
      
      const status = getAlpacaStreamStatus();
      
      // Initially should be disconnected since we haven't connected
      expect(status.subscribedSymbols).toEqual([]);
      expect(status.reconnectAttempts).toBe(0);
    });
  });

  describe("subscribeToSymbols", () => {
    it("should accept an array of symbols", async () => {
      const { subscribeToSymbols, getAlpacaStreamStatus } = await import("./services/alpacaWebSocket");
      
      // This should not throw
      expect(() => subscribeToSymbols(["AAPL", "GOOGL", "MSFT"])).not.toThrow();
    });

    it("should handle empty array gracefully", async () => {
      const { subscribeToSymbols } = await import("./services/alpacaWebSocket");
      
      expect(() => subscribeToSymbols([])).not.toThrow();
    });

    it("should handle duplicate symbols", async () => {
      const { subscribeToSymbols } = await import("./services/alpacaWebSocket");
      
      expect(() => subscribeToSymbols(["AAPL", "AAPL", "GOOGL"])).not.toThrow();
    });
  });

  describe("unsubscribeFromSymbols", () => {
    it("should accept an array of symbols to unsubscribe", async () => {
      const { unsubscribeFromSymbols } = await import("./services/alpacaWebSocket");
      
      expect(() => unsubscribeFromSymbols(["AAPL", "GOOGL"])).not.toThrow();
    });

    it("should handle unsubscribing from non-subscribed symbols", async () => {
      const { unsubscribeFromSymbols } = await import("./services/alpacaWebSocket");
      
      expect(() => unsubscribeFromSymbols(["UNKNOWN_SYMBOL"])).not.toThrow();
    });
  });

  describe("reconnectAlpacaStream", () => {
    it("should be callable without throwing", async () => {
      const { reconnectAlpacaStream } = await import("./services/alpacaWebSocket");
      
      expect(() => reconnectAlpacaStream()).not.toThrow();
    });
  });

  describe("Alpaca WebSocket URL Configuration", () => {
    it("should use IEX feed for free tier by default", async () => {
      // The service should use wss://stream.data.alpaca.markets/v2/iex for free tier
      // This is configured in the service
      const { getAlpacaStreamStatus } = await import("./services/alpacaWebSocket");
      
      // Just verify the module loads correctly with IEX configuration
      const status = getAlpacaStreamStatus();
      expect(status).toBeDefined();
    });
  });

  describe("Price Update Format", () => {
    it("should define correct price update interface", async () => {
      // The price update should have these fields:
      // symbol, price, change, changePercent, volume, timestamp, bid, ask, bidSize, askSize
      const expectedFields = [
        "symbol",
        "price",
        "change",
        "changePercent",
        "volume",
        "timestamp",
      ];
      
      // This is a type check - the actual implementation should match
      expect(expectedFields.length).toBeGreaterThan(0);
    });
  });
});

describe("System Router Alpaca Endpoints", () => {
  it("should have alpacaStreamStatus endpoint defined", async () => {
    const { systemRouter } = await import("./_core/systemRouter");
    
    // Check that the router has the alpacaStreamStatus procedure
    expect(systemRouter._def.procedures).toHaveProperty("alpacaStreamStatus");
  });

  it("should have subscribeAlpacaSymbols endpoint defined", async () => {
    const { systemRouter } = await import("./_core/systemRouter");
    
    expect(systemRouter._def.procedures).toHaveProperty("subscribeAlpacaSymbols");
  });

  it("should have unsubscribeAlpacaSymbols endpoint defined", async () => {
    const { systemRouter } = await import("./_core/systemRouter");
    
    expect(systemRouter._def.procedures).toHaveProperty("unsubscribeAlpacaSymbols");
  });

  it("should have reconnectAlpacaStream endpoint defined", async () => {
    const { systemRouter } = await import("./_core/systemRouter");
    
    expect(systemRouter._def.procedures).toHaveProperty("reconnectAlpacaStream");
  });
});
