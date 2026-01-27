import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

// Asset class types matching Alpaca's supported classes
export type AssetClass = 'stocks' | 'crypto' | 'options';

export interface AssetClassInfo {
  id: AssetClass;
  name: string;
  description: string;
  icon: string;
  tradingHours: string;
  is24x7: boolean;
  color: string;
}

// Asset class metadata
export const ASSET_CLASSES: Record<AssetClass, AssetClassInfo> = {
  stocks: {
    id: 'stocks',
    name: 'Stocks & ETFs',
    description: 'Trade US equities and exchange-traded funds',
    icon: '📈',
    tradingHours: '9:30 AM - 4:00 PM ET',
    is24x7: false,
    color: '#22c55e', // green
  },
  crypto: {
    id: 'crypto',
    name: 'Cryptocurrency',
    description: 'Trade Bitcoin, Ethereum, and other digital assets',
    icon: '₿',
    tradingHours: '24/7',
    is24x7: true,
    color: '#f59e0b', // amber
  },
  options: {
    id: 'options',
    name: 'Options',
    description: 'Trade calls and puts on US equities',
    icon: '📊',
    tradingHours: '9:30 AM - 4:00 PM ET',
    is24x7: false,
    color: '#8b5cf6', // violet
  },
};

// Popular symbols per asset class
export const POPULAR_SYMBOLS: Record<AssetClass, string[]> = {
  stocks: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'AMD', 'NFLX', 'DIS'],
  crypto: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'DOGE/USD', 'AVAX/USD', 'LINK/USD', 'UNI/USD', 'AAVE/USD'],
  options: ['AAPL', 'SPY', 'QQQ', 'TSLA', 'NVDA', 'AMD', 'AMZN', 'META'],
};

interface AssetClassContextType {
  // Current selection
  assetClass: AssetClass;
  setAssetClass: (assetClass: AssetClass) => void;
  
  // Asset class info
  currentAssetInfo: AssetClassInfo;
  allAssetClasses: AssetClassInfo[];
  
  // Popular symbols for current asset class
  popularSymbols: string[];
  
  // Watchlist per asset class
  watchlist: string[];
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  isInWatchlist: (symbol: string) => boolean;
  
  // Market status
  isMarketOpen: boolean;
  
  // Helpers
  formatSymbol: (symbol: string) => string;
  getAssetClassForSymbol: (symbol: string) => AssetClass;
}

const AssetClassContext = createContext<AssetClassContextType | null>(null);

const STORAGE_KEY = 'tradoverse_asset_class';
const WATCHLIST_STORAGE_KEY = 'tradoverse_watchlists';

export function AssetClassProvider({ children }: { children: React.ReactNode }) {
  // Load initial asset class from localStorage
  const [assetClass, setAssetClassState] = useState<AssetClass>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && (stored === 'stocks' || stored === 'crypto' || stored === 'options')) {
        return stored as AssetClass;
      }
    }
    return 'stocks';
  });

  // Load watchlists from localStorage
  const [watchlists, setWatchlists] = useState<Record<AssetClass, string[]>>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // Invalid JSON, use defaults
        }
      }
    }
    return {
      stocks: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA'],
      crypto: ['BTC/USD', 'ETH/USD'],
      options: ['SPY', 'QQQ'],
    };
  });

  // Persist asset class to localStorage
  const setAssetClass = useCallback((newAssetClass: AssetClass) => {
    setAssetClassState(newAssetClass);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newAssetClass);
    }
  }, []);

  // Persist watchlists to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlists));
    }
  }, [watchlists]);

  // Current asset class info
  const currentAssetInfo = useMemo(() => ASSET_CLASSES[assetClass], [assetClass]);

  // All asset classes as array
  const allAssetClasses = useMemo(() => Object.values(ASSET_CLASSES), []);

  // Popular symbols for current asset class
  const popularSymbols = useMemo(() => POPULAR_SYMBOLS[assetClass], [assetClass]);

  // Current watchlist
  const watchlist = useMemo(() => watchlists[assetClass] || [], [watchlists, assetClass]);

  // Watchlist management
  const addToWatchlist = useCallback((symbol: string) => {
    setWatchlists(prev => ({
      ...prev,
      [assetClass]: [...(prev[assetClass] || []).filter(s => s !== symbol), symbol],
    }));
  }, [assetClass]);

  const removeFromWatchlist = useCallback((symbol: string) => {
    setWatchlists(prev => ({
      ...prev,
      [assetClass]: (prev[assetClass] || []).filter(s => s !== symbol),
    }));
  }, [assetClass]);

  const isInWatchlist = useCallback((symbol: string) => {
    return watchlists[assetClass]?.includes(symbol) || false;
  }, [watchlists, assetClass]);

  // Check if market is open (simplified - crypto is always open)
  const isMarketOpen = useMemo(() => {
    if (assetClass === 'crypto') return true;
    
    const now = new Date();
    const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const day = etNow.getDay();
    const hours = etNow.getHours();
    const minutes = etNow.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    
    // Weekend check
    if (day === 0 || day === 6) return false;
    
    // Market hours: 9:30 AM - 4:00 PM ET
    const marketOpen = 9 * 60 + 30;
    const marketClose = 16 * 60;
    
    return timeInMinutes >= marketOpen && timeInMinutes < marketClose;
  }, [assetClass]);

  // Format symbol based on asset class
  const formatSymbol = useCallback((symbol: string) => {
    if (assetClass === 'crypto') {
      // Ensure crypto symbols have /USD suffix
      if (!symbol.includes('/')) {
        return `${symbol}/USD`;
      }
    }
    return symbol.toUpperCase();
  }, [assetClass]);

  // Determine asset class for a symbol
  const getAssetClassForSymbol = useCallback((symbol: string): AssetClass => {
    if (symbol.includes('/') || ['BTC', 'ETH', 'SOL', 'DOGE', 'AVAX', 'LINK', 'UNI', 'AAVE'].some(c => symbol.startsWith(c))) {
      return 'crypto';
    }
    // Options symbols typically have format like AAPL230120C00150000
    if (/^[A-Z]+\d{6}[CP]\d{8}$/.test(symbol)) {
      return 'options';
    }
    return 'stocks';
  }, []);

  const value = useMemo(() => ({
    assetClass,
    setAssetClass,
    currentAssetInfo,
    allAssetClasses,
    popularSymbols,
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    isMarketOpen,
    formatSymbol,
    getAssetClassForSymbol,
  }), [
    assetClass,
    setAssetClass,
    currentAssetInfo,
    allAssetClasses,
    popularSymbols,
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    isMarketOpen,
    formatSymbol,
    getAssetClassForSymbol,
  ]);

  return (
    <AssetClassContext.Provider value={value}>
      {children}
    </AssetClassContext.Provider>
  );
}

export function useAssetClass() {
  const context = useContext(AssetClassContext);
  if (!context) {
    throw new Error('useAssetClass must be used within an AssetClassProvider');
  }
  return context;
}
