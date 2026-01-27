import { describe, it, expect, vi } from 'vitest';

// Mock the LLM module
vi.mock('./_core/llm', () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          signal: 'buy',
          confidence: 75,
          reasoning: 'Test reasoning',
          keyFactors: ['factor1', 'factor2'],
          riskLevel: 'medium',
        }),
      },
    }],
  }),
}));

describe('Multi-Asset Analysis System', () => {
  describe('Asset Type Detection', () => {
    it('should detect stock symbols correctly', async () => {
      const { detectAssetType } = await import('./services/ai-agents/UnifiedMultiAssetOrchestrator');
      expect(detectAssetType('AAPL')).toBe('stock');
      expect(detectAssetType('GOOGL')).toBe('stock');
      expect(detectAssetType('MSFT')).toBe('stock');
    });

    it('should detect crypto symbols correctly', async () => {
      const { detectAssetType } = await import('./services/ai-agents/UnifiedMultiAssetOrchestrator');
      expect(detectAssetType('BTC-USD')).toBe('crypto');
      expect(detectAssetType('ETH-USD')).toBe('crypto');
      expect(detectAssetType('BTCUSD')).toBe('crypto');
    });

    it('should detect forex pairs correctly', async () => {
      const { detectAssetType } = await import('./services/ai-agents/UnifiedMultiAssetOrchestrator');
      expect(detectAssetType('EUR/USD')).toBe('forex');
      expect(detectAssetType('GBP/JPY')).toBe('forex');
      expect(detectAssetType('EURUSD')).toBe('forex');
    });

    it('should detect commodity symbols correctly', async () => {
      const { detectAssetType } = await import('./services/ai-agents/UnifiedMultiAssetOrchestrator');
      expect(detectAssetType('GC=F')).toBe('commodity');
      expect(detectAssetType('CL=F')).toBe('commodity');
      expect(detectAssetType('SI=F')).toBe('commodity');
    });

    it('should detect options symbols correctly', async () => {
      const { detectAssetType } = await import('./services/ai-agents/UnifiedMultiAssetOrchestrator');
      expect(detectAssetType('AAPL240119C00150000')).toBe('options');
      expect(detectAssetType('SPY250117P00400000')).toBe('options');
    });
  });

  describe('UnifiedMultiAssetOrchestrator', () => {
    it('should create orchestrator instance', async () => {
      const { UnifiedMultiAssetOrchestrator } = await import('./services/ai-agents/UnifiedMultiAssetOrchestrator');
      const orchestrator = new UnifiedMultiAssetOrchestrator();
      expect(orchestrator).toBeDefined();
    });

    it('should analyze stock assets', async () => {
      const { UnifiedMultiAssetOrchestrator } = await import('./services/ai-agents/UnifiedMultiAssetOrchestrator');
      const orchestrator = new UnifiedMultiAssetOrchestrator();
      
      const result = await orchestrator.analyze({
        symbol: 'AAPL',
        assetType: 'stock',
        currentPrice: 150,
        priceChange24h: 2.5,
        volume24h: 50000000,
        stockData: {
          sector: 'Technology',
          industry: 'Consumer Electronics',
          peRatio: 25,
          earningsGrowth: 15,
          dividendYield: 0.5,
        },
      });

      expect(result).toBeDefined();
      expect(result.symbol).toBe('AAPL');
      expect(result.assetType).toBe('stock');
      expect(result.overallSignal).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('should analyze crypto assets', async () => {
      const { UnifiedMultiAssetOrchestrator } = await import('./services/ai-agents/UnifiedMultiAssetOrchestrator');
      const orchestrator = new UnifiedMultiAssetOrchestrator();
      
      const result = await orchestrator.analyze({
        symbol: 'BTC-USD',
        assetType: 'crypto',
        currentPrice: 45000,
        priceChange24h: 3.5,
        volume24h: 25000000000,
        cryptoData: {
          symbol: 'BTC-USD',
          category: 'layer1',
          currentPrice: 45000,
          priceChange24h: 3.5,
          priceChange7d: 8.2,
          volume24h: 25000000000,
          marketCap: 850000000000,
        },
      });

      expect(result).toBeDefined();
      expect(result.symbol).toBe('BTC-USD');
      expect(result.assetType).toBe('crypto');
      expect(result.analyses.length).toBeGreaterThan(0);
    });

    it('should analyze forex pairs', async () => {
      const { UnifiedMultiAssetOrchestrator } = await import('./services/ai-agents/UnifiedMultiAssetOrchestrator');
      const orchestrator = new UnifiedMultiAssetOrchestrator();
      
      const result = await orchestrator.analyze({
        symbol: 'EUR/USD',
        assetType: 'forex',
        currentPrice: 1.0850,
        priceChange24h: 0.15,
        volume24h: 500000000,
        forexData: {
          baseCurrency: 'EUR',
          quoteCurrency: 'USD',
          interestRateDiff: 1.5,
          centralBankBias: 'neutral',
          cotPositioning: 25,
        },
      });

      expect(result).toBeDefined();
      expect(result.symbol).toBe('EUR/USD');
      expect(result.assetType).toBe('forex');
    });

    it('should analyze commodity assets', async () => {
      const { UnifiedMultiAssetOrchestrator } = await import('./services/ai-agents/UnifiedMultiAssetOrchestrator');
      const orchestrator = new UnifiedMultiAssetOrchestrator();
      
      const result = await orchestrator.analyze({
        symbol: 'GC=F',
        assetType: 'commodity',
        currentPrice: 2050,
        priceChange24h: 1.2,
        volume24h: 150000,
        commodityData: {
          commodityType: 'metals',
          inventoryLevels: 45,
          seasonalPattern: 0.3,
          supplyDisruption: false,
        },
      });

      expect(result).toBeDefined();
      expect(result.symbol).toBe('GC=F');
      expect(result.assetType).toBe('commodity');
    });

    it('should analyze options', async () => {
      const { UnifiedMultiAssetOrchestrator } = await import('./services/ai-agents/UnifiedMultiAssetOrchestrator');
      const orchestrator = new UnifiedMultiAssetOrchestrator();
      
      const result = await orchestrator.analyze({
        symbol: 'AAPL240119C00150000',
        assetType: 'options',
        currentPrice: 5.50,
        priceChange24h: 8.5,
        volume24h: 10000,
        optionsData: {
          symbol: 'AAPL240119C00150000',
          underlyingPrice: 150,
          greeks: {
            delta: 0.55,
            gamma: 0.05,
            theta: -0.03,
            vega: 0.20,
            rho: 0.02,
            impliedVolatility: 0.28,
            historicalVolatility: 0.22,
            ivRank: 55,
            ivPercentile: 60,
            openInterest: 5000,
            volume: 1500,
            bid: 5.45,
            ask: 5.55,
            lastPrice: 5.50,
            bidAskSpread: 0.10,
            strikePrice: 150,
            underlyingPrice: 150,
            daysToExpiry: 30,
            optionType: 'call',
          },
        },
      });

      expect(result).toBeDefined();
      expect(result.symbol).toBe('AAPL240119C00150000');
      expect(result.assetType).toBe('options');
    });
  });

  describe('Enhanced Crypto Agents', () => {
    it('should create on-chain analysis agent', async () => {
      const { AdvancedOnChainAgent } = await import('./services/ai-agents/EnhancedCryptoAgents');
      const agent = new AdvancedOnChainAgent();
      expect(agent).toBeDefined();
    });

    it('should create DeFi analysis agent', async () => {
      const { DeFiAnalysisAgent } = await import('./services/ai-agents/EnhancedCryptoAgents');
      const agent = new DeFiAnalysisAgent();
      expect(agent).toBeDefined();
    });

    it('should create whale tracking agent', async () => {
      const { WhaleTrackingAgent } = await import('./services/ai-agents/EnhancedCryptoAgents');
      const agent = new WhaleTrackingAgent();
      expect(agent).toBeDefined();
    });

    it('should run on-chain analysis', async () => {
      const { AdvancedOnChainAgent } = await import('./services/ai-agents/EnhancedCryptoAgents');
      const agent = new AdvancedOnChainAgent();
      
      const result = await agent.analyze({
        symbol: 'BTC-USD',
        category: 'layer1',
        currentPrice: 45000,
        priceChange24h: 2.5,
        priceChange7d: 5.0,
        volume24h: 25000000000,
        marketCap: 850000000000,
      });

      expect(result).toBeDefined();
      expect(result.agentName).toBe('On-Chain Analysis');
      expect(result.signal).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Options Analysis Agents', () => {
    it('should create Greeks analysis agent', async () => {
      const { GreeksAnalysisAgent } = await import('./services/ai-agents/OptionsAnalysisAgents');
      const agent = new GreeksAnalysisAgent();
      expect(agent).toBeDefined();
    });

    it('should create volatility analysis agent', async () => {
      const { VolatilityAnalysisAgent } = await import('./services/ai-agents/OptionsAnalysisAgents');
      const agent = new VolatilityAnalysisAgent();
      expect(agent).toBeDefined();
    });

    it('should create options strategy agent', async () => {
      const { StrategyRecommendationAgent } = await import('./services/ai-agents/OptionsAnalysisAgents');
      const agent = new StrategyRecommendationAgent();
      expect(agent).toBeDefined();
    });

    it('should run Greeks analysis', async () => {
      const { GreeksAnalysisAgent } = await import('./services/ai-agents/OptionsAnalysisAgents');
      const agent = new GreeksAnalysisAgent();
      
      const result = await agent.analyze({
        symbol: 'AAPL240119C00150000',
        underlyingPrice: 150,
        greeks: {
          delta: 0.55,
          gamma: 0.05,
          theta: -0.03,
          vega: 0.20,
          rho: 0.02,
          impliedVolatility: 0.28,
          historicalVolatility: 0.22,
          ivRank: 55,
          ivPercentile: 60,
          openInterest: 5000,
          volume: 1500,
          bid: 5.45,
          ask: 5.55,
          lastPrice: 5.50,
          bidAskSpread: 0.10,
          strikePrice: 150,
          underlyingPrice: 150,
          daysToExpiry: 30,
          optionType: 'call',
        },
      });

      expect(result).toBeDefined();
      expect(result.agentName).toBe('Greeks Analysis');
      expect(result.signal).toBeDefined();
    });
  });

  describe('Signal Consensus', () => {
    it('should calculate weighted consensus from multiple agents', async () => {
      const { UnifiedMultiAssetOrchestrator } = await import('./services/ai-agents/UnifiedMultiAssetOrchestrator');
      const orchestrator = new UnifiedMultiAssetOrchestrator();
      
      const result = await orchestrator.analyze({
        symbol: 'AAPL',
        assetType: 'stock',
        currentPrice: 150,
        priceChange24h: 2.5,
        volume24h: 50000000,
      });

      expect(result.overallSignal).toMatch(/strong_buy|buy|hold|sell|strong_sell/);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('should include risk level in analysis', async () => {
      const { UnifiedMultiAssetOrchestrator } = await import('./services/ai-agents/UnifiedMultiAssetOrchestrator');
      const orchestrator = new UnifiedMultiAssetOrchestrator();
      
      const result = await orchestrator.analyze({
        symbol: 'BTC-USD',
        assetType: 'crypto',
        currentPrice: 45000,
        priceChange24h: 10.5,
        volume24h: 25000000000,
      });

      expect(result.riskLevel).toMatch(/low|medium|high|extreme/);
    });

    it('should provide recommendation text', async () => {
      const { UnifiedMultiAssetOrchestrator } = await import('./services/ai-agents/UnifiedMultiAssetOrchestrator');
      const orchestrator = new UnifiedMultiAssetOrchestrator();
      
      const result = await orchestrator.analyze({
        symbol: 'EUR/USD',
        assetType: 'forex',
        currentPrice: 1.0850,
        priceChange24h: 0.15,
        volume24h: 500000000,
      });

      expect(result.recommendation).toBeDefined();
      expect(typeof result.recommendation).toBe('string');
      expect(result.recommendation.length).toBeGreaterThan(0);
    });
  });

  describe('Portfolio Analysis', () => {
    it('should analyze multi-asset portfolio', async () => {
      const { UnifiedMultiAssetOrchestrator } = await import('./services/ai-agents/UnifiedMultiAssetOrchestrator');
      const orchestrator = new UnifiedMultiAssetOrchestrator();
      
      const result = await orchestrator.analyzePortfolio([
        { symbol: 'AAPL', assetType: 'stock', currentPrice: 150, priceChange24h: 2.5, volume24h: 50000000 },
        { symbol: 'BTC-USD', assetType: 'crypto', currentPrice: 45000, priceChange24h: 3.5, volume24h: 25000000000 },
        { symbol: 'GC=F', assetType: 'commodity', currentPrice: 2050, priceChange24h: 1.2, volume24h: 150000 },
      ]);

      expect(result).toBeDefined();
      expect(result.individualAnalyses).toBeDefined();
      expect(result.individualAnalyses.length).toBe(3);
      expect(result.overallRisk).toBeDefined();
      expect(result.diversificationScore).toBeGreaterThanOrEqual(0);
      expect(result.assetAllocation).toBeDefined();
    });
  });
});
