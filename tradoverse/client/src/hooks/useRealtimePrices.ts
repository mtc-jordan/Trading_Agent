/**
 * TradoVerse Real-Time Price Hook
 * 
 * Provides real-time price updates via WebSocket with:
 * - Automatic connection management
 * - Price change animations
 * - Reconnection logic
 * - Multi-asset support
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { trpc } from '@/lib/trpc';

// ==================== TYPES ====================

export type AssetType = 'stock' | 'crypto' | 'forex' | 'commodity';

export interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
  assetType?: AssetType;
  bid?: number;
  ask?: number;
  spread?: number;
  high24h?: number;
  low24h?: number;
  provider?: string;
  // Animation state
  priceDirection?: 'up' | 'down' | 'unchanged';
  isFlashing?: boolean;
}

export interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  lastConnected: number | null;
  error: string | null;
}

// ==================== SOCKET SINGLETON ====================

let socketInstance: Socket | null = null;
let connectionCount = 0;

function getSocket(): Socket {
  if (!socketInstance) {
    const wsUrl = window.location.origin;
    socketInstance = io(wsUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  connectionCount++;
  return socketInstance;
}

function releaseSocket(): void {
  connectionCount--;
  if (connectionCount <= 0 && socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    connectionCount = 0;
  }
}

// ==================== MAIN HOOK ====================

export function useRealtimePrices(symbols: string[]) {
  const [prices, setPrices] = useState<Map<string, PriceUpdate>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    reconnecting: false,
    lastConnected: null,
    error: null,
  });
  
  const socketRef = useRef<Socket | null>(null);
  const subscribedSymbolsRef = useRef<Set<string>>(new Set());
  const flashTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Get initial prices via tRPC
  const { data: initialPrices } = trpc.realtimePrices.getPrices.useQuery(
    { symbols },
    { 
      enabled: symbols.length > 0,
      refetchInterval: 30000, // Fallback polling every 30s
    }
  );

  // Initialize prices from tRPC query
  useEffect(() => {
    if (initialPrices?.prices) {
      setPrices(prev => {
        const newPrices = new Map(prev);
        initialPrices.prices.forEach((price: PriceUpdate) => {
          const existing = newPrices.get(price.symbol);
          newPrices.set(price.symbol, {
            ...price,
            priceDirection: existing 
              ? price.price > existing.price ? 'up' 
                : price.price < existing.price ? 'down' 
                : 'unchanged'
              : 'unchanged',
            isFlashing: false,
          });
        });
        return newPrices;
      });
    }
  }, [initialPrices]);

  // Handle price update with animation
  const handlePriceUpdate = useCallback((update: PriceUpdate) => {
    setPrices(prev => {
      const newPrices = new Map(prev);
      const existing = newPrices.get(update.symbol);
      
      // Determine price direction
      const priceDirection = existing
        ? update.price > existing.price ? 'up'
          : update.price < existing.price ? 'down'
          : 'unchanged'
        : 'unchanged';
      
      // Set flashing state
      const shouldFlash = priceDirection !== 'unchanged';
      
      newPrices.set(update.symbol, {
        ...update,
        priceDirection,
        isFlashing: shouldFlash,
      });
      
      // Clear flash after animation
      if (shouldFlash) {
        const existingTimeout = flashTimeoutsRef.current.get(update.symbol);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }
        
        const timeout = setTimeout(() => {
          setPrices(p => {
            const updated = new Map(p);
            const current = updated.get(update.symbol);
            if (current) {
              updated.set(update.symbol, { ...current, isFlashing: false });
            }
            return updated;
          });
        }, 500);
        
        flashTimeoutsRef.current.set(update.symbol, timeout);
      }
      
      return newPrices;
    });
  }, []);

  // WebSocket connection management
  useEffect(() => {
    if (symbols.length === 0) return;

    const socket = getSocket();
    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      setConnectionStatus({
        connected: true,
        reconnecting: false,
        lastConnected: Date.now(),
        error: null,
      });
      
      // Subscribe to symbols
      const newSymbols = symbols.filter(s => !subscribedSymbolsRef.current.has(s));
      if (newSymbols.length > 0) {
        socket.emit('subscribe:prices', newSymbols);
        newSymbols.forEach(s => subscribedSymbolsRef.current.add(s));
      }
    });

    socket.on('disconnect', () => {
      setConnectionStatus(prev => ({
        ...prev,
        connected: false,
      }));
    });

    socket.on('connect_error', (error) => {
      setConnectionStatus(prev => ({
        ...prev,
        connected: false,
        error: error.message,
      }));
    });

    socket.on('reconnecting', () => {
      setConnectionStatus(prev => ({
        ...prev,
        reconnecting: true,
      }));
    });

    // Price update handler
    socket.on('price:update', handlePriceUpdate);

    // Subscribe to symbols if already connected
    if (socket.connected) {
      const newSymbols = symbols.filter(s => !subscribedSymbolsRef.current.has(s));
      if (newSymbols.length > 0) {
        socket.emit('subscribe:prices', newSymbols);
        newSymbols.forEach(s => subscribedSymbolsRef.current.add(s));
      }
    }

    return () => {
      // Unsubscribe from symbols
      if (socket.connected && subscribedSymbolsRef.current.size > 0) {
        socket.emit('unsubscribe:prices', Array.from(subscribedSymbolsRef.current));
      }
      subscribedSymbolsRef.current.clear();
      
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('reconnecting');
      socket.off('price:update');
      
      releaseSocket();
    };
  }, [symbols, handlePriceUpdate]);

  // Handle symbol changes
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    const currentSymbols = new Set(symbols.map(s => s.toUpperCase()));
    const subscribedSymbols = subscribedSymbolsRef.current;

    // Find new symbols to subscribe
    const toSubscribe = symbols.filter(s => !subscribedSymbols.has(s.toUpperCase()));
    
    // Find symbols to unsubscribe
    const toUnsubscribe = Array.from(subscribedSymbols).filter(s => !currentSymbols.has(s));

    if (toSubscribe.length > 0) {
      socket.emit('subscribe:prices', toSubscribe);
      toSubscribe.forEach(s => subscribedSymbols.add(s.toUpperCase()));
    }

    if (toUnsubscribe.length > 0) {
      socket.emit('unsubscribe:prices', toUnsubscribe);
      toUnsubscribe.forEach(s => subscribedSymbols.delete(s));
    }
  }, [symbols]);

  // Get price for a specific symbol
  const getPrice = useCallback((symbol: string): PriceUpdate | undefined => {
    return prices.get(symbol.toUpperCase());
  }, [prices]);

  // Get all prices as array
  const getAllPrices = useCallback((): PriceUpdate[] => {
    return Array.from(prices.values());
  }, [prices]);

  // Get prices by asset type
  const getPricesByType = useCallback((assetType: AssetType): PriceUpdate[] => {
    return Array.from(prices.values()).filter(p => p.assetType === assetType);
  }, [prices]);

  // Manual refresh
  const refresh = useCallback(() => {
    const socket = socketRef.current;
    if (socket?.connected && subscribedSymbolsRef.current.size > 0) {
      // Re-subscribe to trigger fresh data
      socket.emit('subscribe:prices', Array.from(subscribedSymbolsRef.current));
    }
  }, []);

  return {
    prices,
    connectionStatus,
    getPrice,
    getAllPrices,
    getPricesByType,
    refresh,
  };
}

// ==================== SINGLE PRICE HOOK ====================

export function useRealtimePrice(symbol: string) {
  const { prices, connectionStatus, getPrice, refresh } = useRealtimePrices([symbol]);
  
  return {
    price: getPrice(symbol),
    connectionStatus,
    refresh,
  };
}

// ==================== CONNECTION STATUS HOOK ====================

export function useWebSocketStatus() {
  const [status, setStatus] = useState<ConnectionStatus>({
    connected: false,
    reconnecting: false,
    lastConnected: null,
    error: null,
  });

  useEffect(() => {
    const socket = getSocket();

    const updateStatus = () => {
      setStatus({
        connected: socket.connected,
        reconnecting: false,
        lastConnected: socket.connected ? Date.now() : status.lastConnected,
        error: null,
      });
    };

    socket.on('connect', updateStatus);
    socket.on('disconnect', updateStatus);
    socket.on('connect_error', (error) => {
      setStatus(prev => ({ ...prev, error: error.message }));
    });

    updateStatus();

    return () => {
      socket.off('connect', updateStatus);
      socket.off('disconnect', updateStatus);
      socket.off('connect_error');
      releaseSocket();
    };
  }, []);

  return status;
}
