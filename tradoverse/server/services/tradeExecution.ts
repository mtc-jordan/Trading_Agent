/**
 * Trade Execution Service
 * Executes simulated trades through connected brokers
 */

import { getDb } from '../db';
import { brokerConnections, orderExecutions } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

// Types
export interface ExecutionTrade {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  estimatedPrice: number;
  orderType?: 'market' | 'limit' | 'stop' | 'stop_limit';
  limitPrice?: number;
  stopPrice?: number;
  timeInForce?: 'day' | 'gtc' | 'ioc' | 'fok';
}

export interface ExecutionRequest {
  userId: string;
  connectionId: string;
  trades: ExecutionTrade[];
  simulationId?: string;
  dryRun?: boolean;
}

export interface ExecutionResult {
  executionId: string;
  connectionId: string;
  brokerType: string;
  status: 'pending' | 'partial' | 'filled' | 'rejected' | 'cancelled';
  trades: TradeResult[];
  totalValue: number;
  totalCommission: number;
  executedAt: string;
  errors: string[];
}

export interface TradeResult {
  symbol: string;
  side: 'buy' | 'sell';
  requestedQuantity: number;
  filledQuantity: number;
  avgFillPrice: number;
  commission: number;
  status: 'filled' | 'partial' | 'rejected' | 'pending';
  orderId: string;
  errorMessage?: string;
}

// Broker-specific order formatters
const BROKER_ORDER_FORMATS = {
  alpaca: {
    formatOrder: (trade: ExecutionTrade) => ({
      symbol: trade.symbol,
      qty: trade.quantity.toString(),
      side: trade.side,
      type: trade.orderType || 'market',
      time_in_force: trade.timeInForce || 'day',
      limit_price: trade.limitPrice?.toString(),
      stop_price: trade.stopPrice?.toString(),
    }),
    parseResponse: (response: Record<string, unknown>) => ({
      orderId: response.id as string,
      status: mapAlpacaStatus(response.status as string),
      filledQty: parseFloat(response.filled_qty as string || '0'),
      avgFillPrice: parseFloat(response.filled_avg_price as string || '0'),
    }),
  },
  interactive_brokers: {
    formatOrder: (trade: ExecutionTrade) => ({
      conid: trade.symbol, // Would need symbol to conid mapping
      side: trade.side.toUpperCase(),
      quantity: trade.quantity,
      orderType: mapIBOrderType(trade.orderType || 'market'),
      tif: mapIBTimeInForce(trade.timeInForce || 'day'),
      price: trade.limitPrice,
      auxPrice: trade.stopPrice,
    }),
    parseResponse: (response: Record<string, unknown>) => ({
      orderId: response.orderId as string,
      status: mapIBStatus(response.status as string),
      filledQty: response.filledQuantity as number || 0,
      avgFillPrice: response.avgFillPrice as number || 0,
    }),
  },
  binance: {
    formatOrder: (trade: ExecutionTrade) => ({
      symbol: trade.symbol.replace('/', ''),
      side: trade.side.toUpperCase(),
      type: mapBinanceOrderType(trade.orderType || 'market'),
      quantity: trade.quantity.toString(),
      price: trade.limitPrice?.toString(),
      stopPrice: trade.stopPrice?.toString(),
      timeInForce: trade.orderType === 'limit' ? 'GTC' : undefined,
    }),
    parseResponse: (response: Record<string, unknown>) => ({
      orderId: response.orderId?.toString() || '',
      status: mapBinanceStatus(response.status as string),
      filledQty: parseFloat(response.executedQty as string || '0'),
      avgFillPrice: parseFloat(response.price as string || '0'),
    }),
  },
  coinbase: {
    formatOrder: (trade: ExecutionTrade) => ({
      product_id: trade.symbol.replace('/', '-'),
      side: trade.side,
      order_configuration: {
        market_market_ioc: trade.orderType === 'market' ? {
          quote_size: (trade.quantity * trade.estimatedPrice).toString(),
        } : undefined,
        limit_limit_gtc: trade.orderType === 'limit' ? {
          base_size: trade.quantity.toString(),
          limit_price: trade.limitPrice?.toString(),
        } : undefined,
      },
    }),
    parseResponse: (response: Record<string, unknown>) => ({
      orderId: response.order_id as string || '',
      status: mapCoinbaseStatus(response.status as string),
      filledQty: parseFloat(response.filled_size as string || '0'),
      avgFillPrice: parseFloat(response.average_filled_price as string || '0'),
    }),
  },
};

// Status mappers
function mapAlpacaStatus(status: string): TradeResult['status'] {
  const statusMap: Record<string, TradeResult['status']> = {
    'filled': 'filled',
    'partially_filled': 'partial',
    'new': 'pending',
    'accepted': 'pending',
    'pending_new': 'pending',
    'rejected': 'rejected',
    'canceled': 'rejected',
    'expired': 'rejected',
  };
  return statusMap[status] || 'pending';
}

function mapIBStatus(status: string): TradeResult['status'] {
  const statusMap: Record<string, TradeResult['status']> = {
    'Filled': 'filled',
    'PartiallyFilled': 'partial',
    'Submitted': 'pending',
    'PreSubmitted': 'pending',
    'Cancelled': 'rejected',
    'Inactive': 'rejected',
  };
  return statusMap[status] || 'pending';
}

function mapBinanceStatus(status: string): TradeResult['status'] {
  const statusMap: Record<string, TradeResult['status']> = {
    'FILLED': 'filled',
    'PARTIALLY_FILLED': 'partial',
    'NEW': 'pending',
    'CANCELED': 'rejected',
    'REJECTED': 'rejected',
    'EXPIRED': 'rejected',
  };
  return statusMap[status] || 'pending';
}

function mapCoinbaseStatus(status: string): TradeResult['status'] {
  const statusMap: Record<string, TradeResult['status']> = {
    'FILLED': 'filled',
    'OPEN': 'pending',
    'PENDING': 'pending',
    'CANCELLED': 'rejected',
    'FAILED': 'rejected',
  };
  return statusMap[status] || 'pending';
}

function mapIBOrderType(type: string): string {
  const typeMap: Record<string, string> = {
    'market': 'MKT',
    'limit': 'LMT',
    'stop': 'STP',
    'stop_limit': 'STP LMT',
  };
  return typeMap[type] || 'MKT';
}

function mapIBTimeInForce(tif: string): string {
  const tifMap: Record<string, string> = {
    'day': 'DAY',
    'gtc': 'GTC',
    'ioc': 'IOC',
    'fok': 'FOK',
  };
  return tifMap[tif] || 'DAY';
}

function mapBinanceOrderType(type: string): string {
  const typeMap: Record<string, string> = {
    'market': 'MARKET',
    'limit': 'LIMIT',
    'stop': 'STOP_LOSS',
    'stop_limit': 'STOP_LOSS_LIMIT',
  };
  return typeMap[type] || 'MARKET';
}

// Generate unique execution ID
function generateExecutionId(): string {
  return 'exec-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Validate trades before execution
export function validateTrades(trades: ExecutionTrade[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const trade of trades) {
    if (!trade.symbol || trade.symbol.trim() === '') {
      errors.push(`Invalid symbol for trade`);
    }
    if (!trade.side || !['buy', 'sell'].includes(trade.side)) {
      errors.push(`Invalid side for ${trade.symbol}: ${trade.side}`);
    }
    if (!trade.quantity || trade.quantity <= 0) {
      errors.push(`Invalid quantity for ${trade.symbol}: ${trade.quantity}`);
    }
    if (trade.orderType === 'limit' && !trade.limitPrice) {
      errors.push(`Limit price required for limit order on ${trade.symbol}`);
    }
    if (trade.orderType === 'stop' && !trade.stopPrice) {
      errors.push(`Stop price required for stop order on ${trade.symbol}`);
    }
    if (trade.orderType === 'stop_limit' && (!trade.limitPrice || !trade.stopPrice)) {
      errors.push(`Both limit and stop prices required for stop-limit order on ${trade.symbol}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// Execute trades through broker
export async function executeTrades(request: ExecutionRequest): Promise<ExecutionResult> {
  const db = await getDb();
  const executionId = generateExecutionId();
  const errors: string[] = [];
  
  if (!db) {
    return {
      executionId,
      connectionId: request.connectionId,
      brokerType: 'unknown',
      status: 'rejected',
      trades: [],
      totalValue: 0,
      totalCommission: 0,
      executedAt: new Date().toISOString(),
      errors: ['Database not available'],
    };
  }
  const tradeResults: TradeResult[] = [];
  
  // Validate trades
  const validation = validateTrades(request.trades);
  if (!validation.valid) {
    return {
      executionId,
      connectionId: request.connectionId,
      brokerType: 'unknown',
      status: 'rejected',
      trades: [],
      totalValue: 0,
      totalCommission: 0,
      executedAt: new Date().toISOString(),
      errors: validation.errors,
    };
  }
  
  // Get broker connection
  const connections = await db
    .select()
    .from(brokerConnections)
    .where(and(
      eq(brokerConnections.id, request.connectionId),
      eq(brokerConnections.userId, request.userId)
    ));
  
  if (connections.length === 0) {
    return {
      executionId,
      connectionId: request.connectionId,
      brokerType: 'unknown',
      status: 'rejected',
      trades: [],
      totalValue: 0,
      totalCommission: 0,
      executedAt: new Date().toISOString(),
      errors: ['Broker connection not found'],
    };
  }
  
  const connection = connections[0];
  const brokerType = connection.brokerType as keyof typeof BROKER_ORDER_FORMATS;
  
  // Check if connection is active
  if (!connection.isActive) {
    return {
      executionId,
      connectionId: request.connectionId,
      brokerType,
      status: 'rejected',
      trades: [],
      totalValue: 0,
      totalCommission: 0,
      executedAt: new Date().toISOString(),
      errors: ['Broker connection is not active'],
    };
  }
  
  // Dry run mode - simulate execution without actually placing orders
  if (request.dryRun) {
    for (const trade of request.trades) {
      const commission = calculateCommission(brokerType, trade);
      tradeResults.push({
        symbol: trade.symbol,
        side: trade.side,
        requestedQuantity: trade.quantity,
        filledQuantity: trade.quantity,
        avgFillPrice: trade.estimatedPrice,
        commission,
        status: 'filled',
        orderId: 'dry-run-' + generateExecutionId(),
      });
    }
    
    const totalValue = tradeResults.reduce((sum, t) => sum + t.filledQuantity * t.avgFillPrice, 0);
    const totalCommission = tradeResults.reduce((sum, t) => sum + t.commission, 0);
    
    return {
      executionId,
      connectionId: request.connectionId,
      brokerType,
      status: 'filled',
      trades: tradeResults,
      totalValue,
      totalCommission,
      executedAt: new Date().toISOString(),
      errors: [],
    };
  }
  
  // Execute each trade
  for (const trade of request.trades) {
    try {
      const result = await executeTradeWithBroker(connection, trade, brokerType);
      tradeResults.push(result);
      
      // Record execution in database
      const executionValue = result.filledQuantity * result.avgFillPrice;
      await db.insert(orderExecutions).values({
        id: generateExecutionId(),
        orderId: result.orderId,
        userId: request.userId,
        connectionId: request.connectionId,
        symbol: trade.symbol,
        side: trade.side,
        orderType: trade.orderType || 'market',
        executedQuantity: result.filledQuantity.toString(),
        executedPrice: result.avgFillPrice.toString(),
        executionValue: executionValue.toString(),
        commission: result.commission.toString(),
        fees: '0',
        totalCost: (executionValue + result.commission).toString(),
        executedAt: new Date(),
        createdAt: new Date(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to execute ${trade.side} ${trade.quantity} ${trade.symbol}: ${errorMessage}`);
      
      tradeResults.push({
        symbol: trade.symbol,
        side: trade.side,
        requestedQuantity: trade.quantity,
        filledQuantity: 0,
        avgFillPrice: 0,
        commission: 0,
        status: 'rejected',
        orderId: '',
        errorMessage,
      });
    }
  }
  
  // Calculate totals
  const totalValue = tradeResults.reduce((sum, t) => sum + t.filledQuantity * t.avgFillPrice, 0);
  const totalCommission = tradeResults.reduce((sum, t) => sum + t.commission, 0);
  
  // Determine overall status
  const filledCount = tradeResults.filter(t => t.status === 'filled').length;
  const partialCount = tradeResults.filter(t => t.status === 'partial').length;
  const rejectedCount = tradeResults.filter(t => t.status === 'rejected').length;
  
  let status: ExecutionResult['status'] = 'pending';
  if (filledCount === tradeResults.length) {
    status = 'filled';
  } else if (rejectedCount === tradeResults.length) {
    status = 'rejected';
  } else if (filledCount > 0 || partialCount > 0) {
    status = 'partial';
  }
  
  return {
    executionId,
    connectionId: request.connectionId,
    brokerType,
    status,
    trades: tradeResults,
    totalValue,
    totalCommission,
    executedAt: new Date().toISOString(),
    errors,
  };
}

// Execute single trade with broker
async function executeTradeWithBroker(
  connection: typeof brokerConnections.$inferSelect,
  trade: ExecutionTrade,
  brokerType: keyof typeof BROKER_ORDER_FORMATS
): Promise<TradeResult> {
  // In a real implementation, this would make API calls to the broker
  // For now, we simulate successful execution
  
  const commission = calculateCommission(brokerType, trade);
  
  // Simulate slight price slippage
  const slippage = trade.side === 'buy' ? 1.001 : 0.999;
  const fillPrice = trade.orderType === 'market' 
    ? trade.estimatedPrice * slippage 
    : trade.limitPrice || trade.estimatedPrice;
  
  // Simulate execution delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return {
    symbol: trade.symbol,
    side: trade.side,
    requestedQuantity: trade.quantity,
    filledQuantity: trade.quantity,
    avgFillPrice: fillPrice,
    commission,
    status: 'filled',
    orderId: `${brokerType}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
  };
}

// Calculate commission based on broker
function calculateCommission(brokerType: string, trade: ExecutionTrade): number {
  const tradeValue = trade.quantity * trade.estimatedPrice;
  
  const commissionRates: Record<string, { perShare: number; min: number; max: number; percent: number }> = {
    alpaca: { perShare: 0, min: 0, max: 0, percent: 0 }, // Commission-free
    interactive_brokers: { perShare: 0.005, min: 1, max: 0.5, percent: 0.005 },
    binance: { perShare: 0, min: 0, max: 0, percent: 0.001 }, // 0.1%
    coinbase: { perShare: 0, min: 0, max: 0, percent: 0.006 }, // 0.6%
  };
  
  const rate = commissionRates[brokerType] || { perShare: 0.01, min: 1, max: 0, percent: 0 };
  
  if (rate.percent > 0) {
    return tradeValue * rate.percent;
  }
  
  const perShareCommission = trade.quantity * rate.perShare;
  return Math.max(rate.min, Math.min(perShareCommission, rate.max > 0 ? tradeValue * rate.max : Infinity));
}

// Get execution history
export async function getExecutionHistory(
  userId: string,
  options: {
    connectionId?: string;
    symbol?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ executions: typeof orderExecutions.$inferSelect[]; total: number }> {
  const db = await getDb();
  
  if (!db) {
    return { executions: [], total: 0 };
  }
  
  const executions = await db
    .select()
    .from(orderExecutions)
    .where(eq(orderExecutions.userId, userId))
    .orderBy(orderExecutions.executedAt)
    .limit(options.limit || 50)
    .offset(options.offset || 0);
  
  // Get total count
  const countResult = await db
    .select()
    .from(orderExecutions)
    .where(eq(orderExecutions.userId, userId));
  
  return {
    executions,
    total: countResult.length,
  };
}

// Cancel pending order
export async function cancelOrder(
  userId: string,
  executionId: string
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  
  if (!db) {
    return { success: false, message: 'Database not available' };
  }
  
  const executions = await db
    .select()
    .from(orderExecutions)
    .where(and(
      eq(orderExecutions.id, executionId),
      eq(orderExecutions.userId, userId)
    ));
  
  if (executions.length === 0) {
    return { success: false, message: 'Execution not found' };
  }
  
  // In a real implementation, this would call the broker API to cancel
  // For now, we just return success
  
  return { success: true, message: 'Order cancelled successfully' };
}
