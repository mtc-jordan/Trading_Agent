import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/_core/hooks/useAuth";

// Types for WebSocket events
export interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
}

export interface NotificationPayload {
  id: number;
  type: "info" | "success" | "warning" | "error" | "alert";
  title: string;
  message?: string;
  actionUrl?: string;
  createdAt: Date;
}

export interface BotExecutionStatus {
  botId: number;
  status: "idle" | "running" | "completed" | "failed" | "paused";
  progress?: number;
  currentAction?: string;
  tradesExecuted?: number;
  lastUpdate: number;
  error?: string;
}

export interface PortfolioUpdate {
  userId: number;
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  positions: Array<{
    symbol: string;
    quantity: number;
    currentPrice: number;
    value: number;
    change: number;
  }>;
  timestamp: number;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface UseSocketReturn {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  subscribeToPrices: (symbols: string[]) => void;
  unsubscribeFromPrices: (symbols: string[]) => void;
  subscribeToBot: (botId: number) => void;
  unsubscribeFromBot: (botId: number) => void;
  subscribeToPortfolio: () => void;
  subscribeToNotifications: () => void;
  onPriceUpdate: (callback: (update: PriceUpdate) => void) => () => void;
  onNotification: (callback: (notification: NotificationPayload) => void) => () => void;
  onBotStatus: (callback: (status: BotExecutionStatus) => void) => () => void;
  onPortfolioUpdate: (callback: (update: PortfolioUpdate) => void) => () => void;
  latency: number | null;
}

// Singleton socket instance
let socketInstance: Socket | null = null;
let connectionCount = 0;

export function useSocket(): UseSocketReturn {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [latency, setLatency] = useState<number | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const eventCallbacksRef = useRef<Map<string, Set<Function>>>(new Map());

  // Get or create socket instance
  const getSocket = useCallback(() => {
    if (!socketInstance) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      
      socketInstance = io(`${protocol}//${host}`, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        auth: user ? { token: localStorage.getItem("auth_token") } : {},
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });
    }
    return socketInstance;
  }, [user]);

  // Register event callback
  const registerCallback = useCallback((event: string, callback: Function) => {
    if (!eventCallbacksRef.current.has(event)) {
      eventCallbacksRef.current.set(event, new Set());
    }
    eventCallbacksRef.current.get(event)!.add(callback);

    // Return cleanup function
    return () => {
      eventCallbacksRef.current.get(event)?.delete(callback);
    };
  }, []);

  // Initialize socket connection
  useEffect(() => {
    connectionCount++;
    const socket = getSocket();

    const handleConnect = () => {
      setIsConnected(true);
      setConnectionStatus("connected");
      console.log("[Socket] Connected");
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setConnectionStatus("disconnected");
      console.log("[Socket] Disconnected");
    };

    const handleConnectError = (error: Error) => {
      setConnectionStatus("error");
      console.error("[Socket] Connection error:", error.message);
    };

    const handleReconnectAttempt = () => {
      setConnectionStatus("connecting");
    };

    // Price update handler
    const handlePriceUpdate = (update: PriceUpdate) => {
      eventCallbacksRef.current.get("price:update")?.forEach((cb) => cb(update));
    };

    // Notification handler
    const handleNotification = (notification: NotificationPayload) => {
      eventCallbacksRef.current.get("notification:new")?.forEach((cb) => cb(notification));
    };

    // Bot status handler
    const handleBotStatus = (status: BotExecutionStatus) => {
      eventCallbacksRef.current.get("bot:status")?.forEach((cb) => cb(status));
    };

    // Portfolio update handler
    const handlePortfolioUpdate = (update: PortfolioUpdate) => {
      eventCallbacksRef.current.get("portfolio:update")?.forEach((cb) => cb(update));
    };

    // Pong handler for latency measurement
    const handlePong = (data: { timestamp: number }) => {
      const latency = Date.now() - data.timestamp;
      setLatency(latency);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("reconnect_attempt", handleReconnectAttempt);
    socket.on("price:update", handlePriceUpdate);
    socket.on("notification:new", handleNotification);
    socket.on("bot:status", handleBotStatus);
    socket.on("portfolio:update", handlePortfolioUpdate);
    socket.on("pong", handlePong);

    // Start ping interval for latency measurement
    pingIntervalRef.current = setInterval(() => {
      if (socket.connected) {
        socket.emit("ping");
      }
    }, 30000);

    // Connect if not already connected
    if (!socket.connected) {
      setConnectionStatus("connecting");
      socket.connect();
    } else {
      setIsConnected(true);
      setConnectionStatus("connected");
    }

    return () => {
      connectionCount--;
      
      // Only disconnect if no more components are using the socket
      if (connectionCount === 0) {
        socket.off("connect", handleConnect);
        socket.off("disconnect", handleDisconnect);
        socket.off("connect_error", handleConnectError);
        socket.off("reconnect_attempt", handleReconnectAttempt);
        socket.off("price:update", handlePriceUpdate);
        socket.off("notification:new", handleNotification);
        socket.off("bot:status", handleBotStatus);
        socket.off("portfolio:update", handlePortfolioUpdate);
        socket.off("pong", handlePong);

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }

        socket.disconnect();
        socketInstance = null;
      }
    };
  }, [getSocket]);

  // Subscribe to price updates
  const subscribeToPrices = useCallback((symbols: string[]) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit("subscribe:prices", symbols);
    }
  }, [getSocket]);

  // Unsubscribe from price updates
  const unsubscribeFromPrices = useCallback((symbols: string[]) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit("unsubscribe:prices", symbols);
    }
  }, [getSocket]);

  // Subscribe to bot status
  const subscribeToBot = useCallback((botId: number) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit("subscribe:bot", botId);
    }
  }, [getSocket]);

  // Unsubscribe from bot status
  const unsubscribeFromBot = useCallback((botId: number) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit("unsubscribe:bot", botId);
    }
  }, [getSocket]);

  // Subscribe to portfolio updates
  const subscribeToPortfolio = useCallback(() => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit("subscribe:portfolio");
    }
  }, [getSocket]);

  // Subscribe to notifications
  const subscribeToNotifications = useCallback(() => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit("subscribe:notifications");
    }
  }, [getSocket]);

  // Event listeners
  const onPriceUpdate = useCallback((callback: (update: PriceUpdate) => void) => {
    return registerCallback("price:update", callback);
  }, [registerCallback]);

  const onNotification = useCallback((callback: (notification: NotificationPayload) => void) => {
    return registerCallback("notification:new", callback);
  }, [registerCallback]);

  const onBotStatus = useCallback((callback: (status: BotExecutionStatus) => void) => {
    return registerCallback("bot:status", callback);
  }, [registerCallback]);

  const onPortfolioUpdate = useCallback((callback: (update: PortfolioUpdate) => void) => {
    return registerCallback("portfolio:update", callback);
  }, [registerCallback]);

  return {
    isConnected,
    connectionStatus,
    subscribeToPrices,
    unsubscribeFromPrices,
    subscribeToBot,
    unsubscribeFromBot,
    subscribeToPortfolio,
    subscribeToNotifications,
    onPriceUpdate,
    onNotification,
    onBotStatus,
    onPortfolioUpdate,
    latency,
  };
}

// Hook for subscribing to specific symbol prices
export function usePriceSubscription(symbols: string[]) {
  const { subscribeToPrices, unsubscribeFromPrices, onPriceUpdate, isConnected } = useSocket();
  const [prices, setPrices] = useState<Map<string, PriceUpdate>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial prices from API
  useEffect(() => {
    if (symbols.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // Fetch initial prices via API
    fetch(`/api/trpc/market.getLivePrices?input=${encodeURIComponent(JSON.stringify({ symbols }))}`)
      .then(res => res.json())
      .then(data => {
        if (data?.result?.data) {
          const newPrices = new Map<string, PriceUpdate>();
          Object.entries(data.result.data).forEach(([symbol, priceData]: [string, any]) => {
            if (priceData) {
              newPrices.set(symbol.toUpperCase(), priceData);
            }
          });
          setPrices(newPrices);
        }
      })
      .catch(err => console.error("Failed to fetch initial prices:", err))
      .finally(() => setIsLoading(false));
  }, [symbols.join(",")]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!isConnected || symbols.length === 0) return;

    subscribeToPrices(symbols);

    const cleanup = onPriceUpdate((update) => {
      if (symbols.includes(update.symbol.toUpperCase())) {
        setPrices((prev) => new Map(prev).set(update.symbol.toUpperCase(), update));
      }
    });

    return () => {
      cleanup();
      unsubscribeFromPrices(symbols);
    };
  }, [isConnected, symbols.join(","), subscribeToPrices, unsubscribeFromPrices, onPriceUpdate]);

  return { prices, isLoading };
}

// Hook for subscribing to bot execution status
export function useBotStatusSubscription(botId: number | null) {
  const { subscribeToBot, unsubscribeFromBot, onBotStatus, isConnected } = useSocket();
  const [status, setStatus] = useState<BotExecutionStatus | null>(null);

  useEffect(() => {
    if (!isConnected || !botId) return;

    subscribeToBot(botId);

    const cleanup = onBotStatus((update) => {
      if (update.botId === botId) {
        setStatus(update);
      }
    });

    return () => {
      cleanup();
      unsubscribeFromBot(botId);
    };
  }, [isConnected, botId, subscribeToBot, unsubscribeFromBot, onBotStatus]);

  return status;
}

// Hook for Alpaca stream status
export function useAlpacaStreamStatus() {
  const [status, setStatus] = useState<{
    connected: boolean;
    authenticated: boolean;
    subscribedSymbols: string[];
    reconnectAttempts: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/trpc/system.alpacaStreamStatus');
        const data = await res.json();
        if (data?.result?.data) {
          setStatus(data.result.data);
        }
      } catch (err) {
        console.error('Failed to fetch Alpaca stream status:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
    // Poll every 10 seconds
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return { status, isLoading };
}

// Hook for subscribing to Alpaca real-time prices
export function useAlpacaPriceSubscription(symbols: string[]) {
  const { subscribeToPrices, unsubscribeFromPrices, onPriceUpdate, isConnected } = useSocket();
  const [prices, setPrices] = useState<Map<string, PriceUpdate>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to Alpaca stream for these symbols
  useEffect(() => {
    if (symbols.length === 0) return;

    // Request server to subscribe to Alpaca stream
    fetch('/api/trpc/system.subscribeAlpacaSymbols', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols }),
    }).catch(err => console.error('Failed to subscribe to Alpaca:', err));

    return () => {
      fetch('/api/trpc/system.unsubscribeAlpacaSymbols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols }),
      }).catch(err => console.error('Failed to unsubscribe from Alpaca:', err));
    };
  }, [symbols.join(',')]);

  // Fetch initial prices
  useEffect(() => {
    if (symbols.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetch(`/api/trpc/market.getLivePrices?input=${encodeURIComponent(JSON.stringify({ symbols }))}`)
      .then(res => res.json())
      .then(data => {
        if (data?.result?.data) {
          const newPrices = new Map<string, PriceUpdate>();
          Object.entries(data.result.data).forEach(([symbol, priceData]: [string, any]) => {
            if (priceData) {
              newPrices.set(symbol.toUpperCase(), priceData);
            }
          });
          setPrices(newPrices);
        }
      })
      .catch(err => console.error('Failed to fetch initial prices:', err))
      .finally(() => setIsLoading(false));
  }, [symbols.join(',')]);

  // Subscribe to WebSocket updates
  useEffect(() => {
    if (!isConnected || symbols.length === 0) return;

    subscribeToPrices(symbols);

    const cleanup = onPriceUpdate((update) => {
      if (symbols.map(s => s.toUpperCase()).includes(update.symbol.toUpperCase())) {
        setPrices((prev) => new Map(prev).set(update.symbol.toUpperCase(), update));
      }
    });

    return () => {
      cleanup();
      unsubscribeFromPrices(symbols);
    };
  }, [isConnected, symbols.join(','), subscribeToPrices, unsubscribeFromPrices, onPriceUpdate]);

  return { prices, isLoading };
}

// Hook for real-time notifications
export function useNotificationSubscription() {
  const { subscribeToNotifications, onNotification, isConnected } = useSocket();
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);

  useEffect(() => {
    if (!isConnected) return;

    subscribeToNotifications();

    const cleanup = onNotification((notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 50));
    });

    return cleanup;
  }, [isConnected, subscribeToNotifications, onNotification]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return { notifications, clearNotifications };
}
