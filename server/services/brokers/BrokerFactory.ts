/**
 * Broker Factory and Manager
 * 
 * Provides a unified interface for creating and managing broker adapters.
 * Implements the Factory pattern for broker instantiation and manages
 * broker connections across the application.
 */

import { IBrokerAdapter } from './IBrokerAdapter';
import { AlpacaAdapter } from './AlpacaAdapter';
import { IBKRAdapter } from './IBKRAdapter';
import {
  BrokerType,
  BrokerCredentials,
  BrokerInfo,
  BrokerCapabilities,
  AssetClass,
  OrderType,
  TimeInForce
} from './types';

// ============================================================================
// Broker Configuration
// ============================================================================

interface BrokerConfig {
  alpaca?: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  ibkr?: {
    consumerKey: string;
    privateKey: string;
    realm: string;
    redirectUri: string;
  };
}

// ============================================================================
// Broker Registry
// ============================================================================

export const BROKER_INFO: Record<BrokerType, BrokerInfo> = {
  [BrokerType.ALPACA]: {
    type: BrokerType.ALPACA,
    name: 'Alpaca',
    description: 'Commission-free stock and crypto trading API with paper trading support',
    logoUrl: '/brokers/alpaca.svg',
    websiteUrl: 'https://alpaca.markets',
    documentationUrl: 'https://docs.alpaca.markets',
    capabilities: {
      supportedAssetClasses: [AssetClass.US_EQUITY, AssetClass.CRYPTO],
      supportedOrderTypes: [
        OrderType.MARKET,
        OrderType.LIMIT,
        OrderType.STOP,
        OrderType.STOP_LIMIT,
        OrderType.TRAILING_STOP
      ],
      supportedTimeInForce: [
        TimeInForce.DAY,
        TimeInForce.GTC,
        TimeInForce.IOC,
        TimeInForce.FOK
      ],
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
    authType: 'oauth2',
    requiresApproval: false,
    supportedRegions: ['US']
  },
  [BrokerType.INTERACTIVE_BROKERS]: {
    type: BrokerType.INTERACTIVE_BROKERS,
    name: 'Interactive Brokers',
    description: 'Professional-grade trading platform with global market access',
    logoUrl: '/brokers/ibkr.svg',
    websiteUrl: 'https://www.interactivebrokers.com',
    documentationUrl: 'https://www.interactivebrokers.com/campus/ibkr-api-page/',
    capabilities: {
      supportedAssetClasses: [
        AssetClass.US_EQUITY,
        AssetClass.OPTIONS,
        AssetClass.FUTURES,
        AssetClass.FOREX,
        AssetClass.CRYPTO
      ],
      supportedOrderTypes: [
        OrderType.MARKET,
        OrderType.LIMIT,
        OrderType.STOP,
        OrderType.STOP_LIMIT,
        OrderType.TRAILING_STOP
      ],
      supportedTimeInForce: [
        TimeInForce.DAY,
        TimeInForce.GTC,
        TimeInForce.IOC,
        TimeInForce.FOK
      ],
      supportsExtendedHours: true,
      supportsFractionalShares: false,
      supportsShortSelling: true,
      supportsMarginTrading: true,
      supportsOptionsTrading: true,
      supportsCryptoTrading: true,
      supportsForexTrading: true,
      supportsPaperTrading: true,
      supportsWebSocket: true,
      supportsStreamingQuotes: true,
      supportsStreamingBars: true,
      supportsStreamingTrades: true,
      maxOrdersPerMinute: 50
    },
    authType: 'oauth1',
    requiresApproval: true,
    approvalUrl: 'https://www.interactivebrokers.com/en/trading/ib-api.php',
    supportedRegions: ['US', 'EU', 'APAC']
  },
  [BrokerType.BINANCE]: {
    type: BrokerType.BINANCE,
    name: 'Binance',
    description: 'World\'s largest cryptocurrency exchange by trading volume',
    logoUrl: '/brokers/binance.svg',
    websiteUrl: 'https://www.binance.com',
    documentationUrl: 'https://binance-docs.github.io/apidocs/',
    capabilities: {
      supportedAssetClasses: [AssetClass.CRYPTO],
      supportedOrderTypes: [
        OrderType.MARKET,
        OrderType.LIMIT,
        OrderType.STOP,
        OrderType.STOP_LIMIT
      ],
      supportedTimeInForce: [
        TimeInForce.GTC,
        TimeInForce.IOC,
        TimeInForce.FOK
      ],
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
      maxOrdersPerMinute: 1200
    },
    authType: 'api_key',
    requiresApproval: false,
    supportedRegions: ['GLOBAL']
  },
  [BrokerType.COINBASE]: {
    type: BrokerType.COINBASE,
    name: 'Coinbase',
    description: 'US-regulated cryptocurrency exchange with advanced trading features',
    logoUrl: '/brokers/coinbase.svg',
    websiteUrl: 'https://www.coinbase.com',
    documentationUrl: 'https://docs.cloud.coinbase.com/',
    capabilities: {
      supportedAssetClasses: [AssetClass.CRYPTO],
      supportedOrderTypes: [
        OrderType.MARKET,
        OrderType.LIMIT,
        OrderType.STOP
      ],
      supportedTimeInForce: [
        TimeInForce.GTC,
        TimeInForce.IOC,
        TimeInForce.FOK
      ],
      supportsExtendedHours: true,
      supportsFractionalShares: true,
      supportsShortSelling: false,
      supportsMarginTrading: false,
      supportsOptionsTrading: false,
      supportsCryptoTrading: true,
      supportsForexTrading: false,
      supportsPaperTrading: true,
      supportsWebSocket: true,
      supportsStreamingQuotes: true,
      supportsStreamingBars: true,
      supportsStreamingTrades: true,
      maxOrdersPerMinute: 30
    },
    authType: 'oauth2',
    requiresApproval: false,
    supportedRegions: ['US']
  }
};

// ============================================================================
// Broker Factory
// ============================================================================

export class BrokerFactory {
  private config: BrokerConfig;
  
  constructor(config: BrokerConfig = {}) {
    this.config = config;
  }
  
  /**
   * Create a broker adapter instance
   */
  createAdapter(brokerType: BrokerType, isPaper: boolean = true): IBrokerAdapter {
    switch (brokerType) {
      case BrokerType.ALPACA:
        if (!this.config.alpaca) {
          throw new Error('Alpaca configuration not provided');
        }
        return new AlpacaAdapter({
          ...this.config.alpaca,
          isPaper
        });
        
      case BrokerType.INTERACTIVE_BROKERS:
        if (!this.config.ibkr) {
          throw new Error('Interactive Brokers configuration not provided');
        }
        return new IBKRAdapter({
          ...this.config.ibkr,
          isPaper
        });
        
      case BrokerType.BINANCE:
        // Placeholder for future implementation
        throw new Error('Binance adapter not yet implemented');
        
      case BrokerType.COINBASE:
        // Placeholder for future implementation
        throw new Error('Coinbase adapter not yet implemented');
        
      default:
        throw new Error(`Unknown broker type: ${brokerType}`);
    }
  }
  
  /**
   * Get broker information
   */
  getBrokerInfo(brokerType: BrokerType): BrokerInfo {
    return BROKER_INFO[brokerType];
  }
  
  /**
   * Get all available brokers
   */
  getAvailableBrokers(): BrokerInfo[] {
    return Object.values(BROKER_INFO);
  }
  
  /**
   * Get brokers that support a specific asset class
   */
  getBrokersByAssetClass(assetClass: AssetClass): BrokerInfo[] {
    return Object.values(BROKER_INFO).filter(
      broker => broker.capabilities.supportedAssetClasses.includes(assetClass)
    );
  }
  
  /**
   * Get brokers that support paper trading
   */
  getPaperTradingBrokers(): BrokerInfo[] {
    return Object.values(BROKER_INFO).filter(
      broker => broker.capabilities.supportsPaperTrading
    );
  }
  
  /**
   * Check if a broker is configured
   */
  isBrokerConfigured(brokerType: BrokerType): boolean {
    switch (brokerType) {
      case BrokerType.ALPACA:
        return !!this.config.alpaca;
      case BrokerType.INTERACTIVE_BROKERS:
        return !!this.config.ibkr;
      default:
        return false;
    }
  }
}

// ============================================================================
// Broker Manager
// ============================================================================

/**
 * Manages active broker connections and provides unified access
 */
export class BrokerManager {
  private factory: BrokerFactory;
  private adapters: Map<string, IBrokerAdapter> = new Map();
  
  constructor(config: BrokerConfig = {}) {
    this.factory = new BrokerFactory(config);
  }
  
  /**
   * Connect to a broker with credentials
   */
  async connect(
    connectionId: string,
    brokerType: BrokerType,
    credentials: BrokerCredentials,
    isPaper: boolean = true
  ): Promise<IBrokerAdapter> {
    const adapter = this.factory.createAdapter(brokerType, isPaper);
    await adapter.initialize(credentials);
    
    // Test the connection
    const isValid = await adapter.testConnection();
    if (!isValid) {
      throw new Error('Failed to connect to broker');
    }
    
    this.adapters.set(connectionId, adapter);
    return adapter;
  }
  
  /**
   * Get an active adapter by connection ID
   */
  getAdapter(connectionId: string): IBrokerAdapter | undefined {
    return this.adapters.get(connectionId);
  }
  
  /**
   * Disconnect a broker connection
   */
  async disconnect(connectionId: string): Promise<void> {
    const adapter = this.adapters.get(connectionId);
    if (adapter) {
      await adapter.disconnect();
      this.adapters.delete(connectionId);
    }
  }
  
  /**
   * Disconnect all broker connections
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.adapters.values()).map(
      adapter => adapter.disconnect()
    );
    await Promise.all(disconnectPromises);
    this.adapters.clear();
  }
  
  /**
   * Get all active connections
   */
  getActiveConnections(): string[] {
    return Array.from(this.adapters.keys());
  }
  
  /**
   * Check if a connection is active
   */
  isConnected(connectionId: string): boolean {
    const adapter = this.adapters.get(connectionId);
    return adapter?.isConnected() ?? false;
  }
  
  /**
   * Get broker factory for creating new adapters
   */
  getFactory(): BrokerFactory {
    return this.factory;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let brokerManager: BrokerManager | null = null;

export function getBrokerManager(config?: BrokerConfig): BrokerManager {
  if (!brokerManager) {
    brokerManager = new BrokerManager(config);
  }
  return brokerManager;
}

export function resetBrokerManager(): void {
  if (brokerManager) {
    brokerManager.disconnectAll();
    brokerManager = null;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get OAuth authorization URL for a broker
 */
export function getOAuthUrl(
  brokerType: BrokerType,
  state: string,
  isPaper: boolean = true,
  config: BrokerConfig
): string {
  const factory = new BrokerFactory(config);
  const adapter = factory.createAdapter(brokerType, isPaper);
  return adapter.getAuthorizationUrl(state, isPaper);
}

/**
 * Compare broker capabilities
 */
export function compareBrokerCapabilities(
  broker1: BrokerType,
  broker2: BrokerType
): {
  broker1Only: string[];
  broker2Only: string[];
  shared: string[];
} {
  const cap1 = BROKER_INFO[broker1].capabilities;
  const cap2 = BROKER_INFO[broker2].capabilities;
  
  const features1 = new Set<string>();
  const features2 = new Set<string>();
  
  // Extract boolean features
  Object.entries(cap1).forEach(([key, value]) => {
    if (typeof value === 'boolean' && value) features1.add(key);
  });
  Object.entries(cap2).forEach(([key, value]) => {
    if (typeof value === 'boolean' && value) features2.add(key);
  });
  
  const broker1Only = Array.from(features1).filter(f => !features2.has(f));
  const broker2Only = Array.from(features2).filter(f => !features1.has(f));
  const shared = Array.from(features1).filter(f => features2.has(f));
  
  return { broker1Only, broker2Only, shared };
}

/**
 * Find the best broker for a specific use case
 */
export function findBestBroker(requirements: {
  assetClass?: AssetClass;
  needsOptions?: boolean;
  needsFractional?: boolean;
  needsPaperTrading?: boolean;
  preferLowLatency?: boolean;
}): BrokerType | null {
  const brokers = Object.values(BROKER_INFO);
  
  const filtered = brokers.filter(broker => {
    const cap = broker.capabilities;
    
    if (requirements.assetClass && !cap.supportedAssetClasses.includes(requirements.assetClass)) {
      return false;
    }
    if (requirements.needsOptions && !cap.supportsOptionsTrading) {
      return false;
    }
    if (requirements.needsFractional && !cap.supportsFractionalShares) {
      return false;
    }
    if (requirements.needsPaperTrading && !cap.supportsPaperTrading) {
      return false;
    }
    
    return true;
  });
  
  if (filtered.length === 0) return null;
  
  // Sort by preference
  filtered.sort((a, b) => {
    // Prefer brokers with more asset classes
    const assetDiff = b.capabilities.supportedAssetClasses.length - 
                      a.capabilities.supportedAssetClasses.length;
    if (assetDiff !== 0) return assetDiff;
    
    // Prefer brokers with higher rate limits
    const rateDiff = (b.capabilities.maxOrdersPerMinute || 0) - 
                     (a.capabilities.maxOrdersPerMinute || 0);
    if (rateDiff !== 0) return rateDiff;
    
    // Prefer brokers that don't require approval
    if (!a.requiresApproval && b.requiresApproval) return -1;
    if (a.requiresApproval && !b.requiresApproval) return 1;
    
    return 0;
  });
  
  return filtered[0].type;
}
