import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", () => ({
  getUserLlmSettings: vi.fn(),
  upsertUserLlmSettings: vi.fn(),
  updateLlmUsage: vi.fn(),
}));

// Mock the LLM provider functions
vi.mock("./services/llmProvider", () => ({
  encryptApiKey: vi.fn((key: string) => `encrypted_${key}`),
  decryptApiKey: vi.fn((key: string) => key.replace("encrypted_", "")),
  validateApiKey: vi.fn().mockResolvedValue(true),
  getAvailableModels: vi.fn((provider: string) => [
    { id: `${provider}-model-1`, name: "Model 1", description: "Test model" },
  ]),
  providerMetadata: {
    openai: { name: "OpenAI", description: "GPT models", website: "https://openai.com" },
    deepseek: { name: "DeepSeek", description: "DeepSeek R1", website: "https://deepseek.com" },
    claude: { name: "Claude", description: "Anthropic Claude", website: "https://anthropic.com" },
    gemini: { name: "Gemini", description: "Google Gemini", website: "https://ai.google.dev" },
  },
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("llmSettings router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProviders", () => {
    it("returns all available LLM providers with their metadata", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const providers = await caller.llmSettings.getProviders();

      expect(providers).toHaveLength(4);
      expect(providers.map(p => p.id)).toContain("openai");
      expect(providers.map(p => p.id)).toContain("deepseek");
      expect(providers.map(p => p.id)).toContain("claude");
      expect(providers.map(p => p.id)).toContain("gemini");
      
      // Each provider should have required fields
      providers.forEach(provider => {
        expect(provider).toHaveProperty("name");
        expect(provider).toHaveProperty("description");
        expect(provider).toHaveProperty("website");
        expect(provider).toHaveProperty("models");
      });
    });
  });

  describe("getSettings", () => {
    it("returns default settings when user has no saved settings", async () => {
      const db = await import("./db");
      (db.getUserLlmSettings as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const settings = await caller.llmSettings.getSettings();

      expect(settings.activeProvider).toBe("openai");
      expect(settings.hasOpenaiKey).toBe(false);
      expect(settings.hasDeepseekKey).toBe(false);
      expect(settings.hasClaudeKey).toBe(false);
      expect(settings.hasGeminiKey).toBe(false);
      expect(settings.temperature).toBe(0.7);
      expect(settings.maxTokens).toBe(4096);
    });

    it("returns saved settings when user has configured LLM", async () => {
      const db = await import("./db");
      (db.getUserLlmSettings as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: 1,
        activeProvider: "claude",
        openaiApiKey: "encrypted_sk-test",
        claudeApiKey: "encrypted_sk-ant-test",
        deepseekApiKey: null,
        geminiApiKey: null,
        openaiModel: "gpt-4-turbo",
        claudeModel: "claude-sonnet-4-20250514",
        deepseekModel: "deepseek-reasoner",
        geminiModel: "gemini-2.0-flash",
        temperature: "0.5",
        maxTokens: 8192,
        totalTokensUsed: 15000,
        lastUsedAt: new Date("2024-01-15"),
      });

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const settings = await caller.llmSettings.getSettings();

      expect(settings.activeProvider).toBe("claude");
      expect(settings.hasOpenaiKey).toBe(true);
      expect(settings.hasClaudeKey).toBe(true);
      expect(settings.hasDeepseekKey).toBe(false);
      expect(settings.hasGeminiKey).toBe(false);
      expect(settings.temperature).toBe(0.5);
      expect(settings.maxTokens).toBe(8192);
      expect(settings.totalTokensUsed).toBe(15000);
    });
  });

  describe("setActiveProvider", () => {
    it("updates the active provider", async () => {
      const db = await import("./db");
      (db.upsertUserLlmSettings as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.llmSettings.setActiveProvider({ provider: "deepseek" });

      expect(result.success).toBe(true);
      expect(db.upsertUserLlmSettings).toHaveBeenCalledWith(1, {
        activeProvider: "deepseek",
      });
    });
  });

  describe("saveApiKey", () => {
    it("validates and saves an API key", async () => {
      const db = await import("./db");
      const llmProvider = await import("./services/llmProvider");
      
      (llmProvider.validateApiKey as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (db.upsertUserLlmSettings as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.llmSettings.saveApiKey({
        provider: "openai",
        apiKey: "sk-test-key-12345",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("openai");
      expect(llmProvider.validateApiKey).toHaveBeenCalledWith("openai", "sk-test-key-12345");
      expect(llmProvider.encryptApiKey).toHaveBeenCalledWith("sk-test-key-12345");
    });

    it("rejects invalid API keys", async () => {
      const llmProvider = await import("./services/llmProvider");
      (llmProvider.validateApiKey as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.llmSettings.saveApiKey({
          provider: "openai",
          apiKey: "invalid-key",
        })
      ).rejects.toThrow("Invalid openai API key");
    });
  });

  describe("removeApiKey", () => {
    it("removes an API key for a provider", async () => {
      const db = await import("./db");
      (db.upsertUserLlmSettings as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.llmSettings.removeApiKey({ provider: "claude" });

      expect(result.success).toBe(true);
      expect(db.upsertUserLlmSettings).toHaveBeenCalledWith(1, {
        claudeApiKey: null,
      });
    });
  });

  describe("setModel", () => {
    it("updates the model for a provider", async () => {
      const db = await import("./db");
      (db.upsertUserLlmSettings as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.llmSettings.setModel({
        provider: "openai",
        model: "gpt-4o",
      });

      expect(result.success).toBe(true);
      expect(db.upsertUserLlmSettings).toHaveBeenCalledWith(1, {
        openaiModel: "gpt-4o",
      });
    });
  });

  describe("updateSettings", () => {
    it("updates temperature and max tokens", async () => {
      const db = await import("./db");
      (db.upsertUserLlmSettings as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.llmSettings.updateSettings({
        temperature: 0.9,
        maxTokens: 16000,
      });

      expect(result.success).toBe(true);
      expect(db.upsertUserLlmSettings).toHaveBeenCalledWith(1, {
        temperature: "0.9",
        maxTokens: 16000,
      });
    });

    it("validates temperature range", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Temperature must be between 0 and 2
      await expect(
        caller.llmSettings.updateSettings({ temperature: 3 })
      ).rejects.toThrow();

      await expect(
        caller.llmSettings.updateSettings({ temperature: -1 })
      ).rejects.toThrow();
    });

    it("validates max tokens range", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Max tokens must be between 100 and 128000
      await expect(
        caller.llmSettings.updateSettings({ maxTokens: 50 })
      ).rejects.toThrow();
    });
  });

  describe("testConnection", () => {
    it("tests connection with saved API key", async () => {
      const db = await import("./db");
      const llmProvider = await import("./services/llmProvider");

      (db.getUserLlmSettings as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: 1,
        openaiApiKey: "encrypted_sk-test",
      });
      (llmProvider.decryptApiKey as ReturnType<typeof vi.fn>).mockReturnValue("sk-test");
      (llmProvider.validateApiKey as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.llmSettings.testConnection({ provider: "openai" });

      expect(result.success).toBe(true);
      expect(result.message).toContain("openai");
    });

    it("fails when no API key is saved", async () => {
      const db = await import("./db");
      (db.getUserLlmSettings as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: 1,
        openaiApiKey: null,
      });

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.llmSettings.testConnection({ provider: "openai" })
      ).rejects.toThrow("No API key found");
    });

    it("fails when no settings exist", async () => {
      const db = await import("./db");
      (db.getUserLlmSettings as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.llmSettings.testConnection({ provider: "openai" })
      ).rejects.toThrow("No LLM settings found");
    });
  });
});

describe("LLM Provider Metadata", () => {
  it("all providers have required metadata fields", async () => {
    const { providerMetadata } = await import("./services/llmProvider");
    
    const requiredProviders = ["openai", "deepseek", "claude", "gemini"];
    
    requiredProviders.forEach(provider => {
      expect(providerMetadata).toHaveProperty(provider);
      expect(providerMetadata[provider as keyof typeof providerMetadata]).toHaveProperty("name");
      expect(providerMetadata[provider as keyof typeof providerMetadata]).toHaveProperty("description");
      expect(providerMetadata[provider as keyof typeof providerMetadata]).toHaveProperty("website");
    });
  });
});
