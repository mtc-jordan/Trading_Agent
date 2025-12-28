/**
 * Broker Context
 * 
 * Provides global broker state management across the application.
 * Tracks active broker, connected brokers, and broker preferences.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { trpc } from '@/lib/trpc';

// Broker types matching the server-side types
export type BrokerType = 'alpaca' | 'interactive_brokers' | 'binance' | 'coinbase';

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

export function BrokerProvider({ children }: BrokerProviderProps) {
  const [activeBroker, setActiveBrokerState] = useState<BrokerConnection | null>(null);
  const [isPaperMode, setIsPaperMode] = useState(true);
  
  // Fetch connected brokers from API
  const { 
    data: connectionsData, 
    isLoading: isLoadingBrokers,
    refetch: refetchBrokers 
  } = trpc.broker.getConnections.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false
  });
  
  // Transform API data to BrokerConnection format
  const connectedBrokers: BrokerConnection[] = (connectionsData || []).map((conn: any) => ({
    id: conn.id,
    brokerType: conn.brokerType as BrokerType,
    accountId: conn.accountId || '',
    accountName: conn.accountName || conn.brokerType,
    isPaper: conn.isPaper ?? true,
    isConnected: conn.status === 'active',
    lastSyncAt: conn.lastSyncAt ? new Date(conn.lastSyncAt) : null
  }));
  
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
    hasConnectedBroker: connectedBrokers.length > 0
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
