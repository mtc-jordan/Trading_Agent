/**
 * Multi-Provider LLM Service
 * Supports OpenAI, DeepSeek R1, Claude, and Gemini with user-configurable settings
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { ENV } from "../_core/env";

// Encryption key derived from JWT_SECRET
const ENCRYPTION_KEY = scryptSync(ENV.cookieSecret || "default-key", "salt", 32);
const IV_LENGTH = 16;

// Types
export type LlmProvider = "openai" | "deepseek" | "claude" | "gemini";

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
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: LlmProvider;
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

// Provider-specific API calls
async function callOpenAI(messages: LlmMessage[], config: LlmConfig): Promise<LlmResponse> {
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
    throw new Error(`OpenAI API error: ${error}`);
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

async function callDeepSeek(messages: LlmMessage[], config: LlmConfig): Promise<LlmResponse> {
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
    throw new Error(`DeepSeek API error: ${error}`);
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

async function callClaude(messages: LlmMessage[], config: LlmConfig): Promise<LlmResponse> {
  // Extract system message
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
    throw new Error(`Claude API error: ${error}`);
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

async function callGemini(messages: LlmMessage[], config: LlmConfig): Promise<LlmResponse> {
  // Convert messages to Gemini format
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
    throw new Error(`Gemini API error: ${error}`);
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

// Main LLM invocation function
export async function invokeLlm(
  messages: LlmMessage[],
  config: LlmConfig
): Promise<LlmResponse> {
  switch (config.provider) {
    case "openai":
      return callOpenAI(messages, config);
    case "deepseek":
      return callDeepSeek(messages, config);
    case "claude":
      return callClaude(messages, config);
    case "gemini":
      return callGemini(messages, config);
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}

// Validate API key by making a simple request
export async function validateApiKey(provider: LlmProvider, apiKey: string): Promise<boolean> {
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

    await invokeLlm(testMessages, config);
    return true;
  } catch {
    return false;
  }
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
export function getAvailableModels(provider: LlmProvider): { id: string; name: string; description: string }[] {
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

  return models[provider] || [];
}

// Provider metadata
export const providerMetadata: Record<LlmProvider, { name: string; description: string; website: string }> = {
  openai: {
    name: "OpenAI",
    description: "Industry-leading AI models including GPT-4 and O1 series",
    website: "https://platform.openai.com/api-keys",
  },
  deepseek: {
    name: "DeepSeek",
    description: "Advanced reasoning AI with DeepSeek R1 chain-of-thought",
    website: "https://platform.deepseek.com/api_keys",
  },
  claude: {
    name: "Anthropic Claude",
    description: "Safe and helpful AI assistant with strong reasoning",
    website: "https://console.anthropic.com/settings/keys",
  },
  gemini: {
    name: "Google Gemini",
    description: "Google's multimodal AI with long context support",
    website: "https://aistudio.google.com/app/apikey",
  },
};
