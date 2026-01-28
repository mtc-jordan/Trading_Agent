/**
 * Broker Capabilities Configuration
 * 
 * Defines what each broker supports in terms of asset classes,
 * order types, trading hours, and other features.
 */

import { AssetClass } from '../client/src/contexts/AssetClassContext';

export type BrokerType = 'alpaca' | 'interactive_brokers' | 'binance' | 'coinbase' | 'schwab' | 'robinhood' | 'td_ameritrade';

export interface TradingHours {
  timezone: string;
  regularHours: { open: string; close: string };
  extendedHours?: { preMarket: { open: string; close: string }; afterHours: { open: string; close: string } };
  is24x7?: boolean;
}

export interface AssetClassCapability {
  supported: boolean;
  orderTypes: ('market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop')[];
  tradingHours: TradingHours;
  marginEnabled?: boolean;
  shortSellingEnabled?: boolean;
  fractionalShares?: boolean;
  minOrderSize?: number;
  maxOrderSize?: number;
  commissionStructure?: {
    type: 'free' | 'per_trade' | 'per_share' | 'percentage';
    amount?: number;
  };
}

export interface BrokerCapabilities {
  brokerType: BrokerType;
  name: string;
  description: string;
  logoUrl: string;
  websiteUrl: string;
  
  // Asset class support
  assetClasses: {
    stocks: AssetClassCapability;
    crypto: AssetClassCapability;
    options: AssetClassCapability;
  };
  
  // Account features
  paperTradingAvailable: boolean;
  apiAccessAvailable: boolean;
  oauthSupported: boolean;
  
  // Data features
  realTimeDataAvailable: boolean;
  historicalDataAvailable: boolean;
  level2DataAvailable: boolean;
  
  // Integration status
  integrationStatus: 'active' | 'beta' | 'coming_soon' | 'deprecated';
  
  // Regional availability
  supportedRegions: string[];
}

// US Stock Market Trading Hours
const US_STOCK_HOURS: TradingHours = {
  timezone: 'America/New_York',
  regularHours: { open: '09:30', close: '16:00' },
  extendedHours: {
    preMarket: { open: '04:00', close: '09:30' },
    afterHours: { open: '16:00', close: '20:00' }
  }
};

// 24/7 Crypto Trading Hours
const CRYPTO_24_7_HOURS: TradingHours = {
  timezone: 'UTC',
  regularHours: { open: '00:00', close: '23:59' },
  is24x7: true
};

// US Options Market Hours
const US_OPTIONS_HOURS: TradingHours = {
  timezone: 'America/New_York',
  regularHours: { open: '09:30', close: '16:00' }
};

/**
 * Broker Capabilities Registry
 * 
 * Comprehensive definition of each broker's capabilities
 */
export const BROKER_CAPABILITIES: Record<BrokerType, BrokerCapabilities> = {
  alpaca: {
    brokerType: 'alpaca',
    name: 'Alpaca',
    description: 'Commission-free stock, crypto, and options trading with powerful API',
    logoUrl: '/brokers/alpaca.svg',
    websiteUrl: 'https://alpaca.markets',
    assetClasses: {
      stocks: {
        supported: true,
        orderTypes: ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop'],
        tradingHours: US_STOCK_HOURS,
        marginEnabled: true,
        shortSellingEnabled: true,
        fractionalShares: true,
        commissionStructure: { type: 'free' }
      },
      crypto: {
        supported: true,
        orderTypes: ['market', 'limit', 'stop', 'stop_limit'],
        tradingHours: CRYPTO_24_7_HOURS,
        marginEnabled: false,
        fractionalShares: true,
        commissionStructure: { type: 'percentage', amount: 0.0025 } // 0.25%
      },
      options: {
        supported: true,
        orderTypes: ['market', 'limit'],
        tradingHours: US_OPTIONS_HOURS,
        marginEnabled: true,
        commissionStructure: { type: 'free' }
      }
    },
    paperTradingAvailable: true,
    apiAccessAvailable: true,
    oauthSupported: true,
    realTimeDataAvailable: true,
    historicalDataAvailable: true,
    level2DataAvailable: false,
    integrationStatus: 'active',
    supportedRegions: ['US']
  },

  interactive_brokers: {
    brokerType: 'interactive_brokers',
    name: 'Interactive Brokers',
    description: 'Professional trading platform with global market access and low commissions',
    logoUrl: '/brokers/ibkr.svg',
    websiteUrl: 'https://www.interactivebrokers.com',
    assetClasses: {
      stocks: {
        supported: true,
        orderTypes: ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop'],
        tradingHours: US_STOCK_HOURS,
        marginEnabled: true,
        shortSellingEnabled: true,
        fractionalShares: true,
        commissionStructure: { type: 'per_share', amount: 0.005 }
      },
      crypto: {
        supported: true,
        orderTypes: ['market', 'limit'],
        tradingHours: CRYPTO_24_7_HOURS,
        marginEnabled: false,
        fractionalShares: true,
        commissionStructure: { type: 'percentage', amount: 0.0018 }
      },
      options: {
        supported: true,
        orderTypes: ['market', 'limit', 'stop', 'stop_limit'],
        tradingHours: US_OPTIONS_HOURS,
        marginEnabled: true,
        commissionStructure: { type: 'per_trade', amount: 0.65 }
      }
    },
    paperTradingAvailable: true,
    apiAccessAvailable: true,
    oauthSupported: false,
    realTimeDataAvailable: true,
    historicalDataAvailable: true,
    level2DataAvailable: true,
    integrationStatus: 'coming_soon',
    supportedRegions: ['US', 'EU', 'UK', 'CA', 'AU', 'HK', 'SG', 'JP']
  },

  binance: {
    brokerType: 'binance',
    name: 'Binance',
    description: 'World\'s largest cryptocurrency exchange by trading volume',
    logoUrl: '/brokers/binance.svg',
    websiteUrl: 'https://www.binance.com',
    assetClasses: {
      stocks: {
        supported: false,
        orderTypes: [],
        tradingHours: US_STOCK_HOURS
      },
      crypto: {
        supported: true,
        orderTypes: ['market', 'limit', 'stop', 'stop_limit'],
        tradingHours: CRYPTO_24_7_HOURS,
        marginEnabled: true,
        fractionalShares: true,
        commissionStructure: { type: 'percentage', amount: 0.001 }
      },
      options: {
        supported: false,
        orderTypes: [],
        tradingHours: US_OPTIONS_HOURS
      }
    },
    paperTradingAvailable: true,
    apiAccessAvailable: true,
    oauthSupported: false,
    realTimeDataAvailable: true,
    historicalDataAvailable: true,
    level2DataAvailable: true,
    integrationStatus: 'coming_soon',
    supportedRegions: ['GLOBAL'] // Except US
  },

  coinbase: {
    brokerType: 'coinbase',
    name: 'Coinbase',
    description: 'US-regulated cryptocurrency exchange with institutional-grade security',
    logoUrl: '/brokers/coinbase.svg',
    websiteUrl: 'https://www.coinbase.com',
    assetClasses: {
      stocks: {
        supported: false,
        orderTypes: [],
        tradingHours: US_STOCK_HOURS
      },
      crypto: {
        supported: true,
        orderTypes: ['market', 'limit', 'stop'],
        tradingHours: CRYPTO_24_7_HOURS,
        marginEnabled: false,
        fractionalShares: true,
        commissionStructure: { type: 'percentage', amount: 0.006 }
      },
      options: {
        supported: false,
        orderTypes: [],
        tradingHours: US_OPTIONS_HOURS
      }
    },
    paperTradingAvailable: false,
    apiAccessAvailable: true,
    oauthSupported: true,
    realTimeDataAvailable: true,
    historicalDataAvailable: true,
    level2DataAvailable: true,
    integrationStatus: 'coming_soon',
    supportedRegions: ['US', 'EU', 'UK', 'CA', 'AU', 'SG']
  },

  schwab: {
    brokerType: 'schwab',
    name: 'Charles Schwab',
    description: 'Full-service brokerage with comprehensive investment options',
    logoUrl: '/brokers/schwab.svg',
    websiteUrl: 'https://www.schwab.com',
    assetClasses: {
      stocks: {
        supported: true,
        orderTypes: ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop'],
        tradingHours: US_STOCK_HOURS,
        marginEnabled: true,
        shortSellingEnabled: true,
        fractionalShares: true,
        commissionStructure: { type: 'free' }
      },
      crypto: {
        supported: false,
        orderTypes: [],
        tradingHours: CRYPTO_24_7_HOURS
      },
      options: {
        supported: true,
        orderTypes: ['market', 'limit', 'stop', 'stop_limit'],
        tradingHours: US_OPTIONS_HOURS,
        marginEnabled: true,
        commissionStructure: { type: 'per_trade', amount: 0.65 }
      }
    },
    paperTradingAvailable: false,
    apiAccessAvailable: true,
    oauthSupported: true,
    realTimeDataAvailable: true,
    historicalDataAvailable: true,
    level2DataAvailable: false,
    integrationStatus: 'coming_soon',
    supportedRegions: ['US']
  },

  robinhood: {
    brokerType: 'robinhood',
    name: 'Robinhood',
    description: 'Commission-free trading for stocks, ETFs, options, and crypto',
    logoUrl: '/brokers/robinhood.svg',
    websiteUrl: 'https://robinhood.com',
    assetClasses: {
      stocks: {
        supported: true,
        orderTypes: ['market', 'limit', 'stop', 'stop_limit'],
        tradingHours: US_STOCK_HOURS,
        marginEnabled: true,
        shortSellingEnabled: false,
        fractionalShares: true,
        commissionStructure: { type: 'free' }
      },
      crypto: {
        supported: true,
        orderTypes: ['market', 'limit'],
        tradingHours: CRYPTO_24_7_HOURS,
        marginEnabled: false,
        fractionalShares: true,
        commissionStructure: { type: 'free' }
      },
      options: {
        supported: true,
        orderTypes: ['market', 'limit'],
        tradingHours: US_OPTIONS_HOURS,
        marginEnabled: false,
        commissionStructure: { type: 'free' }
      }
    },
    paperTradingAvailable: false,
    apiAccessAvailable: false, // Limited API access
    oauthSupported: false,
    realTimeDataAvailable: true,
    historicalDataAvailable: false,
    level2DataAvailable: false,
    integrationStatus: 'coming_soon',
    supportedRegions: ['US']
  },

  td_ameritrade: {
    brokerType: 'td_ameritrade',
    name: 'TD Ameritrade',
    description: 'Full-featured trading platform with thinkorswim integration',
    logoUrl: '/brokers/tda.svg',
    websiteUrl: 'https://www.tdameritrade.com',
    assetClasses: {
      stocks: {
        supported: true,
        orderTypes: ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop'],
        tradingHours: US_STOCK_HOURS,
        marginEnabled: true,
        shortSellingEnabled: true,
        fractionalShares: false,
        commissionStructure: { type: 'free' }
      },
      crypto: {
        supported: false,
        orderTypes: [],
        tradingHours: CRYPTO_24_7_HOURS
      },
      options: {
        supported: true,
        orderTypes: ['market', 'limit', 'stop', 'stop_limit'],
        tradingHours: US_OPTIONS_HOURS,
        marginEnabled: true,
        commissionStructure: { type: 'per_trade', amount: 0.65 }
      }
    },
    paperTradingAvailable: true,
    apiAccessAvailable: true,
    oauthSupported: true,
    realTimeDataAvailable: true,
    historicalDataAvailable: true,
    level2DataAvailable: true,
    integrationStatus: 'coming_soon',
    supportedRegions: ['US']
  }
};

/**
 * Helper Functions
 */

// Get brokers that support a specific asset class
export function getBrokersForAssetClass(assetClass: AssetClass): BrokerCapabilities[] {
  return Object.values(BROKER_CAPABILITIES).filter(
    broker => broker.assetClasses[assetClass].supported
  );
}

// Get active (integrated) brokers that support a specific asset class
export function getActiveBrokersForAssetClass(assetClass: AssetClass): BrokerCapabilities[] {
  return Object.values(BROKER_CAPABILITIES).filter(
    broker => broker.assetClasses[assetClass].supported && broker.integrationStatus === 'active'
  );
}

// Check if a broker supports an asset class
export function brokerSupportsAssetClass(brokerType: BrokerType, assetClass: AssetClass): boolean {
  const broker = BROKER_CAPABILITIES[brokerType];
  return broker?.assetClasses[assetClass]?.supported ?? false;
}

// Get all supported asset classes for a broker
export function getBrokerSupportedAssetClasses(brokerType: BrokerType): AssetClass[] {
  const broker = BROKER_CAPABILITIES[brokerType];
  if (!broker) return [];
  
  const supported: AssetClass[] = [];
  if (broker.assetClasses.stocks.supported) supported.push('stocks');
  if (broker.assetClasses.crypto.supported) supported.push('crypto');
  if (broker.assetClasses.options.supported) supported.push('options');
  
  return supported;
}

// Get the best broker for an asset class (based on integration status and features)
export function getBestBrokerForAssetClass(
  assetClass: AssetClass, 
  connectedBrokers: BrokerType[]
): BrokerType | null {
  // First, try to find an active integrated broker that's connected
  for (const brokerType of connectedBrokers) {
    const broker = BROKER_CAPABILITIES[brokerType];
    if (broker?.assetClasses[assetClass].supported && broker.integrationStatus === 'active') {
      return brokerType;
    }
  }
  
  // If no connected broker supports it, return null
  return null;
}

// Get commission info formatted as string
export function getCommissionString(capability: AssetClassCapability): string {
  const commission = capability.commissionStructure;
  if (!commission) return 'N/A';
  
  switch (commission.type) {
    case 'free':
      return 'Commission-free';
    case 'per_trade':
      return `$${commission.amount} per trade`;
    case 'per_share':
      return `$${commission.amount} per share`;
    case 'percentage':
      return `${(commission.amount! * 100).toFixed(2)}%`;
    default:
      return 'N/A';
  }
}

// Get trading hours formatted as string
export function getTradingHoursString(hours: TradingHours): string {
  if (hours.is24x7) return '24/7';
  return `${hours.regularHours.open} - ${hours.regularHours.close} ${hours.timezone}`;
}
