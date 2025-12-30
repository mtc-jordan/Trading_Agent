/**
 * Broker Context
 * 
 * Provides global broker state management across the application.
 * Tracks active broker, connected brokers, and broker preferences.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

// Broker types matching the server-side types
export type BrokerType = 'alpaca' | 'interactive_brokers' | 'binance' | 'coinbase' | 'schwab';

export interface BrokerConnection {
  id: string;
  brokerType: BrokerType;
  accountId: string;
  accountName: string;
  isPaper: boolean;
  isConnected: boolean;
  lastSyncAt: Date | null;
}

export interface BrokerInfo {
  type: BrokerType;
  name: string;
  description: string;
  logoUrl: string;
  isConfigured: boolean;
  isPaperAvailable: boolean;
}

interface BrokerContextValue {
  // Active broker state
  activeBroker: BrokerConnection | null;
  setActiveBroker: (broker: BrokerConnection | null) => void;
  
  // Connected brokers
  connectedBrokers: BrokerConnection[];
  isLoadingBrokers: boolean;
  refetchBrokers: () => void;
  
  // Available brokers
  availableBrokers: BrokerInfo[];
  
  // Broker selection
  selectBroker: (connectionId: string) => void;
  
  // Paper trading mode
  isPaperMode: boolean;
  setIsPaperMode: (isPaper: boolean) => void;
  
  // Helper functions
  getBrokerName: (type: BrokerType) => string;
  getBrokerLogo: (type: BrokerType) => string;
  getBrokerColor: (type: BrokerType) => string;
  
  // Connection status
  hasConnectedBroker: boolean;
  
  // Health monitoring
  isHealthCheckRunning: boolean;
  lastHealthCheck: Date | null;
  healthCheckBrokers: () => Promise<void>;
  
  // Aggregated portfolio data
  aggregatedPortfolio: AggregatedPortfolio | null;
  isLoadingAggregatedPortfolio: boolean;
  refreshAggregatedPortfolio: () => void;
}

// Aggregated portfolio types
export interface AggregatedPosition {
  symbol: string;
  totalQuantity: number;
  totalMarketValue: number;
  totalCostBasis: number;
  totalUnrealizedPnL: number;
  totalUnrealizedPnLPercent: number;
  brokerBreakdown: {
    brokerId: string;
    brokerType: BrokerType;
    brokerName: string;
    quantity: number;
    marketValue: number;
    costBasis: number;
    unrealizedPnL: number;
  }[];
}

export interface AggregatedPortfolio {
  totalValue: number;
  totalCash: number;
  totalEquity: number;
  totalUnrealizedPnL: number;
  totalUnrealizedPnLPercent: number;
  positions: AggregatedPosition[];
  brokerSummaries: {
    brokerId: string;
    brokerType: BrokerType;
    brokerName: string;
    totalValue: number;
    cash: number;
    equity: number;
    unrealizedPnL: number;
    positionCount: number;
    isConnected: boolean;
  }[];
  lastUpdated: Date;
}

const BrokerContext = createContext<BrokerContextValue | undefined>(undefined);

// Broker metadata
const BROKER_METADATA: Record<BrokerType, { name: string; logo: string; color: string }> = {
  alpaca: {
    name: 'Alpaca',
    logo: '/brokers/alpaca.svg',
    color: '#FFEB3B'
  },
  interactive_brokers: {
    name: 'Interactive Brokers',
    logo: '/brokers/ibkr.svg',
    color: '#D32F2F'
  },
  binance: {
    name: 'Binance',
    logo: '/brokers/binance.svg',
    color: '#F3BA2F'
  },
  coinbase: {
    name: 'Coinbase',
    logo: '/brokers/coinbase.svg',
    color: '#0052FF'
  },
  schwab: {
    name: 'Charles Schwab',
    logo: '/brokers/schwab.svg',
    color: '#00A0DF'
  }
};

// Available brokers info
const AVAILABLE_BROKERS: BrokerInfo[] = [
  {
    type: 'alpaca',
    name: 'Alpaca',
    description: 'Commission-free stock and crypto trading with paper trading support',
    logoUrl: '/brokers/alpaca.svg',
    isConfigured: true,
    isPaperAvailable: true
  },
  {
    type: 'interactive_brokers',
    name: 'Interactive Brokers',
    description: 'Professional trading platform with global market access',
    logoUrl: '/brokers/ibkr.svg',
    isConfigured: true,
    isPaperAvailable: true
  },
  {
    type: 'binance',
    name: 'Binance',
    description: 'World\'s largest cryptocurrency exchange',
    logoUrl: '/brokers/binance.svg',
    isConfigured: false,
    isPaperAvailable: true
  },
  {
    type: 'coinbase',
    name: 'Coinbase',
    description: 'US-regulated cryptocurrency exchange',
    logoUrl: '/brokers/coinbase.svg',
    isConfigured: false,
    isPaperAvailable: true
  }
];

interface BrokerProviderProps {
  children: ReactNode;
}

// Health check interval in milliseconds (30 seconds)
const HEALTH_CHECK_INTERVAL = 30000;

export function BrokerProvider({ children }: BrokerProviderProps) {
  const [activeBroker, setActiveBrokerState] = useState<BrokerConnection | null>(null);
  const [isPaperMode, setIsPaperMode] = useState(true);
  const [isHealthCheckRunning, setIsHealthCheckRunning] = useState(false);
  const [lastHealthCheck, setLastHealthCheck] = useState<Date | null>(null);
  const [aggregatedPortfolio, setAggregatedPortfolio] = useState<AggregatedPortfolio | null>(null);
  const [isLoadingAggregatedPortfolio, setIsLoadingAggregatedPortfolio] = useState(false);
  
  // Track previous connection states for notifications
  const previousConnectionStates = useRef<Map<string, boolean>>(new Map());
  const isInitialLoad = useRef(true);
  
  // Fetch connected brokers from API
  const { 
    data: connectionsData, 
    isLoading: isLoadingBrokers,
    refetch: refetchBrokers 
  } = trpc.broker.getConnections.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false
  });
  
  // Transform API data to BrokerConnection format - memoized to prevent infinite loops
  const connectedBrokers: BrokerConnection[] = useMemo(() => {
    return (connectionsData || []).map((conn: any) => ({
      id: conn.id,
      brokerType: conn.brokerType as BrokerType,
      accountId: conn.accountId || '',
      accountName: conn.accountName || conn.accountNumber || BROKER_METADATA[conn.brokerType as BrokerType]?.name || conn.brokerType,
      isPaper: conn.isPaper ?? true,
      isConnected: conn.isActive ?? true,
      lastSyncAt: conn.lastSyncAt ? new Date(conn.lastSyncAt) : null
    }));
  }, [connectionsData]);
  
  // Helper function to get broker name (defined early for use in effects)
  const getBrokerNameFromType = (type: BrokerType): string => {
    return BROKER_METADATA[type]?.name || type;
  };
  
  // Connection status change notifications
  useEffect(() => {
    if (isInitialLoad.current && connectedBrokers.length > 0) {
      // Initialize previous states on first load
      connectedBrokers.forEach(broker => {
        previousConnectionStates.current.set(broker.id, broker.isConnected);
      });
      isInitialLoad.current = false;
      return;
    }
    
    // Check for connection status changes
    connectedBrokers.forEach(broker => {
      const previousState = previousConnectionStates.current.get(broker.id);
      const brokerName = getBrokerNameFromType(broker.brokerType);
      
      if (previousState !== undefined && previousState !== broker.isConnected) {
        if (broker.isConnected) {
          toast.success(`${brokerName} Connected`, {
            description: `Your ${brokerName} account is now connected and ready for trading.`,
            duration: 5000,
          });
        } else {
          toast.error(`${brokerName} Disconnected`, {
            description: `Connection to ${brokerName} was lost. Please check your credentials.`,
            duration: 8000,
            action: {
              label: 'Reconnect',
              onClick: () => window.location.href = '/brokers'
            }
          });
        }
      }
      
      // Update previous state
      previousConnectionStates.current.set(broker.id, broker.isConnected);
    });
  }, [connectedBrokers]);
  
  // Load saved broker preference from localStorage
  useEffect(() => {
    const savedBrokerId = localStorage.getItem('tradoverse_active_broker');
    const savedPaperMode = localStorage.getItem('tradoverse_paper_mode');
    
    if (savedPaperMode !== null) {
      setIsPaperMode(savedPaperMode === 'true');
    }
    
    if (savedBrokerId && connectedBrokers.length > 0) {
      const broker = connectedBrokers.find(b => b.id === savedBrokerId);
      if (broker) {
        setActiveBrokerState(broker);
      }
    }
  }, [connectedBrokers]);
  
  // Set active broker with persistence
  const setActiveBroker = useCallback((broker: BrokerConnection | null) => {
    setActiveBrokerState(broker);
    if (broker) {
      localStorage.setItem('tradoverse_active_broker', broker.id);
    } else {
      localStorage.removeItem('tradoverse_active_broker');
    }
  }, []);
  
  // Select broker by connection ID
  const selectBroker = useCallback((connectionId: string) => {
    const broker = connectedBrokers.find(b => b.id === connectionId);
    if (broker) {
      setActiveBroker(broker);
    }
  }, [connectedBrokers, setActiveBroker]);
  
  // Set paper mode with persistence
  const handleSetPaperMode = useCallback((isPaper: boolean) => {
    setIsPaperMode(isPaper);
    localStorage.setItem('tradoverse_paper_mode', String(isPaper));
  }, []);
  
  // Helper functions
  const getBrokerName = useCallback((type: BrokerType): string => {
    return BROKER_METADATA[type]?.name || type;
  }, []);
  
  const getBrokerLogo = useCallback((type: BrokerType): string => {
    return BROKER_METADATA[type]?.logo || '/brokers/default.svg';
  }, []);
  
  const getBrokerColor = useCallback((type: BrokerType): string => {
    return BROKER_METADATA[type]?.color || '#666666';
  }, []);
  
  // Health check function
  const healthCheckBrokers = useCallback(async () => {
    if (connectedBrokers.length === 0) return;
    
    setIsHealthCheckRunning(true);
    
    try {
      // Refetch broker connections to get latest status
      await refetchBrokers();
      setLastHealthCheck(new Date());
      
      // Check for stale connections (no sync in last 5 minutes)
      const staleThreshold = 5 * 60 * 1000; // 5 minutes
      const now = new Date();
      
      connectedBrokers.forEach(broker => {
        if (broker.lastSyncAt) {
          const timeSinceSync = now.getTime() - new Date(broker.lastSyncAt).getTime();
          if (timeSinceSync > staleThreshold && broker.isConnected) {
            const brokerName = getBrokerNameFromType(broker.brokerType);
            toast.warning(`${brokerName} Connection Stale`, {
              description: `No data received from ${brokerName} in the last 5 minutes. Connection may be unstable.`,
              duration: 6000,
            });
          }
        }
      });
    } catch (error) {
      console.error('Health check failed:', error);
      toast.error('Broker Health Check Failed', {
        description: 'Unable to verify broker connections. Please check your network.',
        duration: 5000,
      });
    } finally {
      setIsHealthCheckRunning(false);
    }
  }, [connectedBrokers, refetchBrokers]);
  
  // Periodic health check
  useEffect(() => {
    if (connectedBrokers.length === 0) return;
    
    // Initial health check after 5 seconds
    const initialCheck = setTimeout(() => {
      healthCheckBrokers();
    }, 5000);
    
    // Periodic health checks
    const interval = setInterval(() => {
      healthCheckBrokers();
    }, HEALTH_CHECK_INTERVAL);
    
    return () => {
      clearTimeout(initialCheck);
      clearInterval(interval);
    };
  }, [connectedBrokers.length, healthCheckBrokers]);
  
  // Aggregated portfolio calculation
  const refreshAggregatedPortfolio = useCallback(async () => {
    if (connectedBrokers.length === 0) {
      setAggregatedPortfolio(null);
      return;
    }
    
    setIsLoadingAggregatedPortfolio(true);
    
    try {
      // For now, create a mock aggregated portfolio
      // In production, this would fetch from all connected brokers
      const brokerSummaries = connectedBrokers.map(broker => ({
        brokerId: broker.id,
        brokerType: broker.brokerType,
        brokerName: getBrokerName(broker.brokerType),
        totalValue: 0,
        cash: 0,
        equity: 0,
        unrealizedPnL: 0,
        positionCount: 0,
        isConnected: broker.isConnected,
      }));
      
      const aggregated: AggregatedPortfolio = {
        totalValue: brokerSummaries.reduce((sum, b) => sum + b.totalValue, 0),
        totalCash: brokerSummaries.reduce((sum, b) => sum + b.cash, 0),
        totalEquity: brokerSummaries.reduce((sum, b) => sum + b.equity, 0),
        totalUnrealizedPnL: brokerSummaries.reduce((sum, b) => sum + b.unrealizedPnL, 0),
        totalUnrealizedPnLPercent: 0,
        positions: [],
        brokerSummaries,
        lastUpdated: new Date(),
      };
      
      setAggregatedPortfolio(aggregated);
    } catch (error) {
      console.error('Failed to aggregate portfolio:', error);
      toast.error('Portfolio Aggregation Failed', {
        description: 'Unable to fetch portfolio data from all brokers.',
      });
    } finally {
      setIsLoadingAggregatedPortfolio(false);
    }
  }, [connectedBrokers, getBrokerName]);
  
  // Refresh aggregated portfolio when brokers change
  useEffect(() => {
    if (connectedBrokers.length > 0) {
      refreshAggregatedPortfolio();
    }
  }, [connectedBrokers.length, refreshAggregatedPortfolio]);
  
  const value: BrokerContextValue = {
    activeBroker,
    setActiveBroker,
    connectedBrokers,
    isLoadingBrokers,
    refetchBrokers,
    availableBrokers: AVAILABLE_BROKERS,
    selectBroker,
    isPaperMode,
    setIsPaperMode: handleSetPaperMode,
    getBrokerName,
    getBrokerLogo,
    getBrokerColor,
    hasConnectedBroker: connectedBrokers.length > 0,
    isHealthCheckRunning,
    lastHealthCheck,
    healthCheckBrokers,
    aggregatedPortfolio,
    isLoadingAggregatedPortfolio,
    refreshAggregatedPortfolio,
  };
  
  return (
    <BrokerContext.Provider value={value}>
      {children}
    </BrokerContext.Provider>
  );
}

export function useBroker() {
  const context = useContext(BrokerContext);
  if (context === undefined) {
    throw new Error('useBroker must be used within a BrokerProvider');
  }
  return context;
}

// Export for use in components that need broker info without full context
export { BROKER_METADATA, AVAILABLE_BROKERS };
