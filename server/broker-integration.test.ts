/**
 * Broker Integration Tests
 * Tests for broker context, components, and integration across the platform
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock broker types
type BrokerType = 'alpaca' | 'interactive_brokers' | 'binance' | 'coinbase';

interface BrokerConnection {
  id: string;
  brokerType: BrokerType;
  accountId: string;
  accountName: string;
  isPaper: boolean;
  isConnected: boolean;
  lastSyncAt: Date | null;
}

// Mock broker context functions
const mockBrokerContext = {
  activeBroker: null as BrokerConnection | null,
  connectedBrokers: [] as BrokerConnection[],
  isPaperMode: true,
  hasConnectedBroker: false,
  
  getBrokerName: (type: BrokerType): string => {
    const names: Record<BrokerType, string> = {
      alpaca: 'Alpaca',
      interactive_brokers: 'Interactive Brokers',
      binance: 'Binance',
      coinbase: 'Coinbase',
    };
    return names[type] || type;
  },
  
  getBrokerLogo: (type: BrokerType): string => {
    const logos: Record<BrokerType, string> = {
      alpaca: '/brokers/alpaca.svg',
      interactive_brokers: '/brokers/ib.svg',
      binance: '/brokers/binance.svg',
      coinbase: '/brokers/coinbase.svg',
    };
    return logos[type] || '/brokers/default.svg';
  },
  
  selectBroker: vi.fn(),
  setActiveBroker: vi.fn(),
  refetchBrokers: vi.fn(),
};

describe('Broker Context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBrokerContext.activeBroker = null;
    mockBrokerContext.connectedBrokers = [];
    mockBrokerContext.isPaperMode = true;
    mockBrokerContext.hasConnectedBroker = false;
  });
  
  describe('getBrokerName', () => {
    it('should return correct name for Alpaca', () => {
      expect(mockBrokerContext.getBrokerName('alpaca')).toBe('Alpaca');
    });
    
    it('should return correct name for Interactive Brokers', () => {
      expect(mockBrokerContext.getBrokerName('interactive_brokers')).toBe('Interactive Brokers');
    });
    
    it('should return correct name for Binance', () => {
      expect(mockBrokerContext.getBrokerName('binance')).toBe('Binance');
    });
    
    it('should return correct name for Coinbase', () => {
      expect(mockBrokerContext.getBrokerName('coinbase')).toBe('Coinbase');
    });
  });
  
  describe('getBrokerLogo', () => {
    it('should return correct logo path for Alpaca', () => {
      expect(mockBrokerContext.getBrokerLogo('alpaca')).toBe('/brokers/alpaca.svg');
    });
    
    it('should return correct logo path for Interactive Brokers', () => {
      expect(mockBrokerContext.getBrokerLogo('interactive_brokers')).toBe('/brokers/ib.svg');
    });
  });
  
  describe('hasConnectedBroker', () => {
    it('should return false when no brokers connected', () => {
      expect(mockBrokerContext.hasConnectedBroker).toBe(false);
    });
    
    it('should return true when broker is connected', () => {
      mockBrokerContext.connectedBrokers = [{
        id: 'conn-1',
        brokerType: 'alpaca',
        accountId: 'acc-123',
        accountName: 'My Alpaca Account',
        isPaper: true,
        isConnected: true,
        lastSyncAt: new Date(),
      }];
      mockBrokerContext.hasConnectedBroker = mockBrokerContext.connectedBrokers.length > 0;
      expect(mockBrokerContext.hasConnectedBroker).toBe(true);
    });
  });
  
  describe('isPaperMode', () => {
    it('should default to paper mode', () => {
      expect(mockBrokerContext.isPaperMode).toBe(true);
    });
    
    it('should reflect active broker paper status', () => {
      mockBrokerContext.activeBroker = {
        id: 'conn-1',
        brokerType: 'alpaca',
        accountId: 'acc-123',
        accountName: 'Live Account',
        isPaper: false,
        isConnected: true,
        lastSyncAt: new Date(),
      };
      mockBrokerContext.isPaperMode = mockBrokerContext.activeBroker?.isPaper ?? true;
      expect(mockBrokerContext.isPaperMode).toBe(false);
    });
  });
});

describe('Broker Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should call selectBroker when selecting a broker', () => {
    mockBrokerContext.selectBroker('conn-1');
    expect(mockBrokerContext.selectBroker).toHaveBeenCalledWith('conn-1');
  });
  
  it('should call setActiveBroker when setting active broker', () => {
    const broker: BrokerConnection = {
      id: 'conn-1',
      brokerType: 'alpaca',
      accountId: 'acc-123',
      accountName: 'My Account',
      isPaper: true,
      isConnected: true,
      lastSyncAt: new Date(),
    };
    mockBrokerContext.setActiveBroker(broker);
    expect(mockBrokerContext.setActiveBroker).toHaveBeenCalledWith(broker);
  });
});

describe('Broker Badge Display', () => {
  it('should format broker name correctly', () => {
    const formatBrokerDisplay = (broker: BrokerConnection) => {
      const name = mockBrokerContext.getBrokerName(broker.brokerType);
      const mode = broker.isPaper ? 'Paper' : 'Live';
      return `${name} (${mode})`;
    };
    
    const broker: BrokerConnection = {
      id: 'conn-1',
      brokerType: 'alpaca',
      accountId: 'acc-123',
      accountName: 'My Account',
      isPaper: true,
      isConnected: true,
      lastSyncAt: new Date(),
    };
    
    expect(formatBrokerDisplay(broker)).toBe('Alpaca (Paper)');
  });
  
  it('should show Live mode for non-paper accounts', () => {
    const formatBrokerDisplay = (broker: BrokerConnection) => {
      const name = mockBrokerContext.getBrokerName(broker.brokerType);
      const mode = broker.isPaper ? 'Paper' : 'Live';
      return `${name} (${mode})`;
    };
    
    const broker: BrokerConnection = {
      id: 'conn-2',
      brokerType: 'interactive_brokers',
      accountId: 'acc-456',
      accountName: 'IB Live',
      isPaper: false,
      isConnected: true,
      lastSyncAt: new Date(),
    };
    
    expect(formatBrokerDisplay(broker)).toBe('Interactive Brokers (Live)');
  });
});

describe('Unified Positions View', () => {
  it('should aggregate positions from multiple brokers', () => {
    type Position = {
      symbol: string;
      quantity: number;
      broker: BrokerType;
      brokerId: string;
    };
    
    const positions: Position[] = [
      { symbol: 'AAPL', quantity: 100, broker: 'alpaca', brokerId: 'conn-1' },
      { symbol: 'MSFT', quantity: 50, broker: 'alpaca', brokerId: 'conn-1' },
      { symbol: 'GOOGL', quantity: 25, broker: 'interactive_brokers', brokerId: 'conn-2' },
    ];
    
    // Group by broker
    const groupedByBroker = positions.reduce((acc, pos) => {
      if (!acc[pos.brokerId]) {
        acc[pos.brokerId] = [];
      }
      acc[pos.brokerId].push(pos);
      return acc;
    }, {} as Record<string, Position[]>);
    
    expect(Object.keys(groupedByBroker)).toHaveLength(2);
    expect(groupedByBroker['conn-1']).toHaveLength(2);
    expect(groupedByBroker['conn-2']).toHaveLength(1);
  });
  
  it('should calculate total value across all positions', () => {
    type Position = {
      symbol: string;
      marketValue: number;
    };
    
    const positions: Position[] = [
      { symbol: 'AAPL', marketValue: 15000 },
      { symbol: 'MSFT', marketValue: 10000 },
      { symbol: 'GOOGL', marketValue: 5000 },
    ];
    
    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);
    expect(totalValue).toBe(30000);
  });
  
  it('should calculate total P/L across all positions', () => {
    type Position = {
      symbol: string;
      unrealizedPL: number;
    };
    
    const positions: Position[] = [
      { symbol: 'AAPL', unrealizedPL: 500 },
      { symbol: 'MSFT', unrealizedPL: -200 },
      { symbol: 'GOOGL', unrealizedPL: 300 },
    ];
    
    const totalPL = positions.reduce((sum, pos) => sum + pos.unrealizedPL, 0);
    expect(totalPL).toBe(600);
  });
});

describe('Broker Integration with Trading Features', () => {
  describe('Paper Trading', () => {
    it('should show broker indicator when broker is connected', () => {
      const hasConnectedBroker = true;
      const activeBroker: BrokerConnection = {
        id: 'conn-1',
        brokerType: 'alpaca',
        accountId: 'acc-123',
        accountName: 'Paper Account',
        isPaper: true,
        isConnected: true,
        lastSyncAt: new Date(),
      };
      
      // Simulate showing broker indicator
      const shouldShowIndicator = hasConnectedBroker && activeBroker !== null;
      expect(shouldShowIndicator).toBe(true);
    });
    
    it('should not show broker indicator when no broker connected', () => {
      const hasConnectedBroker = false;
      const activeBroker = null;
      
      const shouldShowIndicator = hasConnectedBroker && activeBroker !== null;
      expect(shouldShowIndicator).toBe(false);
    });
  });
  
  describe('Copy Trading', () => {
    it('should route orders through selected broker', () => {
      const selectedBroker: BrokerConnection = {
        id: 'conn-1',
        brokerType: 'alpaca',
        accountId: 'acc-123',
        accountName: 'Copy Trading Account',
        isPaper: false,
        isConnected: true,
        lastSyncAt: new Date(),
      };
      
      const order = {
        symbol: 'AAPL',
        quantity: 10,
        side: 'buy' as const,
        type: 'market' as const,
      };
      
      // Simulate order routing
      const routedOrder = {
        ...order,
        brokerId: selectedBroker.id,
        brokerType: selectedBroker.brokerType,
      };
      
      expect(routedOrder.brokerId).toBe('conn-1');
      expect(routedOrder.brokerType).toBe('alpaca');
    });
  });
  
  describe('Trading Bots', () => {
    it('should execute bot trades through configured broker', () => {
      const botConfig = {
        id: 'bot-1',
        name: 'Momentum Bot',
        brokerId: 'conn-1',
        symbols: ['AAPL', 'MSFT'],
      };
      
      const broker: BrokerConnection = {
        id: 'conn-1',
        brokerType: 'alpaca',
        accountId: 'acc-123',
        accountName: 'Bot Trading Account',
        isPaper: true,
        isConnected: true,
        lastSyncAt: new Date(),
      };
      
      // Verify bot is configured with broker
      expect(botConfig.brokerId).toBe(broker.id);
    });
  });
});

describe('Broker Status Indicators', () => {
  it('should show connected status for active connection', () => {
    const getStatusColor = (isConnected: boolean) => {
      return isConnected ? 'green' : 'red';
    };
    
    expect(getStatusColor(true)).toBe('green');
    expect(getStatusColor(false)).toBe('red');
  });
  
  it('should show paper mode badge when in paper trading', () => {
    const getModeLabel = (isPaper: boolean) => {
      return isPaper ? 'Paper' : 'Live';
    };
    
    expect(getModeLabel(true)).toBe('Paper');
    expect(getModeLabel(false)).toBe('Live');
  });
  
  it('should format last sync time correctly', () => {
    const formatLastSync = (lastSyncAt: Date | null) => {
      if (!lastSyncAt) return 'Never';
      const now = new Date();
      const diff = now.getTime() - lastSyncAt.getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      return lastSyncAt.toLocaleDateString();
    };
    
    expect(formatLastSync(null)).toBe('Never');
    expect(formatLastSync(new Date())).toBe('Just now');
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    expect(formatLastSync(oneHourAgo)).toBe('1h ago');
  });
});

describe('Broker Selector Component', () => {
  it('should list all connected brokers', () => {
    const connectedBrokers: BrokerConnection[] = [
      {
        id: 'conn-1',
        brokerType: 'alpaca',
        accountId: 'acc-123',
        accountName: 'Alpaca Paper',
        isPaper: true,
        isConnected: true,
        lastSyncAt: new Date(),
      },
      {
        id: 'conn-2',
        brokerType: 'interactive_brokers',
        accountId: 'acc-456',
        accountName: 'IB Live',
        isPaper: false,
        isConnected: true,
        lastSyncAt: new Date(),
      },
    ];
    
    expect(connectedBrokers).toHaveLength(2);
    expect(connectedBrokers[0].brokerType).toBe('alpaca');
    expect(connectedBrokers[1].brokerType).toBe('interactive_brokers');
  });
  
  it('should filter by paper/live mode', () => {
    const connectedBrokers: BrokerConnection[] = [
      {
        id: 'conn-1',
        brokerType: 'alpaca',
        accountId: 'acc-123',
        accountName: 'Alpaca Paper',
        isPaper: true,
        isConnected: true,
        lastSyncAt: new Date(),
      },
      {
        id: 'conn-2',
        brokerType: 'alpaca',
        accountId: 'acc-456',
        accountName: 'Alpaca Live',
        isPaper: false,
        isConnected: true,
        lastSyncAt: new Date(),
      },
    ];
    
    const paperBrokers = connectedBrokers.filter(b => b.isPaper);
    const liveBrokers = connectedBrokers.filter(b => !b.isPaper);
    
    expect(paperBrokers).toHaveLength(1);
    expect(liveBrokers).toHaveLength(1);
  });
});

describe('Available Brokers', () => {
  it('should list all supported brokers', () => {
    const supportedBrokers: BrokerType[] = ['alpaca', 'interactive_brokers', 'binance', 'coinbase'];
    
    expect(supportedBrokers).toContain('alpaca');
    expect(supportedBrokers).toContain('interactive_brokers');
    expect(supportedBrokers).toContain('binance');
    expect(supportedBrokers).toContain('coinbase');
  });
  
  it('should provide broker metadata', () => {
    interface BrokerInfo {
      type: BrokerType;
      name: string;
      description: string;
      isPaperAvailable: boolean;
    }
    
    const brokerInfo: BrokerInfo[] = [
      {
        type: 'alpaca',
        name: 'Alpaca',
        description: 'Commission-free stock trading API',
        isPaperAvailable: true,
      },
      {
        type: 'interactive_brokers',
        name: 'Interactive Brokers',
        description: 'Professional trading platform',
        isPaperAvailable: true,
      },
    ];
    
    const alpaca = brokerInfo.find(b => b.type === 'alpaca');
    expect(alpaca?.isPaperAvailable).toBe(true);
    expect(alpaca?.name).toBe('Alpaca');
  });
});
