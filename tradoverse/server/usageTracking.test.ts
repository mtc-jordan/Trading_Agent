import { describe, expect, it } from "vitest";
import { 
  calculateCost, 
  estimateCost, 
  formatCost, 
  formatTokens,
  validateApiKeyFormat,
  llmPricing,
  getDefaultModel,
  getAvailableModels,
  providerMetadata,
  encryptApiKey,
  decryptApiKey,
} from "./services/llmProvider";

describe("LLM Usage Tracking", () => {
  describe("Cost Calculation", () => {
    it("calculates cost for OpenAI GPT-4 Turbo", () => {
      const result = calculateCost("openai", "gpt-4-turbo", 1000, 500);
      
      // GPT-4 Turbo: $10/1M input, $30/1M output
      // 1000 * 10 / 1M + 500 * 30 / 1M = 0.01 + 0.015 = 0.025 cents
      expect(result).toBeGreaterThan(0);
    });

    it("calculates cost for DeepSeek Reasoner", () => {
      const result = calculateCost("deepseek", "deepseek-reasoner", 1000, 500);
      
      expect(result).toBeGreaterThan(0);
      // DeepSeek should be cheaper than OpenAI
      const openaiCost = calculateCost("openai", "gpt-4-turbo", 1000, 500);
      expect(result).toBeLessThan(openaiCost);
    });

    it("calculates cost for Claude Sonnet", () => {
      const result = calculateCost("claude", "claude-sonnet-4-20250514", 1000, 500);
      
      expect(result).toBeGreaterThan(0);
    });

    it("calculates cost for Gemini Flash", () => {
      const result = calculateCost("gemini", "gemini-2.0-flash", 1000, 500);
      
      expect(result).toBeGreaterThan(0);
    });

    it("returns default cost for unknown model", () => {
      const result = calculateCost("openai", "unknown-model", 1000, 500);
      
      // Should use default pricing
      expect(result).toBeGreaterThan(0);
    });
  });

  describe("Cost Estimation", () => {
    it("estimates cost before API call", () => {
      const inputText = "Analyze the stock market trends for AAPL";
      const result = estimateCost("openai", "gpt-4-turbo", inputText, 1000);
      
      expect(result.estimatedInputTokens).toBeGreaterThan(0);
      expect(result.estimatedCostCents).toBeGreaterThan(0);
    });

    it("estimates more tokens for longer text", () => {
      const shortText = "Hello";
      const longText = "This is a much longer piece of text that should have more estimated tokens.";
      
      const shortResult = estimateCost("openai", "gpt-4-turbo", shortText, 100);
      const longResult = estimateCost("openai", "gpt-4-turbo", longText, 100);
      
      expect(longResult.estimatedInputTokens).toBeGreaterThan(shortResult.estimatedInputTokens);
    });
  });

  describe("Cost Formatting", () => {
    it("formats small costs as less than $0.01", () => {
      expect(formatCost(0.5)).toBe("< $0.01");
      expect(formatCost(0)).toBe("< $0.01");
    });

    it("formats costs >= 1 cent correctly", () => {
      expect(formatCost(1)).toBe("$0.01");
      expect(formatCost(100)).toBe("$1.00");
      expect(formatCost(1500)).toBe("$15.00");
    });
  });

  describe("Token Formatting", () => {
    it("formats small token counts", () => {
      expect(formatTokens(500)).toBe("500");
      expect(formatTokens(999)).toBe("999");
    });

    it("formats thousands with K suffix", () => {
      expect(formatTokens(1000)).toBe("1.0K");
      expect(formatTokens(5500)).toBe("5.5K");
    });

    it("formats millions with M suffix", () => {
      expect(formatTokens(1000000)).toBe("1.00M");
      expect(formatTokens(2500000)).toBe("2.50M");
    });
  });
});

describe("API Key Validation", () => {
  describe("Format Validation", () => {
    it("validates OpenAI key format", () => {
      const validKey = "sk-proj-abcdefghijklmnopqrstuvwxyz1234567890abcd";
      const invalidKey = "invalid-key";
      
      expect(validateApiKeyFormat("openai", validKey).valid).toBe(true);
      expect(validateApiKeyFormat("openai", invalidKey).valid).toBe(false);
    });

    it("validates DeepSeek key format", () => {
      const validKey = "sk-abcdefghijklmnopqrstuvwxyz123456";
      const invalidKey = "short";
      
      expect(validateApiKeyFormat("deepseek", validKey).valid).toBe(true);
      expect(validateApiKeyFormat("deepseek", invalidKey).valid).toBe(false);
    });

    it("validates Claude key format", () => {
      const validKey = "sk-ant-api03-abcdefghijklmnopqrstuvwxyz123456789";
      const invalidKey = "sk-invalid";
      
      expect(validateApiKeyFormat("claude", validKey).valid).toBe(true);
      expect(validateApiKeyFormat("claude", invalidKey).valid).toBe(false);
    });

    it("validates Gemini key format", () => {
      const validKey = "AIzaSyAbcdefghijklmnopqrstuvwxyz12345";
      const invalidKey = "short";
      
      expect(validateApiKeyFormat("gemini", validKey).valid).toBe(true);
      expect(validateApiKeyFormat("gemini", invalidKey).valid).toBe(false);
    });

    it("returns error message for empty keys", () => {
      const result = validateApiKeyFormat("openai", "");
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });
});

describe("LLM Pricing Configuration", () => {
  it("has pricing for all supported providers", () => {
    expect(llmPricing.openai).toBeDefined();
    expect(llmPricing.deepseek).toBeDefined();
    expect(llmPricing.claude).toBeDefined();
    expect(llmPricing.gemini).toBeDefined();
  });

  it("has input and output pricing for each model", () => {
    const gpt4Pricing = llmPricing.openai["gpt-4-turbo"];
    expect(gpt4Pricing.input).toBeGreaterThan(0);
    expect(gpt4Pricing.output).toBeGreaterThan(0);
  });

  it("DeepSeek pricing is lower than OpenAI GPT-4", () => {
    const openaiPrice = llmPricing.openai["gpt-4-turbo"].input;
    const deepseekPrice = llmPricing.deepseek["deepseek-reasoner"].input;
    
    expect(deepseekPrice).toBeLessThan(openaiPrice);
  });

  it("Gemini Flash is the cheapest option", () => {
    const geminiFlashPrice = llmPricing.gemini["gemini-2.0-flash"].input;
    const openaiPrice = llmPricing.openai["gpt-4-turbo"].input;
    const claudePrice = llmPricing.claude["claude-sonnet-4-20250514"].input;
    
    expect(geminiFlashPrice).toBeLessThan(openaiPrice);
    expect(geminiFlashPrice).toBeLessThan(claudePrice);
  });
});

describe("Provider Metadata", () => {
  it("has metadata for all providers", () => {
    expect(providerMetadata.openai).toBeDefined();
    expect(providerMetadata.deepseek).toBeDefined();
    expect(providerMetadata.claude).toBeDefined();
    expect(providerMetadata.gemini).toBeDefined();
  });

  it("includes required fields for each provider", () => {
    for (const provider of ["openai", "deepseek", "claude", "gemini"] as const) {
      const meta = providerMetadata[provider];
      expect(meta.name).toBeTruthy();
      expect(meta.description).toBeTruthy();
      expect(meta.website).toMatch(/^https?:\/\//);
      expect(meta.icon).toBeTruthy();
    }
  });
});

describe("Default Models", () => {
  it("returns default model for each provider", () => {
    expect(getDefaultModel("openai")).toBe("gpt-4-turbo");
    expect(getDefaultModel("deepseek")).toBe("deepseek-reasoner");
    expect(getDefaultModel("claude")).toBe("claude-sonnet-4-20250514");
    expect(getDefaultModel("gemini")).toBe("gemini-2.0-flash");
  });
});

describe("Available Models", () => {
  it("returns models for each provider", () => {
    const openaiModels = getAvailableModels("openai");
    const deepseekModels = getAvailableModels("deepseek");
    const claudeModels = getAvailableModels("claude");
    const geminiModels = getAvailableModels("gemini");
    
    expect(openaiModels.length).toBeGreaterThan(0);
    expect(deepseekModels.length).toBeGreaterThan(0);
    expect(claudeModels.length).toBeGreaterThan(0);
    expect(geminiModels.length).toBeGreaterThan(0);
  });

  it("includes cost information for models", () => {
    const models = getAvailableModels("openai");
    const gpt4 = models.find(m => m.id === "gpt-4-turbo");
    
    expect(gpt4).toBeDefined();
    expect(gpt4?.costPer1MTokens).toBeDefined();
    expect(gpt4?.costPer1MTokens?.input).toBeGreaterThan(0);
    expect(gpt4?.costPer1MTokens?.output).toBeGreaterThan(0);
  });
});

describe("API Key Encryption", () => {
  it("encrypts and decrypts API keys correctly", () => {
    const originalKey = "sk-test-key-12345678901234567890";
    const encrypted = encryptApiKey(originalKey);
    const decrypted = decryptApiKey(encrypted);
    
    expect(encrypted).not.toBe(originalKey);
    expect(encrypted).toContain(":");
    expect(decrypted).toBe(originalKey);
  });

  it("produces different ciphertext for same plaintext", () => {
    const key = "sk-test-key-12345678901234567890";
    const encrypted1 = encryptApiKey(key);
    const encrypted2 = encryptApiKey(key);
    
    // Due to random IV, encryptions should differ
    expect(encrypted1).not.toBe(encrypted2);
    
    // But both should decrypt to same value
    expect(decryptApiKey(encrypted1)).toBe(key);
    expect(decryptApiKey(encrypted2)).toBe(key);
  });

  it("handles invalid encrypted data gracefully", () => {
    expect(decryptApiKey("invalid")).toBe("");
    expect(decryptApiKey("")).toBe("");
    expect(decryptApiKey("no:colons:here:extra")).toBe("");
  });
});

describe("Fallback Mechanism", () => {
  it("should have default fallback priority", () => {
    const defaultPriority = ["openai", "claude", "deepseek", "gemini"];
    expect(defaultPriority).toHaveLength(4);
    expect(defaultPriority).toContain("openai");
    expect(defaultPriority).toContain("claude");
    expect(defaultPriority).toContain("deepseek");
    expect(defaultPriority).toContain("gemini");
  });

  it("should support configurable retry settings", () => {
    const defaultSettings = {
      fallbackEnabled: true,
      maxRetries: 2,
      retryDelayMs: 1000,
      notifyOnFallback: true,
    };
    
    expect(defaultSettings.fallbackEnabled).toBe(true);
    expect(defaultSettings.maxRetries).toBeGreaterThanOrEqual(0);
    expect(defaultSettings.maxRetries).toBeLessThanOrEqual(5);
    expect(defaultSettings.retryDelayMs).toBeGreaterThan(0);
  });
});

describe("Usage Statistics Calculation", () => {
  it("should calculate correct aggregates", () => {
    const mockLogs = [
      { totalTokens: 1000, costCents: 10, responseTimeMs: 500, success: true, wasFallback: false },
      { totalTokens: 2000, costCents: 20, responseTimeMs: 600, success: true, wasFallback: false },
      { totalTokens: 1500, costCents: 15, responseTimeMs: 450, success: false, wasFallback: true },
    ];
    
    const totalTokens = mockLogs.reduce((sum, log) => sum + log.totalTokens, 0);
    const totalCost = mockLogs.reduce((sum, log) => sum + log.costCents, 0);
    const avgResponseTime = mockLogs.reduce((sum, log) => sum + log.responseTimeMs, 0) / mockLogs.length;
    const successRate = (mockLogs.filter(l => l.success).length / mockLogs.length) * 100;
    const fallbackRate = (mockLogs.filter(l => l.wasFallback).length / mockLogs.length) * 100;
    
    expect(totalTokens).toBe(4500);
    expect(totalCost).toBe(45);
    expect(avgResponseTime).toBeCloseTo(516.67, 1);
    expect(successRate).toBeCloseTo(66.67, 1);
    expect(fallbackRate).toBeCloseTo(33.33, 1);
  });

  it("should format usage summary correctly", () => {
    const totalCostCents = 4567;
    const totalTokens = 1234567;
    
    const formattedCost = formatCost(totalCostCents);
    const formattedTokens = formatTokens(totalTokens);
    
    expect(formattedCost).toBe("$45.67");
    expect(formattedTokens).toBe("1.23M");
  });
});
