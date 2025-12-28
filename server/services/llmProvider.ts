/**
 * Multi-Provider LLM Service
 * Supports OpenAI, DeepSeek R1, Claude, and Gemini with:
 * - User-configurable settings
 * - Usage tracking and cost estimation
 * - Automatic provider fallback
 * - Real-time API key validation
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { ENV } from "../_core/env";

// Encryption key derived from JWT_SECRET
const ENCRYPTION_KEY = scryptSync(ENV.cookieSecret || "default-key", "salt", 32);
const IV_LENGTH = 16;

// Types
export type LlmProvider = "openai" | "deepseek" | "claude" | "gemini";
export type AnalysisType = "technical" | "fundamental" | "sentiment" | "risk" | "microstructure" | "macro" | "quant" | "consensus";

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmConfig {
  provider: LlmProvider;
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LlmResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: LlmProvider;
  costCents: number;
  responseTimeMs: number;
  wasFallback?: boolean;
  originalProvider?: LlmProvider;
  fallbackReason?: string;
}

export interface UsageStats {
  totalTokens: number;
  totalCostCents: number;
  callCount: number;
  avgResponseTimeMs: number;
  byProvider: Record<LlmProvider, { tokens: number; costCents: number; calls: number }>;
  byDay: { date: string; tokens: number; costCents: number }[];
}

export interface FallbackConfig {
  enabled: boolean;
  priority: LlmProvider[];
  maxRetries: number;
  retryDelayMs: number;
  notifyOnFallback: boolean;
}

// LLM Provider pricing - cost per 1M tokens in USD cents
export const llmPricing: Record<string, Record<string, { input: number; output: number }>> = {
  openai: {
    "gpt-4-turbo": { input: 1000, output: 3000 },
    "gpt-4o": { input: 250, output: 1000 },
    "gpt-4o-mini": { input: 15, output: 60 },
    "o1-preview": { input: 1500, output: 6000 },
    "o1-mini": { input: 300, output: 1200 },
  },
  deepseek: {
    "deepseek-reasoner": { input: 55, output: 219 },
    "deepseek-chat": { input: 14, output: 28 },
    "deepseek-coder": { input: 14, output: 28 },
  },
  claude: {
    "claude-sonnet-4-20250514": { input: 300, output: 1500 },
    "claude-3-5-sonnet-20241022": { input: 300, output: 1500 },
    "claude-3-5-haiku-20241022": { input: 100, output: 500 },
    "claude-3-opus-20240229": { input: 1500, output: 7500 },
  },
  gemini: {
    "gemini-2.0-flash": { input: 10, output: 40 },
    "gemini-1.5-pro": { input: 125, output: 500 },
    "gemini-1.5-flash": { input: 8, output: 30 },
  },
};

// Calculate cost in cents
export function calculateCost(
  provider: LlmProvider,
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = llmPricing[provider]?.[model];
  if (!pricing) {
    // Default pricing if model not found
    return Math.ceil((promptTokens * 100 + completionTokens * 300) / 1000000);
  }
  
  const inputCost = (promptTokens * pricing.input) / 1000000;
  const outputCost = (completionTokens * pricing.output) / 1000000;
  return Math.ceil(inputCost + outputCost);
}

// Estimate cost before making a call (rough estimate based on input length)
export function estimateCost(
  provider: LlmProvider,
  model: string,
  inputText: string,
  estimatedOutputTokens: number = 1000
): { estimatedCostCents: number; estimatedInputTokens: number } {
  // Rough token estimation: ~4 characters per token
  const estimatedInputTokens = Math.ceil(inputText.length / 4);
  const costCents = calculateCost(provider, model, estimatedInputTokens, estimatedOutputTokens);
  return { estimatedCostCents: costCents, estimatedInputTokens };
}

// Encryption utilities
export function encryptApiKey(apiKey: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(apiKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

export function decryptApiKey(encryptedKey: string): string {
  try {
    const [ivHex, encrypted] = encryptedKey.split(":");
    if (!ivHex || !encrypted) return "";
    const iv = Buffer.from(ivHex, "hex");
    const decipher = createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return "";
  }
}

// Rate limit detection
function isRateLimitError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return message.includes("rate limit") || 
         message.includes("429") || 
         message.includes("too many requests") ||
         message.includes("quota exceeded");
}

// Provider unavailable detection
function isProviderUnavailable(error: Error): boolean {
  const message = error.message.toLowerCase();
  return message.includes("503") || 
         message.includes("502") || 
         message.includes("500") ||
         message.includes("service unavailable") ||
         message.includes("internal server error") ||
         message.includes("timeout");
}

// Provider-specific API calls
async function callOpenAI(messages: LlmMessage[], config: LlmConfig): Promise<Omit<LlmResponse, 'costCents' | 'responseTimeMs'>> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0]?.message?.content || "",
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
    model: config.model,
    provider: "openai",
  };
}

async function callDeepSeek(messages: LlmMessage[], config: LlmConfig): Promise<Omit<LlmResponse, 'costCents' | 'responseTimeMs'>> {
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0]?.message?.content || "",
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
    model: config.model,
    provider: "deepseek",
  };
}

async function callClaude(messages: LlmMessage[], config: LlmConfig): Promise<Omit<LlmResponse, 'costCents' | 'responseTimeMs'>> {
  const systemMessage = messages.find(m => m.role === "system")?.content || "";
  const chatMessages = messages.filter(m => m.role !== "system");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens ?? 4096,
      system: systemMessage,
      messages: chatMessages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return {
    content: data.content[0]?.text || "",
    usage: {
      promptTokens: data.usage?.input_tokens || 0,
      completionTokens: data.usage?.output_tokens || 0,
      totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    },
    model: config.model,
    provider: "claude",
  };
}

async function callGemini(messages: LlmMessage[], config: LlmConfig): Promise<Omit<LlmResponse, 'costCents' | 'responseTimeMs'>> {
  const systemInstruction = messages.find(m => m.role === "system")?.content || "";
  const contents = messages
    .filter(m => m.role !== "system")
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        contents,
        generationConfig: {
          temperature: config.temperature ?? 0.7,
          maxOutputTokens: config.maxTokens ?? 4096,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || "",
    usage: {
      promptTokens: data.usageMetadata?.promptTokenCount || 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: data.usageMetadata?.totalTokenCount || 0,
    },
    model: config.model,
    provider: "gemini",
  };
}

// Call provider with timing
async function callProvider(
  messages: LlmMessage[],
  config: LlmConfig
): Promise<LlmResponse> {
  const startTime = Date.now();
  
  let result: Omit<LlmResponse, 'costCents' | 'responseTimeMs'>;
  
  switch (config.provider) {
    case "openai":
      result = await callOpenAI(messages, config);
      break;
    case "deepseek":
      result = await callDeepSeek(messages, config);
      break;
    case "claude":
      result = await callClaude(messages, config);
      break;
    case "gemini":
      result = await callGemini(messages, config);
      break;
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
  
  const responseTimeMs = Date.now() - startTime;
  const costCents = calculateCost(
    config.provider,
    config.model,
    result.usage.promptTokens,
    result.usage.completionTokens
  );
  
  return {
    ...result,
    costCents,
    responseTimeMs,
  };
}

// Main LLM invocation function with fallback support
export async function invokeLlm(
  messages: LlmMessage[],
  config: LlmConfig,
  fallbackConfig?: FallbackConfig,
  availableKeys?: Record<LlmProvider, string | null>
): Promise<LlmResponse> {
  const originalProvider = config.provider;
  let lastError: Error | null = null;
  
  // Try primary provider first
  try {
    return await callProvider(messages, config);
  } catch (error) {
    lastError = error as Error;
    
    // If fallback is disabled or not configured, throw immediately
    if (!fallbackConfig?.enabled || !availableKeys) {
      throw error;
    }
    
    // Check if error is recoverable via fallback
    const shouldFallback = isRateLimitError(lastError) || isProviderUnavailable(lastError);
    if (!shouldFallback) {
      throw error;
    }
  }
  
  // Try fallback providers
  const fallbackProviders = fallbackConfig.priority.filter(
    p => p !== originalProvider && availableKeys[p]
  );
  
  for (let retry = 0; retry < fallbackConfig.maxRetries && retry < fallbackProviders.length; retry++) {
    const fallbackProvider = fallbackProviders[retry];
    const fallbackKey = availableKeys[fallbackProvider];
    
    if (!fallbackKey) continue;
    
    // Wait before retry
    if (fallbackConfig.retryDelayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, fallbackConfig.retryDelayMs));
    }
    
    try {
      const fallbackModel = getDefaultModel(fallbackProvider);
      const result = await callProvider(messages, {
        ...config,
        provider: fallbackProvider,
        apiKey: fallbackKey,
        model: fallbackModel,
      });
      
      return {
        ...result,
        wasFallback: true,
        originalProvider,
        fallbackReason: lastError?.message || "Primary provider failed",
      };
    } catch (error) {
      lastError = error as Error;
      continue;
    }
  }
  
  // All providers failed
  throw new Error(`All LLM providers failed. Last error: ${lastError?.message}`);
}

// Validate API key with detailed feedback
export interface ValidationResult {
  valid: boolean;
  error?: string;
  responseTimeMs?: number;
  modelsTested?: string[];
}

export async function validateApiKey(
  provider: LlmProvider,
  apiKey: string
): Promise<ValidationResult> {
  const startTime = Date.now();
  
  try {
    const testMessages: LlmMessage[] = [
      { role: "user", content: "Say 'OK' if you can hear me." }
    ];

    const config: LlmConfig = {
      provider,
      apiKey,
      model: getDefaultModel(provider),
      maxTokens: 10,
    };

    await callProvider(testMessages, config);
    
    return {
      valid: true,
      responseTimeMs: Date.now() - startTime,
      modelsTested: [config.model],
    };
  } catch (error) {
    const err = error as Error;
    let errorMessage = err.message;
    
    // Parse common error types for better feedback
    if (errorMessage.includes("401") || errorMessage.includes("invalid_api_key")) {
      errorMessage = "Invalid API key. Please check your key and try again.";
    } else if (errorMessage.includes("403")) {
      errorMessage = "API key does not have permission. Check your account settings.";
    } else if (errorMessage.includes("429")) {
      errorMessage = "Rate limit exceeded. Your key is valid but temporarily blocked.";
    } else if (errorMessage.includes("insufficient_quota")) {
      errorMessage = "Insufficient quota. Please add credits to your account.";
    }
    
    return {
      valid: false,
      error: errorMessage,
      responseTimeMs: Date.now() - startTime,
    };
  }
}

// Quick format validation (without API call)
export function validateApiKeyFormat(provider: LlmProvider, apiKey: string): { valid: boolean; error?: string } {
  if (!apiKey || apiKey.trim().length === 0) {
    return { valid: false, error: "API key is required" };
  }
  
  switch (provider) {
    case "openai":
      if (!apiKey.startsWith("sk-")) {
        return { valid: false, error: "OpenAI API keys should start with 'sk-'" };
      }
      if (apiKey.length < 40) {
        return { valid: false, error: "OpenAI API key seems too short" };
      }
      break;
    case "deepseek":
      if (apiKey.length < 20) {
        return { valid: false, error: "DeepSeek API key seems too short" };
      }
      break;
    case "claude":
      if (!apiKey.startsWith("sk-ant-")) {
        return { valid: false, error: "Anthropic API keys should start with 'sk-ant-'" };
      }
      break;
    case "gemini":
      if (apiKey.length < 30) {
        return { valid: false, error: "Gemini API key seems too short" };
      }
      break;
  }
  
  return { valid: true };
}

// Get default model for provider
export function getDefaultModel(provider: LlmProvider): string {
  switch (provider) {
    case "openai":
      return "gpt-4-turbo";
    case "deepseek":
      return "deepseek-reasoner";
    case "claude":
      return "claude-sonnet-4-20250514";
    case "gemini":
      return "gemini-2.0-flash";
    default:
      return "gpt-4-turbo";
  }
}

// Get available models for provider
export function getAvailableModels(provider: LlmProvider): { id: string; name: string; description: string; costPer1MTokens?: { input: number; output: number } }[] {
  const models: Record<LlmProvider, { id: string; name: string; description: string }[]> = {
    openai: [
      { id: "gpt-4-turbo", name: "GPT-4 Turbo", description: "Most capable model, best for complex analysis" },
      { id: "gpt-4o", name: "GPT-4o", description: "Optimized for speed and quality balance" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "Fast and cost-effective" },
      { id: "o1-preview", name: "O1 Preview", description: "Advanced reasoning capabilities" },
      { id: "o1-mini", name: "O1 Mini", description: "Fast reasoning model" },
    ],
    deepseek: [
      { id: "deepseek-reasoner", name: "DeepSeek R1", description: "Advanced reasoning with chain-of-thought" },
      { id: "deepseek-chat", name: "DeepSeek Chat", description: "General purpose chat model" },
      { id: "deepseek-coder", name: "DeepSeek Coder", description: "Specialized for code analysis" },
    ],
    claude: [
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", description: "Best balance of speed and intelligence" },
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", description: "Previous generation, very capable" },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", description: "Fast and efficient" },
      { id: "claude-3-opus-20240229", name: "Claude 3 Opus", description: "Most powerful for complex tasks" },
    ],
    gemini: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", description: "Latest fast model with multimodal" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", description: "Advanced reasoning and long context" },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", description: "Fast and efficient" },
    ],
  };

  return (models[provider] || []).map(model => ({
    ...model,
    costPer1MTokens: llmPricing[provider]?.[model.id],
  }));
}

// Provider metadata
export const providerMetadata: Record<LlmProvider, { name: string; description: string; website: string; icon: string }> = {
  openai: {
    name: "OpenAI",
    description: "Industry-leading AI models including GPT-4 and O1 series",
    website: "https://platform.openai.com/api-keys",
    icon: "🤖",
  },
  deepseek: {
    name: "DeepSeek",
    description: "Advanced reasoning AI with DeepSeek R1 chain-of-thought",
    website: "https://platform.deepseek.com/api_keys",
    icon: "🔮",
  },
  claude: {
    name: "Anthropic Claude",
    description: "Safe and helpful AI assistant with strong reasoning",
    website: "https://console.anthropic.com/settings/keys",
    icon: "🧠",
  },
  gemini: {
    name: "Google Gemini",
    description: "Google's multimodal AI with long context support",
    website: "https://aistudio.google.com/app/apikey",
    icon: "✨",
  },
};

// Format cost for display
export function formatCost(costCents: number): string {
  if (costCents < 1) {
    return "< $0.01";
  }
  return `$${(costCents / 100).toFixed(2)}`;
}

// Format tokens for display
export function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(2)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}
