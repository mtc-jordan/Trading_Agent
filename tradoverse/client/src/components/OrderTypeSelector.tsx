/**
 * Order Type Selector Component
 * Broker-aware order type selection with dynamic form fields
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Info, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Zap,
  Target,
  Shield,
  BarChart3
} from 'lucide-react';
import {
  BROKER_ORDER_TYPES,
  ORDER_FIELDS,
  TIME_IN_FORCE_OPTIONS,
  getOrderTypesForBroker,
  getOrderTypeById,
  getRequiredFieldsForOrderType,
  getOptionalFieldsForOrderType,
  validateOrderFields,
  type OrderTypeConfig,
  type OrderFieldConfig,
} from '../../../shared/orderTypes';

interface OrderTypeSelectorProps {
  brokerType: string;
  side: 'buy' | 'sell';
  symbol: string;
  currentPrice?: number;
  onOrderChange?: (order: OrderFormData) => void;
  onSubmit?: (order: OrderFormData) => void;
  disabled?: boolean;
}

export interface OrderFormData {
  orderType: string;
  side: 'buy' | 'sell';
  symbol: string;
  timeInForce: string;
  quantity?: number;
  limitPrice?: number;
  stopPrice?: number;
  trailPercent?: number;
  trailPrice?: number;
  trailAmount?: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  stopLossLimitPrice?: number;
  stopLimitPrice?: number;
  extendedHours?: boolean;
  outsideRth?: boolean;
  postOnly?: boolean;
  adaptivePriority?: string;
  startTime?: string;
  endTime?: string;
  allowPastEndTime?: boolean;
  maxPctVol?: number;
}

const ORDER_TYPE_ICONS: Record<string, React.ReactNode> = {
  market: <Zap className="h-4 w-4" />,
  limit: <Target className="h-4 w-4" />,
  stop: <Shield className="h-4 w-4" />,
  stop_limit: <Shield className="h-4 w-4" />,
  trailing_stop: <TrendingDown className="h-4 w-4" />,
  bracket: <BarChart3 className="h-4 w-4" />,
  adaptive: <Zap className="h-4 w-4" />,
  twap: <Clock className="h-4 w-4" />,
  vwap: <BarChart3 className="h-4 w-4" />,
  stop_loss: <Shield className="h-4 w-4" />,
  stop_loss_limit: <Shield className="h-4 w-4" />,
  take_profit: <Target className="h-4 w-4" />,
  take_profit_limit: <Target className="h-4 w-4" />,
  oco: <BarChart3 className="h-4 w-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  basic: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  advanced: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  algorithmic: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
};

export function OrderTypeSelector({
  brokerType,
  side,
  symbol,
  currentPrice,
  onOrderChange,
  onSubmit,
  disabled = false,
}: OrderTypeSelectorProps) {
  // Get available order types for this broker
  const orderTypes = useMemo(() => getOrderTypesForBroker(brokerType), [brokerType]);
  
  // Group order types by category
  const orderTypesByCategory = useMemo(() => {
    const grouped: Record<string, OrderTypeConfig[]> = {
      basic: [],
      advanced: [],
      algorithmic: [],
    };
    
    for (const orderType of orderTypes) {
      grouped[orderType.category].push(orderType);
    }
    
    return grouped;
  }, [orderTypes]);
  
  // Form state
  const [selectedOrderType, setSelectedOrderType] = useState<string>('market');
  const [timeInForce, setTimeInForce] = useState<string>('day');
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeCategory, setActiveCategory] = useState<string>('basic');
  
  // Get current order type config
  const currentOrderType = useMemo(
    () => getOrderTypeById(brokerType, selectedOrderType),
    [brokerType, selectedOrderType]
  );
  
  // Get fields for current order type
  const requiredFields = useMemo(
    () => getRequiredFieldsForOrderType(brokerType, selectedOrderType),
    [brokerType, selectedOrderType]
  );
  
  const optionalFields = useMemo(
    () => getOptionalFieldsForOrderType(brokerType, selectedOrderType),
    [brokerType, selectedOrderType]
  );
  
  // Reset form when order type changes
  useEffect(() => {
    setFieldValues({});
    setErrors({});
    
    // Set default time in force
    if (currentOrderType?.supportedTimeInForce.length) {
      setTimeInForce(currentOrderType.supportedTimeInForce[0]);
    }
  }, [selectedOrderType, currentOrderType]);
  
  // Notify parent of order changes
  useEffect(() => {
    if (onOrderChange) {
      onOrderChange({
        orderType: selectedOrderType,
        side,
        symbol,
        timeInForce,
        ...fieldValues,
      });
    }
  }, [selectedOrderType, side, symbol, timeInForce, fieldValues, onOrderChange]);
  
  // Handle field value change
  const handleFieldChange = (fieldId: string, value: any) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
    
    // Clear error for this field
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };
  
  // Handle form submission
  const handleSubmit = () => {
    const validation = validateOrderFields(brokerType, selectedOrderType, fieldValues);
    
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    
    if (onSubmit) {
      onSubmit({
        orderType: selectedOrderType,
        side,
        symbol,
        timeInForce,
        ...fieldValues,
      });
    }
  };
  
  // Render a single field
  const renderField = (field: OrderFieldConfig, isRequired: boolean) => {
    const value = fieldValues[field.id];
    const error = errors[field.id];
    
    return (
      <div key={field.id} className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={field.id} className="text-sm">
            {field.name}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {field.tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{field.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        {field.type === 'number' && (
          <div className="relative">
            {field.unit && field.unit !== '%' && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {field.unit}
              </span>
            )}
            <Input
              id={field.id}
              type="number"
              value={value ?? ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value ? Number(e.target.value) : undefined)}
              placeholder={field.placeholder}
              min={field.min}
              max={field.max}
              step={field.step}
              disabled={disabled}
              className={`${field.unit && field.unit !== '%' ? 'pl-7' : ''} ${error ? 'border-red-500' : ''}`}
            />
            {field.unit === '%' && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                %
              </span>
            )}
          </div>
        )}
        
        {field.type === 'text' && (
          <Input
            id={field.id}
            type="text"
            value={value ?? ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            className={error ? 'border-red-500' : ''}
          />
        )}
        
        {field.type === 'checkbox' && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={value ?? false}
              onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
              disabled={disabled}
            />
            <Label htmlFor={field.id} className="text-sm text-muted-foreground cursor-pointer">
              Enable
            </Label>
          </div>
        )}
        
        {field.type === 'select' && field.options && (
          <Select
            value={value ?? ''}
            onValueChange={(val) => handleFieldChange(field.id, val)}
            disabled={disabled}
          >
            <SelectTrigger className={error ? 'border-red-500' : ''}>
              <SelectValue placeholder={`Select ${field.name.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}
      </div>
    );
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {side === 'buy' ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
              {side === 'buy' ? 'Buy' : 'Sell'} {symbol}
            </CardTitle>
            <CardDescription>
              {currentPrice && `Current price: $${currentPrice.toFixed(2)}`}
            </CardDescription>
          </div>
          <Badge variant="outline" className="capitalize">
            {brokerType.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Order Type Selection */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic" disabled={orderTypesByCategory.basic.length === 0}>
              Basic
            </TabsTrigger>
            <TabsTrigger value="advanced" disabled={orderTypesByCategory.advanced.length === 0}>
              Advanced
            </TabsTrigger>
            <TabsTrigger value="algorithmic" disabled={orderTypesByCategory.algorithmic.length === 0}>
              Algo
            </TabsTrigger>
          </TabsList>
          
          {Object.entries(orderTypesByCategory).map(([category, types]) => (
            <TabsContent key={category} value={category} className="mt-3">
              <div className="grid grid-cols-2 gap-2">
                {types.map((orderType) => (
                  <Button
                    key={orderType.id}
                    variant={selectedOrderType === orderType.id ? 'default' : 'outline'}
                    className="h-auto py-2 px-3 justify-start"
                    onClick={() => setSelectedOrderType(orderType.id)}
                    disabled={disabled}
                  >
                    <div className="flex items-center gap-2">
                      {ORDER_TYPE_ICONS[orderType.id] || <Target className="h-4 w-4" />}
                      <div className="text-left">
                        <div className="text-sm font-medium">{orderType.name}</div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
        
        {/* Order Type Description */}
        {currentOrderType && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {currentOrderType.description}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Time in Force */}
        {currentOrderType && currentOrderType.supportedTimeInForce.length > 1 && (
          <div className="space-y-2">
            <Label className="text-sm">Time in Force</Label>
            <Select value={timeInForce} onValueChange={setTimeInForce} disabled={disabled}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_IN_FORCE_OPTIONS
                  .filter(opt => currentOrderType.supportedTimeInForce.includes(opt.value))
                  .map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {/* Required Fields */}
        {requiredFields.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Required Fields</h4>
            <div className="grid gap-3">
              {requiredFields.map((field) => renderField(field, true))}
            </div>
          </div>
        )}
        
        {/* Optional Fields */}
        {optionalFields.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Optional Fields</h4>
            <div className="grid gap-3">
              {optionalFields.map((field) => renderField(field, false))}
            </div>
          </div>
        )}
        
        {/* Submit Button */}
        <Button
          className="w-full"
          variant={side === 'buy' ? 'default' : 'destructive'}
          onClick={handleSubmit}
          disabled={disabled}
        >
          {side === 'buy' ? 'Place Buy Order' : 'Place Sell Order'}
        </Button>
        
        {/* Validation Errors Summary */}
        {Object.keys(errors).length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please fix the errors above before submitting.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default OrderTypeSelector;
