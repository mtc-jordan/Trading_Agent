import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { ENV } from "./env";

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

// Socket.IO server instance
let io: Server | null = null;

// Connected users map (userId -> Set of socket IDs)
const connectedUsers = new Map<number, Set<string>>();

// Price subscriptions (symbol -> Set of socket IDs)
const priceSubscriptions = new Map<string, Set<string>>();

// Bot subscriptions (botId -> Set of socket IDs)
const botSubscriptions = new Map<number, Set<string>>();

/**
 * Initialize Socket.IO server
 */
export function initializeWebSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/socket.io",
    transports: ["websocket", "polling"],
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        // Allow anonymous connections for public price feeds
        socket.data.userId = null;
        socket.data.authenticated = false;
        return next();
      }

      // Verify JWT token
      const decoded = jwt.verify(token as string, ENV.cookieSecret) as { userId: number };
      socket.data.userId = decoded.userId;
      socket.data.authenticated = true;
      next();
    } catch (err) {
      // Allow connection but mark as unauthenticated
      socket.data.userId = null;
      socket.data.authenticated = false;
      next();
    }
  });

  // Connection handler
  io.on("connection", (socket: Socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}, authenticated: ${socket.data.authenticated}`);

    // Track authenticated users
    if (socket.data.authenticated && socket.data.userId) {
      const userId = socket.data.userId;
      if (!connectedUsers.has(userId)) {
        connectedUsers.set(userId, new Set());
      }
      connectedUsers.get(userId)!.add(socket.id);
    }

    // Handle price subscription
    socket.on("subscribe:prices", (symbols: string[]) => {
      symbols.forEach((symbol) => {
        const upperSymbol = symbol.toUpperCase();
        if (!priceSubscriptions.has(upperSymbol)) {
          priceSubscriptions.set(upperSymbol, new Set());
        }
        priceSubscriptions.get(upperSymbol)!.add(socket.id);
        socket.join(`price:${upperSymbol}`);
      });
      console.log(`[WebSocket] ${socket.id} subscribed to prices: ${symbols.join(", ")}`);
    });

    // Handle price unsubscription
    socket.on("unsubscribe:prices", (symbols: string[]) => {
      symbols.forEach((symbol) => {
        const upperSymbol = symbol.toUpperCase();
        priceSubscriptions.get(upperSymbol)?.delete(socket.id);
        socket.leave(`price:${upperSymbol}`);
      });
    });

    // Handle bot status subscription (requires authentication)
    socket.on("subscribe:bot", (botId: number) => {
      if (!socket.data.authenticated) {
        socket.emit("error", { message: "Authentication required for bot subscriptions" });
        return;
      }
      
      if (!botSubscriptions.has(botId)) {
        botSubscriptions.set(botId, new Set());
      }
      botSubscriptions.get(botId)!.add(socket.id);
      socket.join(`bot:${botId}`);
      console.log(`[WebSocket] ${socket.id} subscribed to bot: ${botId}`);
    });

    // Handle bot unsubscription
    socket.on("unsubscribe:bot", (botId: number) => {
      botSubscriptions.get(botId)?.delete(socket.id);
      socket.leave(`bot:${botId}`);
    });

    // Handle portfolio subscription (requires authentication)
    socket.on("subscribe:portfolio", () => {
      if (!socket.data.authenticated) {
        socket.emit("error", { message: "Authentication required for portfolio updates" });
        return;
      }
      socket.join(`portfolio:${socket.data.userId}`);
      console.log(`[WebSocket] ${socket.id} subscribed to portfolio updates`);
    });

    // Handle notification subscription (requires authentication)
    socket.on("subscribe:notifications", () => {
      if (!socket.data.authenticated) {
        socket.emit("error", { message: "Authentication required for notifications" });
        return;
      }
      socket.join(`notifications:${socket.data.userId}`);
      console.log(`[WebSocket] ${socket.id} subscribed to notifications`);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);

      // Clean up user tracking
      if (socket.data.userId) {
        const userSockets = connectedUsers.get(socket.data.userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            connectedUsers.delete(socket.data.userId);
          }
        }
      }

      // Clean up price subscriptions
      priceSubscriptions.forEach((sockets, symbol) => {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          priceSubscriptions.delete(symbol);
        }
      });

      // Clean up bot subscriptions
      botSubscriptions.forEach((sockets, botId) => {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          botSubscriptions.delete(botId);
        }
      });
    });

    // Ping/pong for connection health
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: Date.now() });
    });
  });

  console.log("[WebSocket] Socket.IO server initialized");
  return io;
}

/**
 * Get the Socket.IO server instance
 */
export function getIO(): Server | null {
  return io;
}

/**
 * Broadcast price update to subscribed clients
 */
export function broadcastPriceUpdate(update: PriceUpdate): void {
  if (!io) return;
  io.to(`price:${update.symbol.toUpperCase()}`).emit("price:update", update);
}

/**
 * Broadcast multiple price updates
 */
export function broadcastPriceUpdates(updates: PriceUpdate[]): void {
  if (!io) return;
  updates.forEach((update) => {
    io!.to(`price:${update.symbol.toUpperCase()}`).emit("price:update", update);
  });
}

/**
 * Send notification to a specific user
 */
export function sendNotification(userId: number, notification: NotificationPayload): void {
  if (!io) return;
  io.to(`notifications:${userId}`).emit("notification:new", notification);
}

/**
 * Broadcast bot execution status update
 */
export function broadcastBotStatus(status: BotExecutionStatus): void {
  if (!io) return;
  io.to(`bot:${status.botId}`).emit("bot:status", status);
}

/**
 * Send portfolio update to a specific user
 */
export function sendPortfolioUpdate(userId: number, update: PortfolioUpdate): void {
  if (!io) return;
  io.to(`portfolio:${userId}`).emit("portfolio:update", update);
}

/**
 * Check if a user is currently connected
 */
export function isUserConnected(userId: number): boolean {
  return connectedUsers.has(userId) && connectedUsers.get(userId)!.size > 0;
}

/**
 * Get count of connected users
 */
export function getConnectedUsersCount(): number {
  return connectedUsers.size;
}

/**
 * Get list of symbols with active subscriptions
 */
export function getActiveSymbolSubscriptions(): string[] {
  return Array.from(priceSubscriptions.keys());
}

/**
 * Broadcast a system-wide message to all connected clients
 */
export function broadcastSystemMessage(message: { type: string; content: string }): void {
  if (!io) return;
  io.emit("system:message", message);
}
