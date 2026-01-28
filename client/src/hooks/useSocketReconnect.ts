/**
 * Enhanced WebSocket Hook with Exponential Backoff Reconnection
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Connection state management (connecting, connected, disconnected, reconnecting)
 * - Max retry limit with user notification
 * - Auto-resubscribe to channels after reconnection
 * - Detailed connection status and retry information
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/_core/hooks/useAuth";

// Connection states
export type ConnectionState = 
  | "idle"
  | "connecting" 
  | "connected" 
  | "disconnected" 
  | "reconnecting" 
  | "failed";

// Reconnection configuration
interface ReconnectConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RECONNECT_CONFIG: ReconnectConfig = {
  maxAttempts: 10,
  baseDelay: 1000,      // 1 second
  maxDelay: 30000,      // 30 seconds max
  backoffMultiplier: 2,
};

// Reconnection status
export interface ReconnectStatus {
  state: ConnectionState;
  attempt: number;
  maxAttempts: number;
  nextRetryIn: number | null;
  lastError: string | null;
  isReconnecting: boolean;
}

// Subscriptions to restore after reconnection
interface Subscriptions {
  prices: Set<string>;
  bots: Set<number>;
  portfolio: boolean;
  notifications: boolean;
}

// Singleton socket instance with enhanced reconnection
let socketInstance: Socket | null = null;
let reconnectTimeoutRef: NodeJS.Timeout | null = null;
let reconnectAttempt = 0;
let subscriptions: Subscriptions = {
  prices: new Set(),
  bots: new Set(),
  portfolio: false,
  notifications: false,
};

// Calculate delay with exponential backoff
function calculateBackoffDelay(
  attempt: number,
  config: ReconnectConfig
): number {
  const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
  // Add jitter (±20%) to prevent thundering herd
  const jitter = delay * 0.2 * (Math.random() - 0.5);
  return Math.min(delay + jitter, config.maxDelay);
}

// Hook return type
interface UseSocketReconnectReturn {
  isConnected: boolean;
  connectionState: ConnectionState;
  reconnectStatus: ReconnectStatus;
  subscribeToPrices: (symbols: string[]) => void;
  unsubscribeFromPrices: (symbols: string[]) => void;
  subscribeToBot: (botId: number) => void;
  unsubscribeFromBot: (botId: number) => void;
  subscribeToPortfolio: () => void;
  subscribeToNotifications: () => void;
  manualReconnect: () => void;
  latency: number | null;
}

export function useSocketReconnect(
  config: Partial<ReconnectConfig> = {}
): UseSocketReconnectReturn {
  const { user } = useAuth();
  const fullConfig = { ...DEFAULT_RECONNECT_CONFIG, ...config };
  
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [reconnectStatus, setReconnectStatus] = useState<ReconnectStatus>({
    state: "idle",
    attempt: 0,
    maxAttempts: fullConfig.maxAttempts,
    nextRetryIn: null,
    lastError: null,
    isReconnecting: false,
  });
  const [latency, setLatency] = useState<number | null>(null);
  
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clear reconnection timeout
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef) {
      clearTimeout(reconnectTimeoutRef);
      reconnectTimeoutRef = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // Restore subscriptions after reconnection
  const restoreSubscriptions = useCallback((socket: Socket) => {
    console.log("[Socket] Restoring subscriptions...");
    
    // Restore price subscriptions
    if (subscriptions.prices.size > 0) {
      const symbols = Array.from(subscriptions.prices);
      socket.emit("subscribe:prices", symbols);
      console.log(`[Socket] Restored price subscriptions: ${symbols.join(", ")}`);
    }
    
    // Restore bot subscriptions
    subscriptions.bots.forEach((botId) => {
      socket.emit("subscribe:bot", botId);
      console.log(`[Socket] Restored bot subscription: ${botId}`);
    });
    
    // Restore portfolio subscription
    if (subscriptions.portfolio) {
      socket.emit("subscribe:portfolio");
      console.log("[Socket] Restored portfolio subscription");
    }
    
    // Restore notifications subscription
    if (subscriptions.notifications) {
      socket.emit("subscribe:notifications");
      console.log("[Socket] Restored notifications subscription");
    }
  }, []);

  // Schedule reconnection with exponential backoff
  const scheduleReconnect = useCallback((socket: Socket, error?: string) => {
    if (reconnectAttempt >= fullConfig.maxAttempts) {
      console.error("[Socket] Max reconnection attempts reached");
      setConnectionState("failed");
      setReconnectStatus((prev) => ({
        ...prev,
        state: "failed",
        isReconnecting: false,
        lastError: "Max reconnection attempts reached. Please refresh the page.",
      }));
      return;
    }

    reconnectAttempt++;
    const delay = calculateBackoffDelay(reconnectAttempt - 1, fullConfig);
    
    console.log(`[Socket] Scheduling reconnect attempt ${reconnectAttempt}/${fullConfig.maxAttempts} in ${Math.round(delay / 1000)}s`);
    
    setConnectionState("reconnecting");
    setReconnectStatus({
      state: "reconnecting",
      attempt: reconnectAttempt,
      maxAttempts: fullConfig.maxAttempts,
      nextRetryIn: Math.round(delay / 1000),
      lastError: error || null,
      isReconnecting: true,
    });

    // Start countdown timer
    let remainingTime = Math.round(delay / 1000);
    countdownIntervalRef.current = setInterval(() => {
      remainingTime--;
      if (remainingTime > 0) {
        setReconnectStatus((prev) => ({
          ...prev,
          nextRetryIn: remainingTime,
        }));
      }
    }, 1000);

    // Schedule reconnection
    reconnectTimeoutRef = setTimeout(() => {
      clearReconnectTimeout();
      console.log(`[Socket] Attempting reconnect (${reconnectAttempt}/${fullConfig.maxAttempts})`);
      socket.connect();
    }, delay);
  }, [fullConfig, clearReconnectTimeout]);

  // Manual reconnect function
  const manualReconnect = useCallback(() => {
    if (!socketInstance) return;
    
    clearReconnectTimeout();
    reconnectAttempt = 0;
    
    setConnectionState("connecting");
    setReconnectStatus({
      state: "connecting",
      attempt: 0,
      maxAttempts: fullConfig.maxAttempts,
      nextRetryIn: null,
      lastError: null,
      isReconnecting: false,
    });
    
    socketInstance.connect();
  }, [fullConfig.maxAttempts, clearReconnectTimeout]);

  // Get or create socket instance
  const getSocket = useCallback(() => {
    if (!socketInstance) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      
      socketInstance = io(`${protocol}//${host}`, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        auth: user ? { token: localStorage.getItem("auth_token") } : {},
        // Disable built-in reconnection - we handle it ourselves
        reconnection: false,
        timeout: 10000,
      });
    }
    return socketInstance;
  }, [user]);

  // Initialize socket connection
  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => {
      console.log("[Socket] Connected successfully");
      reconnectAttempt = 0;
      clearReconnectTimeout();
      
      setConnectionState("connected");
      setReconnectStatus({
        state: "connected",
        attempt: 0,
        maxAttempts: fullConfig.maxAttempts,
        nextRetryIn: null,
        lastError: null,
        isReconnecting: false,
      });
      
      // Restore subscriptions after reconnection
      restoreSubscriptions(socket);
    };

    const handleDisconnect = (reason: string) => {
      console.log(`[Socket] Disconnected: ${reason}`);
      setConnectionState("disconnected");
      
      // Don't reconnect if it was an intentional disconnect
      if (reason === "io client disconnect" || reason === "io server disconnect") {
        setReconnectStatus((prev) => ({
          ...prev,
          state: "disconnected",
          isReconnecting: false,
        }));
        return;
      }
      
      // Schedule reconnection for unexpected disconnects
      scheduleReconnect(socket, `Disconnected: ${reason}`);
    };

    const handleConnectError = (error: Error) => {
      console.error("[Socket] Connection error:", error.message);
      setConnectionState("disconnected");
      scheduleReconnect(socket, error.message);
    };

    // Pong handler for latency measurement
    const handlePong = (data: { timestamp: number }) => {
      const latencyMs = Date.now() - data.timestamp;
      setLatency(latencyMs);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("pong", handlePong);

    // Start ping interval for latency measurement
    pingIntervalRef.current = setInterval(() => {
      if (socket.connected) {
        socket.emit("ping", { timestamp: Date.now() });
      }
    }, 30000);

    // Connect if not already connected
    if (!socket.connected) {
      setConnectionState("connecting");
      setReconnectStatus((prev) => ({
        ...prev,
        state: "connecting",
      }));
      socket.connect();
    } else {
      setConnectionState("connected");
      setReconnectStatus((prev) => ({
        ...prev,
        state: "connected",
      }));
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("pong", handlePong);

      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      
      clearReconnectTimeout();
    };
  }, [getSocket, fullConfig.maxAttempts, scheduleReconnect, restoreSubscriptions, clearReconnectTimeout]);

  // Subscribe to price updates
  const subscribeToPrices = useCallback((symbols: string[]) => {
    const socket = getSocket();
    symbols.forEach((s) => subscriptions.prices.add(s));
    
    if (socket.connected) {
      socket.emit("subscribe:prices", symbols);
    }
  }, [getSocket]);

  // Unsubscribe from price updates
  const unsubscribeFromPrices = useCallback((symbols: string[]) => {
    const socket = getSocket();
    symbols.forEach((s) => subscriptions.prices.delete(s));
    
    if (socket.connected) {
      socket.emit("unsubscribe:prices", symbols);
    }
  }, [getSocket]);

  // Subscribe to bot status
  const subscribeToBot = useCallback((botId: number) => {
    const socket = getSocket();
    subscriptions.bots.add(botId);
    
    if (socket.connected) {
      socket.emit("subscribe:bot", botId);
    }
  }, [getSocket]);

  // Unsubscribe from bot status
  const unsubscribeFromBot = useCallback((botId: number) => {
    const socket = getSocket();
    subscriptions.bots.delete(botId);
    
    if (socket.connected) {
      socket.emit("unsubscribe:bot", botId);
    }
  }, [getSocket]);

  // Subscribe to portfolio updates
  const subscribeToPortfolio = useCallback(() => {
    const socket = getSocket();
    subscriptions.portfolio = true;
    
    if (socket.connected) {
      socket.emit("subscribe:portfolio");
    }
  }, [getSocket]);

  // Subscribe to notifications
  const subscribeToNotifications = useCallback(() => {
    const socket = getSocket();
    subscriptions.notifications = true;
    
    if (socket.connected) {
      socket.emit("subscribe:notifications");
    }
  }, [getSocket]);

  return {
    isConnected: connectionState === "connected",
    connectionState,
    reconnectStatus,
    subscribeToPrices,
    unsubscribeFromPrices,
    subscribeToBot,
    unsubscribeFromBot,
    subscribeToPortfolio,
    subscribeToNotifications,
    manualReconnect,
    latency,
  };
}

export default useSocketReconnect;
