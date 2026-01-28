/**
 * Unified Blockchain Data Service
 * 
 * Provides a unified interface for accessing blockchain data across
 * multiple chains (Ethereum, Solana, etc.) through various providers.
 * Follows the multiprovider architecture pattern.
 */

import { EtherscanService, createEtherscanService, CHAIN_IDS, ContractVerificationResult, TokenHolderDistribution } from './EtherscanService';
import { SolscanService, createSolscanService, SolanaTokenMetadata, SolanaTokenHolderDistribution } from './SolscanService';

// Supported blockchain networks
export type BlockchainNetwork = 'ethereum' | 'bsc' | 'polygon' | 'arbitrum' | 'optimism' | 'base' | 'solana';

// Provider types
export type BlockchainProvider = 'etherscan' | 'solscan' | 'alchemy' | 'infura' | 'quicknode';

// Unified token info interface
export interface UnifiedTokenInfo {
  network: BlockchainNetwork;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  price: number | null;
  priceChange24h: number | null;
  volume24h: number | null;
  marketCap: number | null;
  holders: number;
  verified: boolean;
  metadata: Record<string, any>;
}

// Unified holder info
export interface UnifiedHolderInfo {
  address: string;
  balance: string;
  share: number;
  rank: number;
}

// Unified holder distribution
export interface UnifiedHolderDistribution {
  network: BlockchainNetwork;
  tokenAddress: string;
  totalHolders: number;
  topHolders: UnifiedHolderInfo[];
  concentration: {
    top10Percent: number;
    top50Percent: number;
    whaleCount: number;
    maxSingleHolderPercent: number;
  };
  riskAssessment: {
    level: 'low' | 'medium' | 'high' | 'critical';
    warnings: string[];
  };
}

// Unified contract verification
export interface UnifiedContractVerification {
  network: BlockchainNetwork;
  address: string;
  verified: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  contractName: string | null;
  warnings: string[];
  details: Record<string, any>;
}

// Provider configuration
export interface ProviderConfig {
  provider: BlockchainProvider;
  apiKey?: string;
  enabled: boolean;
}

// Service configuration
export interface BlockchainDataServiceConfig {
  providers: Partial<Record<BlockchainNetwork, ProviderConfig>>;
  defaultNetwork?: BlockchainNetwork;
  cacheEnabled?: boolean;
  cacheTTL?: number; // seconds
}

// Cache entry
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class BlockchainDataService {
  private config: BlockchainDataServiceConfig;
  private etherscanServices: Map<BlockchainNetwork, EtherscanService> = new Map();
  private solscanService: SolscanService | null = null;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cacheTTL: number;

  constructor(config: BlockchainDataServiceConfig) {
    this.config = config;
    this.cacheTTL = config.cacheTTL || 300; // 5 minutes default
    this.initializeProviders();
  }

  /**
   * Initialize all configured providers
   */
  private initializeProviders(): void {
    const networkToChainId: Record<BlockchainNetwork, number | null> = {
      ethereum: CHAIN_IDS.ETHEREUM,
      bsc: CHAIN_IDS.BSC,
      polygon: CHAIN_IDS.POLYGON,
      arbitrum: CHAIN_IDS.ARBITRUM,
      optimism: CHAIN_IDS.OPTIMISM,
      base: CHAIN_IDS.BASE,
      solana: null, // Solana uses different service
    };

    for (const [network, providerConfig] of Object.entries(this.config.providers)) {
      if (!providerConfig?.enabled) continue;

      const networkKey = network as BlockchainNetwork;

      if (networkKey === 'solana') {
        this.solscanService = createSolscanService(providerConfig.apiKey);
      } else {
        const chainId = networkToChainId[networkKey];
        if (chainId) {
          this.etherscanServices.set(
            networkKey,
            createEtherscanService(providerConfig.apiKey || '', chainId)
          );
        }
      }
    }
  }

  /**
   * Get cached data or fetch new
   */
  private getCached<T>(key: string): T | null {
    if (!this.config.cacheEnabled) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.cacheTTL * 1000) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache entry
   */
  private setCache<T>(key: string, data: T): void {
    if (!this.config.cacheEnabled) return;
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Get Etherscan service for network
   */
  private getEtherscanService(network: BlockchainNetwork): EtherscanService | null {
    return this.etherscanServices.get(network) || null;
  }

  /**
   * Get token information across any supported network
   */
  async getTokenInfo(network: BlockchainNetwork, tokenAddress: string): Promise<UnifiedTokenInfo | null> {
    const cacheKey = `token:${network}:${tokenAddress}`;
    const cached = this.getCached<UnifiedTokenInfo>(cacheKey);
    if (cached) return cached;

    let result: UnifiedTokenInfo | null = null;

    if (network === 'solana') {
      if (!this.solscanService) {
        console.warn('[BlockchainData] Solscan service not configured');
        return null;
      }

      const metadata = await this.solscanService.getTokenMetadata(tokenAddress);
      if (metadata) {
        result = {
          network,
          address: tokenAddress,
          name: metadata.name,
          symbol: metadata.symbol,
          decimals: metadata.decimals,
          totalSupply: metadata.supply,
          price: metadata.price,
          priceChange24h: metadata.priceChange24h,
          volume24h: metadata.volume24h,
          marketCap: metadata.marketCap,
          holders: metadata.holder,
          verified: true, // Solana tokens are inherently "verified"
          metadata: { ...metadata },
        };
      }
    } else {
      const etherscan = this.getEtherscanService(network);
      if (!etherscan) {
        console.warn(`[BlockchainData] Etherscan service not configured for ${network}`);
        return null;
      }

      const verification = await etherscan.getContractSourceCode(tokenAddress);
      const distribution = await etherscan.analyzeHolderDistribution(tokenAddress);

      result = {
        network,
        address: tokenAddress,
        name: verification.contractName || 'Unknown',
        symbol: 'UNKNOWN', // Would need additional API call
        decimals: 18, // Default for ERC20
        totalSupply: '0',
        price: null,
        priceChange24h: null,
        volume24h: null,
        marketCap: null,
        holders: distribution.totalHolders,
        verified: verification.isVerified,
        metadata: { verification },
      };
    }

    if (result) {
      this.setCache(cacheKey, result);
    }

    return result;
  }

  /**
   * Get holder distribution for a token
   */
  async getHolderDistribution(network: BlockchainNetwork, tokenAddress: string): Promise<UnifiedHolderDistribution | null> {
    const cacheKey = `holders:${network}:${tokenAddress}`;
    const cached = this.getCached<UnifiedHolderDistribution>(cacheKey);
    if (cached) return cached;

    let result: UnifiedHolderDistribution | null = null;

    if (network === 'solana') {
      if (!this.solscanService) return null;

      const distribution = await this.solscanService.analyzeHolderDistribution(tokenAddress);
      const maxSingleHolder = distribution.topHolders.length > 0 
        ? distribution.topHolders[0].share 
        : 0;

      result = {
        network,
        tokenAddress,
        totalHolders: distribution.totalHolders,
        topHolders: distribution.topHolders.map((h, i) => ({
          address: h.owner,
          balance: h.amount,
          share: h.share,
          rank: i + 1,
        })),
        concentration: {
          ...distribution.concentration,
          maxSingleHolderPercent: maxSingleHolder,
        },
        riskAssessment: this.assessConcentrationRisk(distribution.concentration, maxSingleHolder),
      };
    } else {
      const etherscan = this.getEtherscanService(network);
      if (!etherscan) return null;

      const distribution = await etherscan.analyzeHolderDistribution(tokenAddress);
      const maxSingleHolder = distribution.topHolders.length > 0 
        ? distribution.topHolders[0].share 
        : 0;

      result = {
        network,
        tokenAddress,
        totalHolders: distribution.totalHolders,
        topHolders: distribution.topHolders.map((h, i) => ({
          address: h.address,
          balance: h.balance,
          share: h.share,
          rank: i + 1,
        })),
        concentration: {
          ...distribution.concentration,
          maxSingleHolderPercent: maxSingleHolder,
        },
        riskAssessment: this.assessConcentrationRisk(distribution.concentration, maxSingleHolder),
      };
    }

    if (result) {
      this.setCache(cacheKey, result);
    }

    return result;
  }

  /**
   * Assess concentration risk based on holder distribution
   */
  private assessConcentrationRisk(
    concentration: { top10Percent: number; top50Percent: number; whaleCount: number },
    maxSingleHolder: number
  ): { level: 'low' | 'medium' | 'high' | 'critical'; warnings: string[] } {
    const warnings: string[] = [];
    let level: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Check max single holder (institutional filter: 3% threshold)
    if (maxSingleHolder > 3) {
      if (maxSingleHolder > 10) {
        level = 'critical';
        warnings.push(`Single holder owns ${maxSingleHolder.toFixed(1)}% - extreme concentration risk`);
      } else {
        level = 'high';
        warnings.push(`Single holder owns ${maxSingleHolder.toFixed(1)}% - exceeds 3% institutional threshold`);
      }
    }

    // Check top 10 holders concentration
    if (concentration.top10Percent > 80) {
      if (level !== 'critical') level = 'high';
      warnings.push(`Top 10 holders control ${concentration.top10Percent.toFixed(1)}% of supply`);
    } else if (concentration.top10Percent > 60) {
      level = level === 'low' ? 'medium' : level;
      warnings.push(`Top 10 holders control ${concentration.top10Percent.toFixed(1)}% of supply`);
    }

    // Check whale count
    if (concentration.whaleCount > 20) {
      warnings.push(`${concentration.whaleCount} whale wallets detected (>1% each)`);
    }

    return { level, warnings };
  }

  /**
   * Verify a smart contract
   */
  async verifyContract(network: BlockchainNetwork, address: string): Promise<UnifiedContractVerification | null> {
    const cacheKey = `verify:${network}:${address}`;
    const cached = this.getCached<UnifiedContractVerification>(cacheKey);
    if (cached) return cached;

    let result: UnifiedContractVerification | null = null;

    if (network === 'solana') {
      if (!this.solscanService) return null;

      const verification = await this.solscanService.verifyProgram(address);
      result = {
        network,
        address,
        verified: verification.verified,
        riskLevel: verification.riskLevel,
        contractName: verification.details.programName,
        warnings: verification.warnings,
        details: verification.details,
      };
    } else {
      const etherscan = this.getEtherscanService(network);
      if (!etherscan) return null;

      const verification = await etherscan.verifyContract(address);
      result = {
        network,
        address,
        verified: verification.verified,
        riskLevel: verification.riskLevel,
        contractName: verification.details.contractName,
        warnings: verification.warnings,
        details: verification.details,
      };
    }

    if (result) {
      this.setCache(cacheKey, result);
    }

    return result;
  }

  /**
   * Comprehensive token risk assessment
   */
  async assessTokenRisk(network: BlockchainNetwork, tokenAddress: string): Promise<{
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    passesInstitutionalFilter: boolean;
    verification: UnifiedContractVerification | null;
    holderDistribution: UnifiedHolderDistribution | null;
    warnings: string[];
    recommendations: string[];
  }> {
    const [verification, holderDistribution] = await Promise.all([
      this.verifyContract(network, tokenAddress),
      this.getHolderDistribution(network, tokenAddress),
    ]);

    const warnings: string[] = [];
    const recommendations: string[] = [];
    let overallRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Aggregate warnings
    if (verification) {
      warnings.push(...verification.warnings);
      if (verification.riskLevel === 'critical') overallRisk = 'critical';
      else if (verification.riskLevel === 'high' && ['low', 'medium'].includes(overallRisk)) overallRisk = 'high';
      else if (verification.riskLevel === 'medium' && overallRisk === 'low') overallRisk = 'medium';
    }

    if (holderDistribution) {
      warnings.push(...holderDistribution.riskAssessment.warnings);
      const distRisk = holderDistribution.riskAssessment.level;
      if (distRisk === 'critical') overallRisk = 'critical';
      else if (distRisk === 'high' && ['low', 'medium'].includes(overallRisk)) overallRisk = 'high';
      else if (distRisk === 'medium' && overallRisk === 'low') overallRisk = 'medium';
    }

    // Check institutional filter criteria
    const passesInstitutionalFilter = 
      verification?.verified === true &&
      (holderDistribution?.concentration.maxSingleHolderPercent || 0) <= 3;

    // Generate recommendations
    if (!verification?.verified) {
      recommendations.push('Avoid trading unverified contracts - high rug pull risk');
    }
    if (holderDistribution && holderDistribution.concentration.maxSingleHolderPercent > 3) {
      recommendations.push('Whale concentration exceeds institutional threshold - consider smaller position size');
    }
    if (overallRisk === 'critical') {
      recommendations.push('DO NOT TRADE - Critical risk factors detected');
    } else if (overallRisk === 'high') {
      recommendations.push('Exercise extreme caution - multiple risk factors present');
    }

    return {
      overallRisk,
      passesInstitutionalFilter,
      verification,
      holderDistribution,
      warnings,
      recommendations,
    };
  }

  /**
   * Get supported networks
   */
  getSupportedNetworks(): BlockchainNetwork[] {
    const networks: BlockchainNetwork[] = [];
    
    for (const [network, config] of Object.entries(this.config.providers)) {
      if (config?.enabled) {
        networks.push(network as BlockchainNetwork);
      }
    }

    return networks;
  }

  /**
   * Check if network is configured
   */
  isNetworkConfigured(network: BlockchainNetwork): boolean {
    return this.config.providers[network]?.enabled === true;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Update provider configuration
   */
  updateProvider(network: BlockchainNetwork, config: ProviderConfig): void {
    this.config.providers[network] = config;
    
    // Reinitialize the specific provider
    if (network === 'solana') {
      if (config.enabled) {
        this.solscanService = createSolscanService(config.apiKey);
      } else {
        this.solscanService = null;
      }
    } else {
      if (config.enabled && config.apiKey) {
        const chainId = this.getChainIdForNetwork(network);
        if (chainId) {
          this.etherscanServices.set(network, createEtherscanService(config.apiKey, chainId));
        }
      } else {
        this.etherscanServices.delete(network);
      }
    }
  }

  /**
   * Get chain ID for network
   */
  private getChainIdForNetwork(network: BlockchainNetwork): number | null {
    const mapping: Record<BlockchainNetwork, number | null> = {
      ethereum: CHAIN_IDS.ETHEREUM,
      bsc: CHAIN_IDS.BSC,
      polygon: CHAIN_IDS.POLYGON,
      arbitrum: CHAIN_IDS.ARBITRUM,
      optimism: CHAIN_IDS.OPTIMISM,
      base: CHAIN_IDS.BASE,
      solana: null,
    };
    return mapping[network];
  }
}

// Factory function with default configuration
export function createBlockchainDataService(config?: Partial<BlockchainDataServiceConfig>): BlockchainDataService {
  const defaultConfig: BlockchainDataServiceConfig = {
    providers: {
      ethereum: { provider: 'etherscan', enabled: true },
      solana: { provider: 'solscan', enabled: true },
    },
    defaultNetwork: 'ethereum',
    cacheEnabled: true,
    cacheTTL: 300,
  };

  return new BlockchainDataService({
    ...defaultConfig,
    ...config,
    providers: {
      ...defaultConfig.providers,
      ...config?.providers,
    },
  });
}

// Demo instance
export function createDemoBlockchainDataService(): BlockchainDataService {
  return createBlockchainDataService({
    providers: {
      ethereum: { provider: 'etherscan', enabled: true },
      bsc: { provider: 'etherscan', enabled: true },
      polygon: { provider: 'etherscan', enabled: true },
      solana: { provider: 'solscan', enabled: true },
    },
  });
}
