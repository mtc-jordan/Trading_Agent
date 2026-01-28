/**
 * WebSocket Server for Real-Time Agent Updates
 * 
 * Provides real-time streaming of:
 * - Agent debate sessions
 * - Consensus score updates
 * - Trade execution signals
 * - System alerts and notifications
 */

import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';

// Event types for type safety
export enum WebSocketEvent {
  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  AUTHENTICATE = 'authenticate',
  AUTHENTICATED = 'authenticated',
  
  // Debate events
  DEBATE_START = 'debate:start',
  DEBATE_ARGUMENT = 'debate:argument',
  DEBATE_ROUND = 'debate:round',
  DEBATE_END = 'debate:end',
  
  // Consensus events
  CONSENSUS_UPDATE = 'consensus:update',
  CONSENSUS_THRESHOLD = 'consensus:threshold',
  CONSENSUS_FINAL = 'consensus:final',
  
  // Trade events
  TRADE_SIGNAL = 'trade:signal',
  TRADE_EXECUTING = 'trade:executing',
  TRADE_COMPLETED = 'trade:completed',
  TRADE_FAILED = 'trade:failed',
  
  // Agent events
  AGENT_STATUS = 'agent:status',
  AGENT_ANALYSIS = 'agent:analysis',
  
  // System events
  ALERT = 'alert',
  GUARDRAIL_TRIGGERED = 'guardrail:triggered',
  HITL_REQUIRED = 'hitl:required'
}

// Room types for broadcasting
export enum WebSocketRoom {
  DEBATES = 'debates',
  CONSENSUS = 'consensus',
  TRADES = 'trades',
  AGENTS = 'agents',
  ALERTS = 'alerts'
}

// Interfaces
export interface DebateArgument {
  debateId: string;
  agentId: string;
  agentName: string;
  stance: 'bullish' | 'bearish' | 'neutral';
  argument: string;
  confidence: number;
  timestamp: Date;
  round: number;
}

export interface ConsensusUpdate {
  debateId: string;
  score: number;
  previousScore: number;
  threshold: number;
  recommendation: 'execute' | 'reject' | 'caution';
  factors: {
    name: string;
    weight: number;
    contribution: number;
  }[];
  timestamp: Date;
}

export interface TradeSignal {
  signalId: string;
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  quantity: number;
  price: number;
  confidence: number;
  consensusScore: number;
  timestamp: Date;
}

export interface TradeExecution {
  orderId: string;
  signalId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  filledQuantity: number;
  avgPrice: number;
  status: 'pending' | 'partial' | 'filled' | 'cancelled' | 'failed';
  timestamp: Date;
}

export interface AgentStatus {
  agentId: string;
  agentName: string;
  status: 'online' | 'offline' | 'busy' | 'error';
  currentTask?: string;
  performance: number;
  lastUpdate: Date;
}

export interface Alert {
  alertId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  source: string;
  timestamp: Date;
  requiresAction: boolean;
}

// Connected client tracking
interface ConnectedClient {
  socketId: string;
  userId?: string;
  authenticated: boolean;
  rooms: Set<string>;
  connectedAt: Date;
  lastActivity: Date;
}

export class WebSocketServer {
  private io: Server | null = null;
  private clients: Map<string, ConnectedClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly CLIENT_TIMEOUT = 60000; // 60 seconds

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HTTPServer): void {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupEventHandlers();
    this.startHeartbeat();
    
    console.log('[WebSocket] Server initialized');
  }

  /**
   * Setup connection and event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on(WebSocketEvent.CONNECT, (socket: Socket) => {
      this.handleConnection(socket);

      socket.on(WebSocketEvent.AUTHENTICATE, (data: { token: string }) => {
        this.handleAuthentication(socket, data.token);
      });

      socket.on('subscribe', (room: string) => {
        this.handleSubscribe(socket, room);
      });

      socket.on('unsubscribe', (room: string) => {
        this.handleUnsubscribe(socket, room);
      });

      socket.on(WebSocketEvent.DISCONNECT, () => {
        this.handleDisconnection(socket);
      });
    });
  }

  /**
   * Handle new connection
   */
  private handleConnection(socket: Socket): void {
    const client: ConnectedClient = {
      socketId: socket.id,
      authenticated: false,
      rooms: new Set(),
      connectedAt: new Date(),
      lastActivity: new Date()
    };

    this.clients.set(socket.id, client);
    
    console.log(`[WebSocket] Client connected: ${socket.id}`);
    
    // Send welcome message
    socket.emit('welcome', {
      message: 'Connected to TradoVerse Real-Time Server',
      socketId: socket.id,
      timestamp: new Date()
    });
  }

  /**
   * Handle authentication
   */
  private handleAuthentication(socket: Socket, token: string): void {
    const client = this.clients.get(socket.id);
    if (!client) return;

    // In production, validate JWT token here
    // For now, accept any non-empty token
    if (token && token.length > 0) {
      client.authenticated = true;
      client.userId = this.extractUserIdFromToken(token);
      client.lastActivity = new Date();

      socket.emit(WebSocketEvent.AUTHENTICATED, {
        success: true,
        userId: client.userId,
        timestamp: new Date()
      });

      // Auto-subscribe to default rooms
      this.handleSubscribe(socket, WebSocketRoom.ALERTS);
      
      console.log(`[WebSocket] Client authenticated: ${socket.id}`);
    } else {
      socket.emit(WebSocketEvent.AUTHENTICATED, {
        success: false,
        error: 'Invalid token'
      });
    }
  }

  /**
   * Extract user ID from token (simplified)
   */
  private extractUserIdFromToken(token: string): string {
    // In production, decode JWT and extract user ID
    return `user_${token.substring(0, 8)}`;
  }

  /**
   * Handle room subscription
   */
  private handleSubscribe(socket: Socket, room: string): void {
    const client = this.clients.get(socket.id);
    if (!client) return;

    socket.join(room);
    client.rooms.add(room);
    client.lastActivity = new Date();

    socket.emit('subscribed', { room, timestamp: new Date() });
    console.log(`[WebSocket] Client ${socket.id} subscribed to ${room}`);
  }

  /**
   * Handle room unsubscription
   */
  private handleUnsubscribe(socket: Socket, room: string): void {
    const client = this.clients.get(socket.id);
    if (!client) return;

    socket.leave(room);
    client.rooms.delete(room);
    client.lastActivity = new Date();

    socket.emit('unsubscribed', { room, timestamp: new Date() });
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(socket: Socket): void {
    this.clients.delete(socket.id);
    console.log(`[WebSocket] Client disconnected: ${socket.id}`);
  }

  /**
   * Start heartbeat to clean up stale connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [socketId, client] of Array.from(this.clients.entries())) {
        if (now - client.lastActivity.getTime() > this.CLIENT_TIMEOUT) {
          const socket = this.io?.sockets.sockets.get(socketId);
          if (socket) {
            socket.disconnect(true);
          }
          this.clients.delete(socketId);
          console.log(`[WebSocket] Cleaned up stale client: ${socketId}`);
        }
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  // ==================== Broadcasting Methods ====================

  /**
   * Broadcast debate start
   */
  broadcastDebateStart(debateId: string, topic: string, agents: string[]): void {
    this.broadcast(WebSocketRoom.DEBATES, WebSocketEvent.DEBATE_START, {
      debateId,
      topic,
      agents,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast debate argument
   */
  broadcastDebateArgument(argument: DebateArgument): void {
    this.broadcast(WebSocketRoom.DEBATES, WebSocketEvent.DEBATE_ARGUMENT, argument);
  }

  /**
   * Broadcast debate round update
   */
  broadcastDebateRound(debateId: string, round: number, totalRounds: number): void {
    this.broadcast(WebSocketRoom.DEBATES, WebSocketEvent.DEBATE_ROUND, {
      debateId,
      round,
      totalRounds,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast debate end
   */
  broadcastDebateEnd(debateId: string, finalConsensus: number, recommendation: string): void {
    this.broadcast(WebSocketRoom.DEBATES, WebSocketEvent.DEBATE_END, {
      debateId,
      finalConsensus,
      recommendation,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast consensus update
   */
  broadcastConsensusUpdate(update: ConsensusUpdate): void {
    this.broadcast(WebSocketRoom.CONSENSUS, WebSocketEvent.CONSENSUS_UPDATE, update);

    // Check if threshold crossed
    if (update.score >= update.threshold && update.previousScore < update.threshold) {
      this.broadcast(WebSocketRoom.CONSENSUS, WebSocketEvent.CONSENSUS_THRESHOLD, {
        debateId: update.debateId,
        score: update.score,
        threshold: update.threshold,
        crossed: 'above',
        timestamp: new Date()
      });
    } else if (update.score < update.threshold && update.previousScore >= update.threshold) {
      this.broadcast(WebSocketRoom.CONSENSUS, WebSocketEvent.CONSENSUS_THRESHOLD, {
        debateId: update.debateId,
        score: update.score,
        threshold: update.threshold,
        crossed: 'below',
        timestamp: new Date()
      });
    }
  }

  /**
   * Broadcast final consensus decision
   */
  broadcastConsensusFinal(debateId: string, score: number, decision: 'execute' | 'reject'): void {
    this.broadcast(WebSocketRoom.CONSENSUS, WebSocketEvent.CONSENSUS_FINAL, {
      debateId,
      score,
      decision,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast trade signal
   */
  broadcastTradeSignal(signal: TradeSignal): void {
    this.broadcast(WebSocketRoom.TRADES, WebSocketEvent.TRADE_SIGNAL, signal);
  }

  /**
   * Broadcast trade executing
   */
  broadcastTradeExecuting(orderId: string, signal: TradeSignal): void {
    this.broadcast(WebSocketRoom.TRADES, WebSocketEvent.TRADE_EXECUTING, {
      orderId,
      signal,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast trade completed
   */
  broadcastTradeCompleted(execution: TradeExecution): void {
    this.broadcast(WebSocketRoom.TRADES, WebSocketEvent.TRADE_COMPLETED, execution);
  }

  /**
   * Broadcast trade failed
   */
  broadcastTradeFailed(orderId: string, error: string): void {
    this.broadcast(WebSocketRoom.TRADES, WebSocketEvent.TRADE_FAILED, {
      orderId,
      error,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast agent status update
   */
  broadcastAgentStatus(status: AgentStatus): void {
    this.broadcast(WebSocketRoom.AGENTS, WebSocketEvent.AGENT_STATUS, status);
  }

  /**
   * Broadcast agent analysis
   */
  broadcastAgentAnalysis(agentId: string, analysis: Record<string, unknown>): void {
    this.broadcast(WebSocketRoom.AGENTS, WebSocketEvent.AGENT_ANALYSIS, {
      agentId,
      analysis,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast alert
   */
  broadcastAlert(alert: Alert): void {
    this.broadcast(WebSocketRoom.ALERTS, WebSocketEvent.ALERT, alert);
  }

  /**
   * Broadcast guardrail triggered
   */
  broadcastGuardrailTriggered(guardrail: string, reason: string, action: string): void {
    this.broadcast(WebSocketRoom.ALERTS, WebSocketEvent.GUARDRAIL_TRIGGERED, {
      guardrail,
      reason,
      action,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast HITL required
   */
  broadcastHITLRequired(tradeId: string, reason: string, details: Record<string, unknown>): void {
    this.broadcast(WebSocketRoom.ALERTS, WebSocketEvent.HITL_REQUIRED, {
      tradeId,
      reason,
      details,
      timestamp: new Date()
    });
  }

  /**
   * Generic broadcast to room
   */
  private broadcast(room: string, event: string, data: unknown): void {
    if (!this.io) {
      console.warn('[WebSocket] Server not initialized');
      return;
    }

    this.io.to(room).emit(event, data);
  }

  /**
   * Send to specific user
   */
  sendToUser(userId: string, event: string, data: unknown): void {
    if (!this.io) return;

    for (const [socketId, client] of Array.from(this.clients.entries())) {
      if (client.userId === userId) {
        this.io.to(socketId).emit(event, data);
      }
    }
  }

  // ==================== Utility Methods ====================

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  /**
   * Get authenticated clients count
   */
  getAuthenticatedClientsCount(): number {
    let count = 0;
    for (const client of Array.from(this.clients.values())) {
      if (client.authenticated) count++
    }
    return count;
  }

  /**
   * Get room subscribers count
   */
  getRoomSubscribersCount(room: string): number {
    let count = 0;
    for (const client of Array.from(this.clients.values())) {
      if (client.rooms.has(room)) count++
    }
    return count;
  }

  /**
   * Get server stats
   */
  getStats(): {
    totalConnections: number;
    authenticatedConnections: number;
    roomStats: Record<string, number>;
  } {
    const roomStats: Record<string, number> = {};
    
    for (const room of Object.values(WebSocketRoom)) {
      roomStats[room] = this.getRoomSubscribersCount(room);
    }

    return {
      totalConnections: this.getConnectedClientsCount(),
      authenticatedConnections: this.getAuthenticatedClientsCount(),
      roomStats
    };
  }

  /**
   * Shutdown server
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.io) {
      this.io.close();
    }

    this.clients.clear();
    console.log('[WebSocket] Server shutdown');
  }
}

// Singleton instance
export const webSocketServer = new WebSocketServer();
