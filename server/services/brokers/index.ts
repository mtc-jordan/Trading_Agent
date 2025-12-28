/**
 * Broker Module Exports
 * 
 * This file provides a clean public API for the broker abstraction layer.
 */

// Types
export * from './types';

// Interfaces
export { IBrokerAdapter, BaseBrokerAdapter } from './IBrokerAdapter';

// Adapters
export { AlpacaAdapter, createAlpacaAdapter } from './AlpacaAdapter';
export { IBKRAdapter, createIBKRAdapter } from './IBKRAdapter';

// Factory and Manager
export {
  BrokerFactory,
  BrokerManager,
  getBrokerManager,
  resetBrokerManager,
  getOAuthUrl,
  compareBrokerCapabilities,
  findBestBroker,
  BROKER_INFO
} from './BrokerFactory';
