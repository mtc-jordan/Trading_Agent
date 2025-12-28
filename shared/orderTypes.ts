/**
 * Broker-Specific Order Types Configuration
 * Defines available order types for each supported broker
 */

// Base order type definition
export interface OrderTypeConfig {
  id: string;
  name: string;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  category: 'basic' | 'advanced' | 'algorithmic';
  supportedTimeInForce: string[];
}

// Field definition for order forms
export interface OrderFieldConfig {
  id: string;
  name: string;
  type: 'number' | 'select' | 'checkbox' | 'text';
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string; label: string }>;
  tooltip?: string;
  unit?: string;
  validation?: {
    required?: boolean;
    minValue?: number;
    maxValue?: number;
    pattern?: string;
  };
}

// Broker order types configuration
export const BROKER_ORDER_TYPES: Record<string, OrderTypeConfig[]> = {
  alpaca: [
    {
      id: 'market',
      name: 'Market Order',
      description: 'Execute immediately at the best available price',
      requiredFields: ['quantity'],
      optionalFields: ['extendedHours'],
      category: 'basic',
      supportedTimeInForce: ['day', 'gtc', 'ioc', 'fok'],
    },
    {
      id: 'limit',
      name: 'Limit Order',
      description: 'Execute at a specified price or better',
      requiredFields: ['quantity', 'limitPrice'],
      optionalFields: ['extendedHours'],
      category: 'basic',
      supportedTimeInForce: ['day', 'gtc', 'ioc', 'fok'],
    },
    {
      id: 'stop',
      name: 'Stop Order',
      description: 'Trigger a market order when price reaches stop price',
      requiredFields: ['quantity', 'stopPrice'],
      optionalFields: ['extendedHours'],
      category: 'basic',
      supportedTimeInForce: ['day', 'gtc'],
    },
    {
      id: 'stop_limit',
      name: 'Stop Limit Order',
      description: 'Trigger a limit order when price reaches stop price',
      requiredFields: ['quantity', 'stopPrice', 'limitPrice'],
      optionalFields: ['extendedHours'],
      category: 'basic',
      supportedTimeInForce: ['day', 'gtc'],
    },
    {
      id: 'trailing_stop',
      name: 'Trailing Stop Order',
      description: 'Stop price trails the market price by a specified amount or percentage',
      requiredFields: ['quantity', 'trailPercent'],
      optionalFields: ['trailPrice', 'extendedHours'],
      category: 'advanced',
      supportedTimeInForce: ['day', 'gtc'],
    },
    {
      id: 'bracket',
      name: 'Bracket Order (OCO)',
      description: 'Entry order with attached take-profit and stop-loss orders',
      requiredFields: ['quantity', 'takeProfitPrice', 'stopLossPrice'],
      optionalFields: ['limitPrice', 'stopLossLimitPrice'],
      category: 'advanced',
      supportedTimeInForce: ['day', 'gtc'],
    },
  ],
  
  interactive_brokers: [
    {
      id: 'market',
      name: 'Market Order',
      description: 'Execute immediately at the best available price',
      requiredFields: ['quantity'],
      optionalFields: ['outsideRth'],
      category: 'basic',
      supportedTimeInForce: ['day', 'gtc', 'ioc', 'fok'],
    },
    {
      id: 'limit',
      name: 'Limit Order',
      description: 'Execute at a specified price or better',
      requiredFields: ['quantity', 'limitPrice'],
      optionalFields: ['outsideRth'],
      category: 'basic',
      supportedTimeInForce: ['day', 'gtc', 'ioc', 'fok'],
    },
    {
      id: 'stop',
      name: 'Stop Order',
      description: 'Trigger a market order when price reaches stop price',
      requiredFields: ['quantity', 'stopPrice'],
      optionalFields: ['outsideRth'],
      category: 'basic',
      supportedTimeInForce: ['day', 'gtc'],
    },
    {
      id: 'stop_limit',
      name: 'Stop Limit Order',
      description: 'Trigger a limit order when price reaches stop price',
      requiredFields: ['quantity', 'stopPrice', 'limitPrice'],
      optionalFields: ['outsideRth'],
      category: 'basic',
      supportedTimeInForce: ['day', 'gtc'],
    },
    {
      id: 'trailing_stop',
      name: 'Trailing Stop Order',
      description: 'Stop price trails the market price',
      requiredFields: ['quantity', 'trailAmount'],
      optionalFields: ['trailPercent', 'outsideRth'],
      category: 'advanced',
      supportedTimeInForce: ['day', 'gtc'],
    },
    {
      id: 'bracket',
      name: 'Bracket Order',
      description: 'Entry with take-profit and stop-loss',
      requiredFields: ['quantity', 'takeProfitPrice', 'stopLossPrice'],
      optionalFields: ['limitPrice'],
      category: 'advanced',
      supportedTimeInForce: ['day', 'gtc'],
    },
    {
      id: 'adaptive',
      name: 'Adaptive Order',
      description: 'IB algorithm that seeks best execution',
      requiredFields: ['quantity', 'limitPrice'],
      optionalFields: ['adaptivePriority'],
      category: 'algorithmic',
      supportedTimeInForce: ['day', 'gtc'],
    },
    {
      id: 'twap',
      name: 'TWAP Order',
      description: 'Time-Weighted Average Price algorithm',
      requiredFields: ['quantity', 'startTime', 'endTime'],
      optionalFields: ['limitPrice', 'allowPastEndTime'],
      category: 'algorithmic',
      supportedTimeInForce: ['day'],
    },
    {
      id: 'vwap',
      name: 'VWAP Order',
      description: 'Volume-Weighted Average Price algorithm',
      requiredFields: ['quantity', 'startTime', 'endTime'],
      optionalFields: ['limitPrice', 'maxPctVol'],
      category: 'algorithmic',
      supportedTimeInForce: ['day'],
    },
  ],
  
  binance: [
    {
      id: 'market',
      name: 'Market Order',
      description: 'Execute immediately at the best available price',
      requiredFields: ['quantity'],
      optionalFields: [],
      category: 'basic',
      supportedTimeInForce: ['gtc'],
    },
    {
      id: 'limit',
      name: 'Limit Order',
      description: 'Execute at a specified price or better',
      requiredFields: ['quantity', 'limitPrice'],
      optionalFields: [],
      category: 'basic',
      supportedTimeInForce: ['gtc', 'ioc', 'fok'],
    },
    {
      id: 'stop_loss',
      name: 'Stop Loss Order',
      description: 'Trigger a market order when price drops to stop price',
      requiredFields: ['quantity', 'stopPrice'],
      optionalFields: [],
      category: 'basic',
      supportedTimeInForce: ['gtc'],
    },
    {
      id: 'stop_loss_limit',
      name: 'Stop Loss Limit Order',
      description: 'Trigger a limit order when price drops to stop price',
      requiredFields: ['quantity', 'stopPrice', 'limitPrice'],
      optionalFields: [],
      category: 'basic',
      supportedTimeInForce: ['gtc'],
    },
    {
      id: 'take_profit',
      name: 'Take Profit Order',
      description: 'Trigger a market order when price rises to target',
      requiredFields: ['quantity', 'stopPrice'],
      optionalFields: [],
      category: 'basic',
      supportedTimeInForce: ['gtc'],
    },
    {
      id: 'take_profit_limit',
      name: 'Take Profit Limit Order',
      description: 'Trigger a limit order when price rises to target',
      requiredFields: ['quantity', 'stopPrice', 'limitPrice'],
      optionalFields: [],
      category: 'basic',
      supportedTimeInForce: ['gtc'],
    },
    {
      id: 'oco',
      name: 'OCO Order',
      description: 'One-Cancels-Other: Limit + Stop Loss Limit',
      requiredFields: ['quantity', 'limitPrice', 'stopPrice', 'stopLimitPrice'],
      optionalFields: [],
      category: 'advanced',
      supportedTimeInForce: ['gtc'],
    },
  ],
  
  coinbase: [
    {
      id: 'market',
      name: 'Market Order',
      description: 'Execute immediately at the best available price',
      requiredFields: ['quantity'],
      optionalFields: [],
      category: 'basic',
      supportedTimeInForce: ['gtc', 'ioc', 'fok'],
    },
    {
      id: 'limit',
      name: 'Limit Order',
      description: 'Execute at a specified price or better',
      requiredFields: ['quantity', 'limitPrice'],
      optionalFields: ['postOnly'],
      category: 'basic',
      supportedTimeInForce: ['gtc', 'ioc', 'fok'],
    },
    {
      id: 'stop',
      name: 'Stop Order',
      description: 'Trigger a market order when price reaches stop price',
      requiredFields: ['quantity', 'stopPrice'],
      optionalFields: [],
      category: 'basic',
      supportedTimeInForce: ['gtc'],
    },
  ],
};

// Order field configurations
export const ORDER_FIELDS: Record<string, OrderFieldConfig> = {
  quantity: {
    id: 'quantity',
    name: 'Quantity',
    type: 'number',
    placeholder: 'Enter quantity',
    min: 0.00001,
    step: 0.00001,
    tooltip: 'Number of shares or units to trade',
    validation: { required: true, minValue: 0.00001 },
  },
  limitPrice: {
    id: 'limitPrice',
    name: 'Limit Price',
    type: 'number',
    placeholder: 'Enter limit price',
    min: 0.01,
    step: 0.01,
    unit: '$',
    tooltip: 'Maximum price for buy orders, minimum price for sell orders',
    validation: { required: true, minValue: 0.01 },
  },
  stopPrice: {
    id: 'stopPrice',
    name: 'Stop Price',
    type: 'number',
    placeholder: 'Enter stop price',
    min: 0.01,
    step: 0.01,
    unit: '$',
    tooltip: 'Price at which the order is triggered',
    validation: { required: true, minValue: 0.01 },
  },
  trailPercent: {
    id: 'trailPercent',
    name: 'Trail Percent',
    type: 'number',
    placeholder: 'Enter trail %',
    min: 0.1,
    max: 50,
    step: 0.1,
    unit: '%',
    tooltip: 'Percentage to trail behind the market price',
    validation: { required: true, minValue: 0.1, maxValue: 50 },
  },
  trailPrice: {
    id: 'trailPrice',
    name: 'Trail Amount',
    type: 'number',
    placeholder: 'Enter trail amount',
    min: 0.01,
    step: 0.01,
    unit: '$',
    tooltip: 'Dollar amount to trail behind the market price',
    validation: { minValue: 0.01 },
  },
  trailAmount: {
    id: 'trailAmount',
    name: 'Trail Amount',
    type: 'number',
    placeholder: 'Enter trail amount',
    min: 0.01,
    step: 0.01,
    unit: '$',
    tooltip: 'Dollar amount to trail behind the market price',
    validation: { required: true, minValue: 0.01 },
  },
  takeProfitPrice: {
    id: 'takeProfitPrice',
    name: 'Take Profit Price',
    type: 'number',
    placeholder: 'Enter take profit price',
    min: 0.01,
    step: 0.01,
    unit: '$',
    tooltip: 'Price at which to take profits',
    validation: { required: true, minValue: 0.01 },
  },
  stopLossPrice: {
    id: 'stopLossPrice',
    name: 'Stop Loss Price',
    type: 'number',
    placeholder: 'Enter stop loss price',
    min: 0.01,
    step: 0.01,
    unit: '$',
    tooltip: 'Price at which to cut losses',
    validation: { required: true, minValue: 0.01 },
  },
  stopLossLimitPrice: {
    id: 'stopLossLimitPrice',
    name: 'Stop Loss Limit Price',
    type: 'number',
    placeholder: 'Enter stop loss limit price',
    min: 0.01,
    step: 0.01,
    unit: '$',
    tooltip: 'Limit price for stop loss order',
    validation: { minValue: 0.01 },
  },
  stopLimitPrice: {
    id: 'stopLimitPrice',
    name: 'Stop Limit Price',
    type: 'number',
    placeholder: 'Enter stop limit price',
    min: 0.01,
    step: 0.01,
    unit: '$',
    tooltip: 'Limit price for OCO stop order',
    validation: { required: true, minValue: 0.01 },
  },
  extendedHours: {
    id: 'extendedHours',
    name: 'Extended Hours',
    type: 'checkbox',
    tooltip: 'Allow trading during pre-market and after-hours sessions',
  },
  outsideRth: {
    id: 'outsideRth',
    name: 'Outside Regular Hours',
    type: 'checkbox',
    tooltip: 'Allow trading outside regular trading hours',
  },
  postOnly: {
    id: 'postOnly',
    name: 'Post Only',
    type: 'checkbox',
    tooltip: 'Order will only be placed if it will be a maker order',
  },
  adaptivePriority: {
    id: 'adaptivePriority',
    name: 'Adaptive Priority',
    type: 'select',
    options: [
      { value: 'patient', label: 'Patient - Lower cost, slower fill' },
      { value: 'normal', label: 'Normal - Balanced' },
      { value: 'urgent', label: 'Urgent - Faster fill, higher cost' },
    ],
    tooltip: 'Priority level for adaptive algorithm',
  },
  startTime: {
    id: 'startTime',
    name: 'Start Time',
    type: 'text',
    placeholder: 'HH:MM',
    tooltip: 'Algorithm start time (market hours)',
    validation: { required: true, pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' },
  },
  endTime: {
    id: 'endTime',
    name: 'End Time',
    type: 'text',
    placeholder: 'HH:MM',
    tooltip: 'Algorithm end time (market hours)',
    validation: { required: true, pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' },
  },
  allowPastEndTime: {
    id: 'allowPastEndTime',
    name: 'Allow Past End Time',
    type: 'checkbox',
    tooltip: 'Allow algorithm to continue past end time to complete order',
  },
  maxPctVol: {
    id: 'maxPctVol',
    name: 'Max % of Volume',
    type: 'number',
    placeholder: 'Enter max %',
    min: 1,
    max: 50,
    step: 1,
    unit: '%',
    tooltip: 'Maximum percentage of volume to participate in',
    validation: { minValue: 1, maxValue: 50 },
  },
};

// Time in force options
export const TIME_IN_FORCE_OPTIONS = [
  { value: 'day', label: 'Day', description: 'Order expires at end of trading day' },
  { value: 'gtc', label: 'GTC', description: 'Good Till Cancelled - Order remains active until filled or cancelled' },
  { value: 'ioc', label: 'IOC', description: 'Immediate or Cancel - Fill immediately or cancel unfilled portion' },
  { value: 'fok', label: 'FOK', description: 'Fill or Kill - Fill entire order immediately or cancel' },
];

// Helper functions
export function getOrderTypesForBroker(brokerType: string): OrderTypeConfig[] {
  return BROKER_ORDER_TYPES[brokerType] || BROKER_ORDER_TYPES.alpaca;
}

export function getOrderTypeById(brokerType: string, orderTypeId: string): OrderTypeConfig | undefined {
  const orderTypes = getOrderTypesForBroker(brokerType);
  return orderTypes.find(ot => ot.id === orderTypeId);
}

export function getFieldConfig(fieldId: string): OrderFieldConfig | undefined {
  return ORDER_FIELDS[fieldId];
}

export function getRequiredFieldsForOrderType(brokerType: string, orderTypeId: string): OrderFieldConfig[] {
  const orderType = getOrderTypeById(brokerType, orderTypeId);
  if (!orderType) return [];
  
  return orderType.requiredFields
    .map(fieldId => ORDER_FIELDS[fieldId])
    .filter((field): field is OrderFieldConfig => field !== undefined);
}

export function getOptionalFieldsForOrderType(brokerType: string, orderTypeId: string): OrderFieldConfig[] {
  const orderType = getOrderTypeById(brokerType, orderTypeId);
  if (!orderType) return [];
  
  return orderType.optionalFields
    .map(fieldId => ORDER_FIELDS[fieldId])
    .filter((field): field is OrderFieldConfig => field !== undefined);
}

export function getAllFieldsForOrderType(brokerType: string, orderTypeId: string): OrderFieldConfig[] {
  return [
    ...getRequiredFieldsForOrderType(brokerType, orderTypeId),
    ...getOptionalFieldsForOrderType(brokerType, orderTypeId),
  ];
}

export function validateOrderFields(
  brokerType: string, 
  orderTypeId: string, 
  values: Record<string, any>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const requiredFields = getRequiredFieldsForOrderType(brokerType, orderTypeId);
  
  for (const field of requiredFields) {
    const value = values[field.id];
    
    if (field.validation?.required && (value === undefined || value === null || value === '')) {
      errors[field.id] = `${field.name} is required`;
      continue;
    }
    
    if (field.type === 'number' && value !== undefined) {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        errors[field.id] = `${field.name} must be a number`;
      } else if (field.validation?.minValue !== undefined && numValue < field.validation.minValue) {
        errors[field.id] = `${field.name} must be at least ${field.validation.minValue}`;
      } else if (field.validation?.maxValue !== undefined && numValue > field.validation.maxValue) {
        errors[field.id] = `${field.name} must be at most ${field.validation.maxValue}`;
      }
    }
    
    if (field.validation?.pattern && value) {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(String(value))) {
        errors[field.id] = `${field.name} format is invalid`;
      }
    }
  }
  
  return { valid: Object.keys(errors).length === 0, errors };
}
