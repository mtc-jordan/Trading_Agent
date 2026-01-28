/**
 * On-Chain Data Service
 * 
 * Provides unified access to on-chain metrics from multiple data providers
 * including DefiLlama (free), CoinGecko, and blockchain explorers.
 * 
 * Supports whale tracking, exchange flows, and on-chain metrics like MVRV, NVT.
 */

export interface OnChainProvider {
  name: string;
  apiKey?: string;
  baseUrl: string;
  rateLimit: number; // requests per minute
}

export interface WhaleTransaction {
  hash: string;
  from: string;
  to: string;
  value: number;
  valueUsd: number;
  token: string;
  timestamp: number;
  type: 'transfer' | 'exchange_deposit' | 'exchange_withdrawal' | 'contract_interaction';
  isWhale: boolean;
  walletLabel?: string;
}

export interface ExchangeFlow {
  exchange: string;
  token: string;
  inflow24h: number;
  outflow24h: number;
  netFlow24h: number;
  inflowUsd24h: number;
  outflowUsd24h: number;
  netFlowUsd24h: number;
  timestamp: number;
}

export interface OnChainMetrics {
  token: string;
  mvrv: number; // Market Value to Realized Value
  nvt: number; // Network Value to Transactions
  sopr: number; // Spent Output Profit Ratio
  activeAddresses24h: number;
  transactionCount24h: number;
  transactionVolume24h: number;
  exchangeReserves: number;
  timestamp: number;
}

export interface TVLData {
  protocol: string;
  chain: string;
  tvl: number;
  tvlChange24h: number;
  tvlChange7d: number;
  timestamp: number;
}

export interface TokenPrice {
  token: string;
  price: number;
  priceChange24h: number;
  priceChange7d: number;
  marketCap: number;
  volume24h: number;
  timestamp: number;
}

export class OnChainDataService {
  private providers: Map<string, OnChainProvider> = new Map();
  private cache: Map<string, { data: any; expiry: number }> = new Map();
  private cacheTTL: number = 60000; // 1 minute default cache

  constructor() {
    // Initialize default providers (no API key required)
    this.providers.set('defilama', {
      name: 'DefiLlama',
      baseUrl: 'https://api.llama.fi',
      rateLimit: 300
    });

    this.providers.set('coingecko', {
      name: 'CoinGecko',
      baseUrl: 'https://api.coingecko.com/api/v3',
      rateLimit: 50 // Free tier
    });

    this.providers.set('blockchain', {
      name: 'Blockchain.com',
      baseUrl: 'https://blockchain.info',
      rateLimit: 100
    });
  }

  /**
   * Add or update a provider with API key
   */
  addProvider(id: string, provider: OnChainProvider): void {
    this.providers.set(id, provider);
  }

  /**
   * Get cached data or fetch fresh
   */
  private async getCachedOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data as T;
    }

    const data = await fetchFn();
    this.cache.set(key, { data, expiry: Date.now() + this.cacheTTL });
    return data;
  }

  /**
   * Fetch TVL data from DefiLlama
   */
  async getTVL(protocol: string): Promise<TVLData | null> {
    const cacheKey = `tvl:${protocol}`;
    
    return this.getCachedOrFetch(cacheKey, async () => {
      try {
        const provider = this.providers.get('defilama');
        if (!provider) return null;

        const response = await fetch(`${provider.baseUrl}/tvl/${protocol}`);
        if (!response.ok) return null;

        const tvl = await response.json();
        
        // Get historical for change calculation
        const histResponse = await fetch(`${provider.baseUrl}/protocol/${protocol}`);
        const histData = histResponse.ok ? await histResponse.json() : null;

        let tvlChange24h = 0;
        let tvlChange7d = 0;

        if (histData?.tvl && Array.isArray(histData.tvl)) {
          const now = Date.now() / 1000;
          const day = 86400;
          const week = day * 7;

          const current = histData.tvl[histData.tvl.length - 1]?.totalLiquidityUSD || tvl;
          const dayAgo = histData.tvl.find((t: any) => t.date >= now - day - 3600)?.totalLiquidityUSD;
          const weekAgo = histData.tvl.find((t: any) => t.date >= now - week - 3600)?.totalLiquidityUSD;

          if (dayAgo) tvlChange24h = ((current - dayAgo) / dayAgo) * 100;
          if (weekAgo) tvlChange7d = ((current - weekAgo) / weekAgo) * 100;
        }

        return {
          protocol,
          chain: histData?.chain || 'multi',
          tvl: typeof tvl === 'number' ? tvl : tvl?.tvl || 0,
          tvlChange24h,
          tvlChange7d,
          timestamp: Date.now()
        };
      } catch (error) {
        console.error(`[OnChainData] Error fetching TVL for ${protocol}:`, error);
        return null;
      }
    });
  }

  /**
   * Get all chains TVL from DefiLlama
   */
  async getAllChainsTVL(): Promise<TVLData[]> {
    const cacheKey = 'tvl:all-chains';
    
    return this.getCachedOrFetch(cacheKey, async () => {
      try {
        const provider = this.providers.get('defilama');
        if (!provider) return [];

        const response = await fetch(`${provider.baseUrl}/v2/chains`);
        if (!response.ok) return [];

        const chains = await response.json();
        
        return chains.map((chain: any) => ({
          protocol: chain.name,
          chain: chain.name,
          tvl: chain.tvl || 0,
          tvlChange24h: chain.change_1d || 0,
          tvlChange7d: chain.change_7d || 0,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('[OnChainData] Error fetching all chains TVL:', error);
        return [];
      }
    });
  }

  /**
   * Get token price from CoinGecko
   */
  async getTokenPrice(tokenId: string): Promise<TokenPrice | null> {
    const cacheKey = `price:${tokenId}`;
    
    return this.getCachedOrFetch(cacheKey, async () => {
      try {
        const provider = this.providers.get('coingecko');
        if (!provider) return null;

        const response = await fetch(
          `${provider.baseUrl}/coins/${tokenId}?localization=false&tickers=false&community_data=false&developer_data=false`
        );
        if (!response.ok) return null;

        const data = await response.json();
        
        return {
          token: data.symbol?.toUpperCase() || tokenId,
          price: data.market_data?.current_price?.usd || 0,
          priceChange24h: data.market_data?.price_change_percentage_24h || 0,
          priceChange7d: data.market_data?.price_change_percentage_7d || 0,
          marketCap: data.market_data?.market_cap?.usd || 0,
          volume24h: data.market_data?.total_volume?.usd || 0,
          timestamp: Date.now()
        };
      } catch (error) {
        console.error(`[OnChainData] Error fetching price for ${tokenId}:`, error);
        return null;
      }
    });
  }

  /**
   * Get multiple token prices
   */
  async getMultipleTokenPrices(tokenIds: string[]): Promise<Map<string, TokenPrice>> {
    const cacheKey = `prices:${tokenIds.sort().join(',')}`;
    
    const prices = await this.getCachedOrFetch(cacheKey, async () => {
      try {
        const provider = this.providers.get('coingecko');
        if (!provider) return new Map();

        const response = await fetch(
          `${provider.baseUrl}/simple/price?ids=${tokenIds.join(',')}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`
        );
        if (!response.ok) return new Map();

        const data = await response.json();
        const result = new Map<string, TokenPrice>();

        for (const [id, priceData] of Object.entries(data)) {
          const pd = priceData as any;
          result.set(id, {
            token: id.toUpperCase(),
            price: pd.usd || 0,
            priceChange24h: pd.usd_24h_change || 0,
            priceChange7d: 0,
            marketCap: pd.usd_market_cap || 0,
            volume24h: pd.usd_24h_vol || 0,
            timestamp: Date.now()
          });
        }

        return result;
      } catch (error) {
        console.error('[OnChainData] Error fetching multiple prices:', error);
        return new Map();
      }
    });

    return prices;
  }

  /**
   * Simulate whale transaction detection
   * In production, this would connect to blockchain explorers or Whale Alert API
   */
  async getWhaleTransactions(
    token: string,
    minValueUsd: number = 1000000
  ): Promise<WhaleTransaction[]> {
    const cacheKey = `whales:${token}:${minValueUsd}`;
    
    return this.getCachedOrFetch(cacheKey, async () => {
      // In production, integrate with:
      // - Whale Alert API: https://whale-alert.io/
      // - Etherscan/BSCScan APIs for on-chain data
      // - Custom blockchain node monitoring
      
      // For now, return simulated data structure
      const now = Date.now();
      const transactions: WhaleTransaction[] = [];

      // Simulate recent whale activity
      const whaleTypes: WhaleTransaction['type'][] = [
        'transfer', 'exchange_deposit', 'exchange_withdrawal', 'contract_interaction'
      ];

      for (let i = 0; i < 5; i++) {
        const type = whaleTypes[Math.floor(Math.random() * whaleTypes.length)];
        const value = minValueUsd * (1 + Math.random() * 10);
        
        transactions.push({
          hash: `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`,
          from: `0x${Math.random().toString(16).slice(2, 42)}`,
          to: `0x${Math.random().toString(16).slice(2, 42)}`,
          value: value / (token === 'BTC' ? 100000 : token === 'ETH' ? 3000 : 1),
          valueUsd: value,
          token: token.toUpperCase(),
          timestamp: now - Math.random() * 3600000,
          type,
          isWhale: true,
          walletLabel: type === 'exchange_deposit' || type === 'exchange_withdrawal' 
            ? ['Binance', 'Coinbase', 'Kraken', 'OKX'][Math.floor(Math.random() * 4)]
            : undefined
        });
      }

      return transactions.sort((a, b) => b.timestamp - a.timestamp);
    });
  }

  /**
   * Simulate exchange flow data
   * In production, connect to CryptoQuant, Glassnode, or similar
   */
  async getExchangeFlows(token: string): Promise<ExchangeFlow[]> {
    const cacheKey = `flows:${token}`;
    
    return this.getCachedOrFetch(cacheKey, async () => {
      const exchanges = ['Binance', 'Coinbase', 'Kraken', 'OKX', 'Bybit', 'Bitfinex'];
      const flows: ExchangeFlow[] = [];

      for (const exchange of exchanges) {
        const inflow = Math.random() * 10000;
        const outflow = Math.random() * 10000;
        const price = token === 'BTC' ? 100000 : token === 'ETH' ? 3000 : 1;

        flows.push({
          exchange,
          token: token.toUpperCase(),
          inflow24h: inflow,
          outflow24h: outflow,
          netFlow24h: inflow - outflow,
          inflowUsd24h: inflow * price,
          outflowUsd24h: outflow * price,
          netFlowUsd24h: (inflow - outflow) * price,
          timestamp: Date.now()
        });
      }

      return flows;
    });
  }

  /**
   * Calculate on-chain metrics
   * In production, integrate with Glassnode or CryptoQuant APIs
   */
  async getOnChainMetrics(token: string): Promise<OnChainMetrics> {
    const cacheKey = `metrics:${token}`;
    
    return this.getCachedOrFetch(cacheKey, async () => {
      // Get real price data
      const tokenIdMap: Record<string, string> = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'SOL': 'solana',
        'AVAX': 'avalanche-2'
      };

      const tokenId = tokenIdMap[token.toUpperCase()] || token.toLowerCase();
      const priceData = await this.getTokenPrice(tokenId);

      // Simulated on-chain metrics
      // In production, these would come from Glassnode/CryptoQuant APIs
      const baseMetrics = {
        BTC: { mvrv: 2.1, nvt: 65, sopr: 1.02, activeAddresses: 950000, txCount: 350000 },
        ETH: { mvrv: 1.8, nvt: 45, sopr: 1.01, activeAddresses: 550000, txCount: 1200000 },
        SOL: { mvrv: 1.5, nvt: 30, sopr: 0.98, activeAddresses: 200000, txCount: 800000 }
      };

      const base = baseMetrics[token.toUpperCase() as keyof typeof baseMetrics] || {
        mvrv: 1.0 + Math.random(),
        nvt: 20 + Math.random() * 50,
        sopr: 0.95 + Math.random() * 0.1,
        activeAddresses: 50000 + Math.random() * 100000,
        txCount: 100000 + Math.random() * 500000
      };

      return {
        token: token.toUpperCase(),
        mvrv: base.mvrv * (0.9 + Math.random() * 0.2),
        nvt: base.nvt * (0.9 + Math.random() * 0.2),
        sopr: base.sopr,
        activeAddresses24h: Math.floor(base.activeAddresses * (0.9 + Math.random() * 0.2)),
        transactionCount24h: Math.floor(base.txCount * (0.9 + Math.random() * 0.2)),
        transactionVolume24h: priceData?.volume24h || 0,
        exchangeReserves: (priceData?.marketCap || 0) * 0.1, // Estimate 10% on exchanges
        timestamp: Date.now()
      };
    });
  }

  /**
   * Get DeFi protocol data
   */
  async getProtocolData(protocol: string): Promise<{
    tvl: TVLData | null;
    chains: string[];
    category: string;
    url: string;
  }> {
    const cacheKey = `protocol:${protocol}`;
    
    return this.getCachedOrFetch(cacheKey, async () => {
      try {
        const provider = this.providers.get('defilama');
        if (!provider) return { tvl: null, chains: [], category: '', url: '' };

        const response = await fetch(`${provider.baseUrl}/protocol/${protocol}`);
        if (!response.ok) return { tvl: null, chains: [], category: '', url: '' };

        const data = await response.json();
        
        return {
          tvl: await this.getTVL(protocol),
          chains: data.chains || [],
          category: data.category || 'Unknown',
          url: data.url || ''
        };
      } catch (error) {
        console.error(`[OnChainData] Error fetching protocol data for ${protocol}:`, error);
        return { tvl: null, chains: [], category: '', url: '' };
      }
    });
  }

  /**
   * Get top protocols by TVL
   */
  async getTopProtocols(limit: number = 20): Promise<TVLData[]> {
    const cacheKey = `top-protocols:${limit}`;
    
    return this.getCachedOrFetch(cacheKey, async () => {
      try {
        const provider = this.providers.get('defilama');
        if (!provider) return [];

        const response = await fetch(`${provider.baseUrl}/protocols`);
        if (!response.ok) return [];

        const protocols = await response.json();
        
        return protocols
          .slice(0, limit)
          .map((p: any) => ({
            protocol: p.name,
            chain: p.chain || 'multi',
            tvl: p.tvl || 0,
            tvlChange24h: p.change_1d || 0,
            tvlChange7d: p.change_7d || 0,
            timestamp: Date.now()
          }));
      } catch (error) {
        console.error('[OnChainData] Error fetching top protocols:', error);
        return [];
      }
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Set cache TTL
   */
  setCacheTTL(ttlMs: number): void {
    this.cacheTTL = ttlMs;
  }
}

// Export singleton instance
export const onChainDataService = new OnChainDataService();
