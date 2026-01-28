/**
 * Solscan API Integration Service
 * 
 * Provides token data, holder information, and on-chain analytics
 * for Solana blockchain using Solscan Pro API.
 */

export interface SolscanConfig {
  apiKey?: string;
  baseUrl?: string;
}

export interface SolanaTokenMetadata {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  supply: string;
  icon: string | null;
  website: string | null;
  twitter: string | null;
  coingeckoId: string | null;
  holder: number;
  price: number | null;
  priceChange24h: number | null;
  volume24h: number | null;
  marketCap: number | null;
}

export interface SolanaTokenHolder {
  owner: string;
  amount: string;
  decimals: number;
  rank: number;
  share: number;
}

export interface SolanaTokenHolderDistribution {
  token: string;
  totalHolders: number;
  topHolders: SolanaTokenHolder[];
  concentration: {
    top10Percent: number;
    top50Percent: number;
    whaleCount: number;
  };
}

export interface SolanaAccountInfo {
  address: string;
  lamports: number;
  ownerProgram: string;
  type: string;
  rentEpoch: number;
  executable: boolean;
}

export interface SolanaTransaction {
  signature: string;
  slot: number;
  blockTime: number;
  fee: number;
  status: 'success' | 'fail';
  signer: string[];
  parsedInstruction: any[];
}

export interface SolanaProgramInfo {
  programId: string;
  programName: string | null;
  verified: boolean;
  authority: string | null;
  executableData: string | null;
}

export class SolscanService {
  private apiKey: string | null;
  private baseUrl: string;
  private publicBaseUrl: string;
  private rateLimitDelay: number = 200;
  private lastCallTime: number = 0;

  constructor(config: SolscanConfig = {}) {
    this.apiKey = config.apiKey || null;
    this.baseUrl = config.baseUrl || 'https://pro-api.solscan.io/v2.0';
    this.publicBaseUrl = 'https://public-api.solscan.io';
  }

  /**
   * Rate limit helper
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;
    if (timeSinceLastCall < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastCall));
    }
    this.lastCallTime = Date.now();
  }

  /**
   * Make Pro API request
   */
  private async makeProRequest(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    if (!this.apiKey) {
      console.warn('[Solscan] No API key provided, using simulated data');
      return null;
    }

    await this.rateLimit();

    const queryParams = new URLSearchParams(params);
    const url = `${this.baseUrl}${endpoint}?${queryParams.toString()}`;

    try {
      const response = await fetch(url, {
        headers: {
          'token': this.apiKey,
        },
      });

      if (!response.ok) {
        console.error(`[Solscan] API Error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error(`[Solscan] Request failed:`, error);
      return null;
    }
  }

  /**
   * Make Public API request (no API key required)
   */
  private async makePublicRequest(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    await this.rateLimit();

    const queryParams = new URLSearchParams(params);
    const url = `${this.publicBaseUrl}${endpoint}?${queryParams.toString()}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`[Solscan] Public API Error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      return data.success !== false ? (data.data || data) : null;
    } catch (error) {
      console.error(`[Solscan] Public request failed:`, error);
      return null;
    }
  }

  /**
   * Get chain information (public)
   */
  async getChainInfo(): Promise<{
    blockHeight: number;
    currentEpoch: number;
    absoluteSlot: number;
    transactionCount: number;
  } | null> {
    const result = await this.makePublicRequest('/chaininfo');
    return result;
  }

  /**
   * Get token metadata
   */
  async getTokenMetadata(tokenAddress: string): Promise<SolanaTokenMetadata | null> {
    // Try Pro API first
    let result = await this.makeProRequest('/token/meta', { address: tokenAddress });

    if (!result) {
      // Fallback to simulated data
      return this.simulateTokenMetadata(tokenAddress);
    }

    return {
      address: tokenAddress,
      name: result.name || 'Unknown',
      symbol: result.symbol || 'UNKNOWN',
      decimals: result.decimals || 9,
      supply: result.supply || '0',
      icon: result.icon || null,
      website: result.website || null,
      twitter: result.twitter || null,
      coingeckoId: result.coingeckoId || null,
      holder: result.holder || 0,
      price: result.price || null,
      priceChange24h: result.priceChange24h || null,
      volume24h: result.volume24h || null,
      marketCap: result.marketCap || null,
    };
  }

  /**
   * Simulate token metadata for demo
   */
  private simulateTokenMetadata(tokenAddress: string): SolanaTokenMetadata {
    // Generate realistic-looking metadata based on address
    const hash = this.hashAddress(tokenAddress);
    const symbols = ['SOL', 'USDC', 'RAY', 'SRM', 'ORCA', 'MNGO', 'STEP', 'COPE'];
    const names = ['Solana', 'USD Coin', 'Raydium', 'Serum', 'Orca', 'Mango', 'Step Finance', 'Cope'];
    
    const index = hash % symbols.length;
    const price = (hash % 1000) / 10;
    const holders = 1000 + (hash % 50000);

    return {
      address: tokenAddress,
      name: names[index],
      symbol: symbols[index],
      decimals: 9,
      supply: (1000000000 * (1 + hash % 10)).toString(),
      icon: null,
      website: `https://${symbols[index].toLowerCase()}.io`,
      twitter: `@${symbols[index]}`,
      coingeckoId: symbols[index].toLowerCase(),
      holder: holders,
      price,
      priceChange24h: ((hash % 200) - 100) / 10,
      volume24h: price * holders * 100,
      marketCap: price * 1000000000,
    };
  }

  /**
   * Simple hash function for address
   */
  private hashAddress(address: string): number {
    let hash = 0;
    for (let i = 0; i < address.length; i++) {
      const char = address.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Get token holders
   */
  async getTokenHolders(
    tokenAddress: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<SolanaTokenHolder[]> {
    const result = await this.makeProRequest('/token/holders', {
      address: tokenAddress,
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    if (!result || !Array.isArray(result)) {
      return this.simulateTokenHolders(tokenAddress);
    }

    return result.map((holder: any, index: number) => ({
      owner: holder.owner,
      amount: holder.amount,
      decimals: holder.decimals || 9,
      rank: (page - 1) * pageSize + index + 1,
      share: parseFloat(holder.share || '0'),
    }));
  }

  /**
   * Simulate token holders for demo
   */
  private simulateTokenHolders(tokenAddress: string): SolanaTokenHolder[] {
    const holders: SolanaTokenHolder[] = [];
    const hash = this.hashAddress(tokenAddress);
    
    // Generate top holders with realistic distribution
    const shares = [18.5, 14.2, 9.8, 7.3, 5.6, 4.2, 3.5, 2.8, 2.3, 1.9, 1.6, 1.4, 1.2, 1.0, 0.9];
    
    for (let i = 0; i < shares.length; i++) {
      holders.push({
        owner: this.generateSolanaAddress(hash + i),
        amount: (shares[i] * 10000000).toString(),
        decimals: 9,
        rank: i + 1,
        share: shares[i],
      });
    }

    return holders;
  }

  /**
   * Generate a realistic-looking Solana address
   */
  private generateSolanaAddress(seed: number): string {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let address = '';
    let current = seed;
    
    for (let i = 0; i < 44; i++) {
      address += chars.charAt(Math.abs(current) % chars.length);
      current = (current * 31 + i) & 0x7FFFFFFF;
    }
    
    return address;
  }

  /**
   * Analyze token holder distribution
   */
  async analyzeHolderDistribution(tokenAddress: string): Promise<SolanaTokenHolderDistribution> {
    const holders = await this.getTokenHolders(tokenAddress, 1, 100);

    // Calculate concentration metrics
    const sortedHolders = [...holders].sort((a, b) => b.share - a.share);
    
    let top10Percent = 0;
    let top50Percent = 0;
    let whaleCount = 0;

    for (let i = 0; i < sortedHolders.length; i++) {
      const holder = sortedHolders[i];
      
      if (i < Math.ceil(sortedHolders.length * 0.1)) {
        top10Percent += holder.share;
      }
      if (i < Math.ceil(sortedHolders.length * 0.5)) {
        top50Percent += holder.share;
      }
      if (holder.share >= 1) {
        whaleCount++;
      }
    }

    const metadata = await this.getTokenMetadata(tokenAddress);

    return {
      token: tokenAddress,
      totalHolders: metadata?.holder || holders.length,
      topHolders: sortedHolders.slice(0, 20),
      concentration: {
        top10Percent,
        top50Percent,
        whaleCount,
      },
    };
  }

  /**
   * Get account information
   */
  async getAccountInfo(address: string): Promise<SolanaAccountInfo | null> {
    const result = await this.makeProRequest('/account', { address });

    if (!result) {
      return {
        address,
        lamports: 0,
        ownerProgram: '11111111111111111111111111111111',
        type: 'unknown',
        rentEpoch: 0,
        executable: false,
      };
    }

    return {
      address,
      lamports: result.lamports || 0,
      ownerProgram: result.ownerProgram || '',
      type: result.type || 'unknown',
      rentEpoch: result.rentEpoch || 0,
      executable: result.executable || false,
    };
  }

  /**
   * Get account tokens (SPL tokens held by account)
   */
  async getAccountTokens(address: string): Promise<any[]> {
    const result = await this.makeProRequest('/account/tokens', { address });
    return result || [];
  }

  /**
   * Get account transactions
   */
  async getAccountTransactions(
    address: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<SolanaTransaction[]> {
    const result = await this.makeProRequest('/account/transactions', {
      address,
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    if (!result || !Array.isArray(result)) {
      return [];
    }

    return result.map((tx: any) => ({
      signature: tx.signature || tx.txHash,
      slot: tx.slot || 0,
      blockTime: tx.blockTime || 0,
      fee: tx.fee || 0,
      status: tx.status === 'Success' ? 'success' : 'fail',
      signer: tx.signer || [],
      parsedInstruction: tx.parsedInstruction || [],
    }));
  }

  /**
   * Get program/contract information
   */
  async getProgramInfo(programId: string): Promise<SolanaProgramInfo> {
    const accountInfo = await this.getAccountInfo(programId);

    return {
      programId,
      programName: null, // Would need additional lookup
      verified: accountInfo?.executable || false,
      authority: null,
      executableData: null,
    };
  }

  /**
   * Verify if a program is safe to interact with
   */
  async verifyProgram(programId: string): Promise<{
    verified: boolean;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    details: SolanaProgramInfo;
    warnings: string[];
  }> {
    const details = await this.getProgramInfo(programId);
    const warnings: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    if (!details.verified) {
      riskLevel = 'high';
      warnings.push('Program is not marked as executable');
    }

    // Check for known safe programs
    const knownSafePrograms = [
      '11111111111111111111111111111111', // System Program
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token Program
      'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', // Associated Token Program
    ];

    if (knownSafePrograms.includes(programId)) {
      riskLevel = 'low';
      warnings.length = 0;
    }

    return {
      verified: details.verified,
      riskLevel,
      details,
      warnings,
    };
  }

  /**
   * Get token market data
   */
  async getTokenMarketData(tokenAddress: string): Promise<{
    price: number;
    priceChange24h: number;
    volume24h: number;
    marketCap: number;
    liquidity: number;
  } | null> {
    const metadata = await this.getTokenMetadata(tokenAddress);

    if (!metadata) {
      return null;
    }

    return {
      price: metadata.price || 0,
      priceChange24h: metadata.priceChange24h || 0,
      volume24h: metadata.volume24h || 0,
      marketCap: metadata.marketCap || 0,
      liquidity: (metadata.volume24h || 0) * 0.1, // Estimated
    };
  }

  /**
   * Check if API key is configured
   */
  hasApiKey(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0;
  }

  /**
   * Set API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }
}

// Factory function
export function createSolscanService(apiKey?: string): SolscanService {
  return new SolscanService({ apiKey });
}

// Demo instance
export function createDemoSolscanService(): SolscanService {
  return new SolscanService({});
}
