/**
 * Unified Order Router for TradoVerse
 * 
 * Smart order routing that automatically selects the best broker based on:
 * - Asset type (stocks, crypto, forex, options)
 * - User preferences
 * - Broker availability and health
 * - Fee optimization
 * - Execution quality
 */

import { 
  BrokerType, 
  AssetClass, 
  UnifiedOrder, 
  OrderResponse,
  BrokerCapabilities,
  BrokerError,
  BrokerErrorCode
} from './types';
import { BrokerFactory } from './BrokerFactory';
import { IBrokerAdapter } from './IBrokerAdapter';

// ============================================================================
// Types
// ============================================================================

export interface RoutingPreferences {
  preferredStockBroker?: BrokerType;
  preferredCryptoBroker?: BrokerType;
  preferredForexBroker?: BrokerType;
  preferredOptionsBroker?: BrokerType;
  enableSmartRouting: boolean;
  prioritizeLowFees: boolean;
  prioritizeFastExecution: boolean;
  allowFallback: boolean;
}

export interface RoutingDecision {
  selectedBroker: BrokerType;
  reason: string;
  alternatives: BrokerType[];
  confidence: number; // 0-100
  estimatedFee?: number;
  estimatedExecutionTime?: number;
}

export interface BrokerHealth {
  brokerType: BrokerType;
  isConnected: boolean;
  isHealthy: boolean;
  lastResponseTime?: number;
  errorRate?: number;
  lastError?: string;
  lastChecked: Date;
}

export interface RoutedOrderResult {
  order: OrderResponse;
  routingDecision: RoutingDecision;
  executionTime: number;
}

// ============================================================================
// Asset Type Detection
// ============================================================================

// Common crypto symbols
const CRYPTO_SYMBOLS = new Set([
  'BTC', 'ETH', 'XRP', 'LTC', 'BCH', 'ADA', 'DOT', 'LINK', 'XLM', 'DOGE',
  'UNI', 'AAVE', 'SOL', 'AVAX', 'MATIC', 'ATOM', 'ALGO', 'FIL', 'TRX', 'ETC',
  'XMR', 'EOS', 'XTZ', 'THETA', 'VET', 'NEO', 'MIOTA', 'DASH', 'ZEC', 'MKR',
  'COMP', 'SNX', 'YFI', 'SUSHI', 'CRV', 'BAL', 'REN', 'KNC', 'ZRX', 'BAT',
  'BTCUSD', 'ETHUSD', 'BTCUSDT', 'ETHUSDT', 'BNBUSD', 'BNBUSDT', 'SOLUSD',
  'BTC/USD', 'ETH/USD', 'BTC/USDT', 'ETH/USDT', 'SOL/USD', 'SOL/USDT',
  'SHIB', 'PEPE', 'FLOKI', 'BONK', 'WIF', 'ARB', 'OP', 'APT', 'SUI', 'SEI'
]);

// Common forex pairs
const FOREX_PAIRS = new Set([
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD',
  'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY',
  'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'AUD/JPY', 'CAD/JPY', 'CHF/JPY', 'NZD/JPY'
]);

/**
 * Detect the asset class of a symbol
 */
export function detectAssetClass(symbol: string): AssetClass {
  const normalizedSymbol = symbol.toUpperCase().replace(/[-_]/g, '');
  
  // Check for crypto
  if (CRYPTO_SYMBOLS.has(normalizedSymbol) || 
      normalizedSymbol.endsWith('USD') && CRYPTO_SYMBOLS.has(normalizedSymbol.replace('USD', '')) ||
      normalizedSymbol.endsWith('USDT') && CRYPTO_SYMBOLS.has(normalizedSymbol.replace('USDT', '')) ||
      normalizedSymbol.includes('/') && CRYPTO_SYMBOLS.has(normalizedSymbol.split('/')[0])) {
    return AssetClass.CRYPTO;
  }
  
  // Check for forex
  if (FOREX_PAIRS.has(normalizedSymbol) || 
      normalizedSymbol.includes('/') && FOREX_PAIRS.has(normalizedSymbol.replace('/', ''))) {
    return AssetClass.FOREX;
  }
  
  // Check for options (typically have expiry date in symbol)
  if (/\d{6}[CP]\d+/.test(normalizedSymbol) || 
      normalizedSymbol.includes('CALL') || 
      normalizedSymbol.includes('PUT')) {
    return AssetClass.OPTIONS;
  }
  
  // Check for futures (typically end with month/year codes)
  if (/[A-Z]{2,4}[FGHJKMNQUVXZ]\d{1,2}$/.test(normalizedSymbol)) {
    return AssetClass.FUTURES;
  }
  
  // Default to US equity
  return AssetClass.US_EQUITY;
}

// ============================================================================
// Order Router Class
// ============================================================================

export class OrderRouter {
  private brokerFactory: BrokerFactory;
  private brokerHealth: Map<BrokerType, BrokerHealth> = new Map();
  private connectedBrokers: Map<BrokerType, IBrokerAdapter> = new Map();
  
  // Default broker priorities by asset class
  private static readonly BROKER_PRIORITIES: Record<AssetClass, BrokerType[]> = {
    [AssetClass.US_EQUITY]: [BrokerType.ALPACA, BrokerType.SCHWAB, BrokerType.INTERACTIVE_BROKERS],
    [AssetClass.CRYPTO]: [BrokerType.BINANCE, BrokerType.COINBASE, BrokerType.ALPACA],
    [AssetClass.FOREX]: [BrokerType.INTERACTIVE_BROKERS],
    [AssetClass.OPTIONS]: [BrokerType.INTERACTIVE_BROKERS, BrokerType.SCHWAB],
    [AssetClass.FUTURES]: [BrokerType.INTERACTIVE_BROKERS]
  };
  
  // Broker capabilities cache
  private static readonly BROKER_CAPABILITIES: Record<BrokerType, BrokerCapabilities> = {
    [BrokerType.ALPACA]: {
      supportedAssetClasses: [AssetClass.US_EQUITY, AssetClass.CRYPTO],
      supportedOrderTypes: ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop'] as any,
      supportedTimeInForce: ['day', 'gtc', 'ioc', 'fok'] as any,
      supportsExtendedHours: true,
      supportsFractionalShares: true,
      supportsShortSelling: true,
      supportsMarginTrading: true,
      supportsOptionsTrading: false,
      supportsCryptoTrading: true,
      supportsForexTrading: false,
      supportsPaperTrading: true,
      supportsWebSocket: true,
      supportsStreamingQuotes: true,
      supportsStreamingBars: true,
      supportsStreamingTrades: true,
      maxOrdersPerMinute: 200
    },
    [BrokerType.INTERACTIVE_BROKERS]: {
      supportedAssetClasses: [AssetClass.US_EQUITY, AssetClass.OPTIONS, AssetClass.FUTURES, AssetClass.FOREX],
      supportedOrderTypes: ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop'] as any,
      supportedTimeInForce: ['day', 'gtc', 'ioc', 'fok', 'opg', 'cls'] as any,
      supportsExtendedHours: true,
      supportsFractionalShares: true,
      supportsShortSelling: true,
      supportsMarginTrading: true,
      supportsOptionsTrading: true,
      supportsCryptoTrading: false,
      supportsForexTrading: true,
      supportsPaperTrading: true,
      supportsWebSocket: true,
      supportsStreamingQuotes: true,
      supportsStreamingBars: true,
      supportsStreamingTrades: true,
      maxOrdersPerMinute: 50
    },
    [BrokerType.BINANCE]: {
      supportedAssetClasses: [AssetClass.CRYPTO],
      supportedOrderTypes: ['market', 'limit', 'stop', 'stop_limit'] as any,
      supportedTimeInForce: ['gtc', 'ioc', 'fok'] as any,
      supportsExtendedHours: true, // 24/7
      supportsFractionalShares: true,
      supportsShortSelling: true, // Futures
      supportsMarginTrading: true,
      supportsOptionsTrading: false,
      supportsCryptoTrading: true,
      supportsForexTrading: false,
      supportsPaperTrading: true,
      supportsWebSocket: true,
      supportsStreamingQuotes: true,
      supportsStreamingBars: true,
      supportsStreamingTrades: true,
      maxOrdersPerMinute: 1200
    },
    [BrokerType.COINBASE]: {
      supportedAssetClasses: [AssetClass.CRYPTO],
      supportedOrderTypes: ['market', 'limit', 'stop'] as any,
      supportedTimeInForce: ['gtc', 'ioc', 'fok'] as any,
      supportsExtendedHours: true, // 24/7
      supportsFractionalShares: true,
      supportsShortSelling: false,
      supportsMarginTrading: false,
      supportsOptionsTrading: false,
      supportsCryptoTrading: true,
      supportsForexTrading: false,
      supportsPaperTrading: true,
      supportsWebSocket: true,
      supportsStreamingQuotes: true,
      supportsStreamingBars: false,
      supportsStreamingTrades: true,
      maxOrdersPerMinute: 100
    },
    [BrokerType.SCHWAB]: {
      supportedAssetClasses: [AssetClass.US_EQUITY, AssetClass.OPTIONS],
      supportedOrderTypes: ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop'] as any,
      supportedTimeInForce: ['day', 'gtc', 'ioc', 'fok'] as any,
      supportsExtendedHours: true,
      supportsFractionalShares: true,
      supportsShortSelling: true,
      supportsMarginTrading: true,
      supportsOptionsTrading: true,
      supportsCryptoTrading: false,
      supportsForexTrading: false,
      supportsPaperTrading: false,
      supportsWebSocket: true,
      supportsStreamingQuotes: true,
      supportsStreamingBars: true,
      supportsStreamingTrades: true,
      maxOrdersPerMinute: 120
    }
  };

  constructor() {
    this.brokerFactory = new BrokerFactory();
  }

  /**
   * Register a connected broker adapter
   */
  registerBroker(brokerType: BrokerType, adapter: IBrokerAdapter): void {
    this.connectedBrokers.set(brokerType, adapter);
    this.brokerHealth.set(brokerType, {
      brokerType,
      isConnected: true,
      isHealthy: true,
      lastChecked: new Date()
    });
  }

  /**
   * Unregister a broker adapter
   */
  unregisterBroker(brokerType: BrokerType): void {
    this.connectedBrokers.delete(brokerType);
    this.brokerHealth.delete(brokerType);
  }

  /**
   * Update broker health status
   */
  updateBrokerHealth(brokerType: BrokerType, health: Partial<BrokerHealth>): void {
    const existing = this.brokerHealth.get(brokerType);
    if (existing) {
      this.brokerHealth.set(brokerType, {
        ...existing,
        ...health,
        lastChecked: new Date()
      });
    }
  }

  /**
   * Get all connected brokers
   */
  getConnectedBrokers(): BrokerType[] {
    return Array.from(this.connectedBrokers.keys());
  }

  /**
   * Check if a broker supports an asset class
   */
  brokerSupportsAsset(brokerType: BrokerType, assetClass: AssetClass): boolean {
    const capabilities = OrderRouter.BROKER_CAPABILITIES[brokerType];
    return capabilities?.supportedAssetClasses.includes(assetClass) ?? false;
  }

  /**
   * Get broker capabilities
   */
  getBrokerCapabilities(brokerType: BrokerType): BrokerCapabilities | undefined {
    return OrderRouter.BROKER_CAPABILITIES[brokerType];
  }

  /**
   * Select the best broker for an order
   */
  selectBroker(
    symbol: string, 
    preferences: RoutingPreferences = { enableSmartRouting: true, prioritizeLowFees: false, prioritizeFastExecution: false, allowFallback: true }
  ): RoutingDecision {
    const assetClass = detectAssetClass(symbol);
    const connectedBrokers = this.getConnectedBrokers();
    
    // If no brokers connected, throw error
    if (connectedBrokers.length === 0) {
      throw new BrokerError(
        BrokerErrorCode.CONNECTION_ERROR,
        'No brokers connected. Please connect a broker first.',
        BrokerType.ALPACA
      );
    }

    // Get user's preferred broker for this asset class
    let preferredBroker: BrokerType | undefined;
    switch (assetClass) {
      case AssetClass.US_EQUITY:
        preferredBroker = preferences.preferredStockBroker;
        break;
      case AssetClass.CRYPTO:
        preferredBroker = preferences.preferredCryptoBroker;
        break;
      case AssetClass.FOREX:
        preferredBroker = preferences.preferredForexBroker;
        break;
      case AssetClass.OPTIONS:
        preferredBroker = preferences.preferredOptionsBroker;
        break;
    }

    // Check if preferred broker is connected and supports the asset
    if (preferredBroker && 
        connectedBrokers.includes(preferredBroker) && 
        this.brokerSupportsAsset(preferredBroker, assetClass)) {
      const health = this.brokerHealth.get(preferredBroker);
      if (health?.isHealthy) {
        return {
          selectedBroker: preferredBroker,
          reason: `User preferred broker for ${assetClass}`,
          alternatives: this.getAlternativeBrokers(assetClass, preferredBroker, connectedBrokers),
          confidence: 95
        };
      }
    }

    // Smart routing: find the best available broker
    if (preferences.enableSmartRouting) {
      const priorityList = OrderRouter.BROKER_PRIORITIES[assetClass] || [];
      
      for (const broker of priorityList) {
        if (connectedBrokers.includes(broker) && this.brokerSupportsAsset(broker, assetClass)) {
          const health = this.brokerHealth.get(broker);
          if (health?.isHealthy) {
            return {
              selectedBroker: broker,
              reason: `Best available broker for ${assetClass} (smart routing)`,
              alternatives: this.getAlternativeBrokers(assetClass, broker, connectedBrokers),
              confidence: 90
            };
          }
        }
      }
    }

    // Fallback: find any broker that supports the asset
    if (preferences.allowFallback) {
      for (const broker of connectedBrokers) {
        if (this.brokerSupportsAsset(broker, assetClass)) {
          const health = this.brokerHealth.get(broker);
          if (health?.isHealthy) {
            return {
              selectedBroker: broker,
              reason: `Fallback broker for ${assetClass}`,
              alternatives: [],
              confidence: 70
            };
          }
        }
      }
    }

    // No suitable broker found
    throw new BrokerError(
      BrokerErrorCode.INVALID_ORDER,
      `No connected broker supports ${assetClass}. Symbol: ${symbol}`,
      BrokerType.ALPACA
    );
  }

  /**
   * Get alternative brokers for an asset class
   */
  private getAlternativeBrokers(
    assetClass: AssetClass, 
    excludeBroker: BrokerType, 
    connectedBrokers: BrokerType[]
  ): BrokerType[] {
    return connectedBrokers.filter(broker => 
      broker !== excludeBroker && 
      this.brokerSupportsAsset(broker, assetClass) &&
      this.brokerHealth.get(broker)?.isHealthy
    );
  }

  /**
   * Route and execute an order
   */
  async routeOrder(
    order: UnifiedOrder,
    preferences: RoutingPreferences = { enableSmartRouting: true, prioritizeLowFees: false, prioritizeFastExecution: false, allowFallback: true }
  ): Promise<RoutedOrderResult> {
    const startTime = Date.now();
    
    // Select the best broker
    const routingDecision = this.selectBroker(order.symbol, preferences);
    
    // Get the broker adapter
    const adapter = this.connectedBrokers.get(routingDecision.selectedBroker);
    if (!adapter) {
      throw new BrokerError(
        BrokerErrorCode.CONNECTION_ERROR,
        `Broker ${routingDecision.selectedBroker} is not connected`,
        routingDecision.selectedBroker
      );
    }

    try {
      // Execute the order
      const orderResponse = await adapter.placeOrder(order);
      
      // Update broker health on success
      this.updateBrokerHealth(routingDecision.selectedBroker, {
        isHealthy: true,
        lastResponseTime: Date.now() - startTime
      });

      return {
        order: orderResponse,
        routingDecision,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      // Update broker health on failure
      this.updateBrokerHealth(routingDecision.selectedBroker, {
        isHealthy: false,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      });

      // Try fallback if enabled
      if (preferences.allowFallback && routingDecision.alternatives.length > 0) {
        const fallbackBroker = routingDecision.alternatives[0];
        const fallbackAdapter = this.connectedBrokers.get(fallbackBroker);
        
        if (fallbackAdapter) {
          const orderResponse = await fallbackAdapter.placeOrder(order);
          return {
            order: orderResponse,
            routingDecision: {
              ...routingDecision,
              selectedBroker: fallbackBroker,
              reason: `Fallback after ${routingDecision.selectedBroker} failed`
            },
            executionTime: Date.now() - startTime
          };
        }
      }

      throw error;
    }
  }

  /**
   * Get routing recommendation without executing
   */
  getRoutingRecommendation(
    symbol: string,
    preferences?: RoutingPreferences
  ): RoutingDecision {
    return this.selectBroker(symbol, preferences);
  }

  /**
   * Get all broker health statuses
   */
  getAllBrokerHealth(): BrokerHealth[] {
    return Array.from(this.brokerHealth.values());
  }

  /**
   * Check health of all connected brokers
   */
  async checkAllBrokerHealth(): Promise<BrokerHealth[]> {
    const healthChecks = Array.from(this.connectedBrokers.entries()).map(
      async ([brokerType, adapter]) => {
        const startTime = Date.now();
        try {
          await adapter.getAccounts();
          this.updateBrokerHealth(brokerType, {
            isConnected: true,
            isHealthy: true,
            lastResponseTime: Date.now() - startTime
          });
        } catch (error) {
          this.updateBrokerHealth(brokerType, {
            isConnected: false,
            isHealthy: false,
            lastError: error instanceof Error ? error.message : 'Unknown error'
          });
        }
        return this.brokerHealth.get(brokerType)!;
      }
    );

    return Promise.all(healthChecks);
  }

  /**
   * Get supported asset classes for connected brokers
   */
  getSupportedAssetClasses(): AssetClass[] {
    const assetClasses = new Set<AssetClass>();
    
    const brokerTypes = Array.from(this.connectedBrokers.keys());
    for (const brokerType of brokerTypes) {
      const capabilities = OrderRouter.BROKER_CAPABILITIES[brokerType];
      if (capabilities) {
        capabilities.supportedAssetClasses.forEach((ac: AssetClass) => assetClasses.add(ac));
      }
    }
    
    return Array.from(assetClasses);
  }

  /**
   * Get brokers that support a specific asset class
   */
  getBrokersForAssetClass(assetClass: AssetClass): BrokerType[] {
    return Array.from(this.connectedBrokers.keys()).filter(
      broker => this.brokerSupportsAsset(broker, assetClass)
    );
  }
}

// Export singleton instance
export const orderRouter = new OrderRouter();
