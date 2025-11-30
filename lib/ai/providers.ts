import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { LanguageModel } from "ai";
import { CustomProvider } from "@/types/custom-provider";

// Bons.ai API Configuration
const BONS_AI_API_KEY = process.env.BONS_AI_API_KEY || process.env.NEXT_PUBLIC_BONS_AI_API_KEY || "sk_cr_CLACzLNP4e7FGgNFLZ3NuaT25vaJQj3hMPufwsYZG4oG";
const BONS_AI_BASE_URL = process.env.BONS_AI_BASE_URL || process.env.NEXT_PUBLIC_BONS_AI_BASE_URL || "https://go.trybons.ai";
const BONS_AI_API_PATH = process.env.BONS_AI_API_PATH || "/v1/chat/completions";

// Create custom Bons.ai provider that uses OpenAI-compatible API
const createBonsAI = () => {
  return createOpenAI({
    apiKey: BONS_AI_API_KEY,
    baseURL: `${BONS_AI_BASE_URL}/v1`,
  });
};

// Anthropic provider
const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// OpenAI provider
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Google provider
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

// Bons.ai provider (using OpenAI-compatible interface)
const bonsAI = createBonsAI();

export interface ModelProvider {
  getModel: (modelId: string) => LanguageModel;
}

// Dynamic custom providers cache
const customProvidersCache = new Map<string, ReturnType<typeof createOpenAI>>();

const getCustomProvider = (provider: CustomProvider): ReturnType<typeof createOpenAI> => {
  const cacheKey = provider.id;
  if (!customProvidersCache.has(cacheKey)) {
    const client = createOpenAI({
      apiKey: provider.apiKey,
      baseURL: provider.baseURL,
    });
    customProvidersCache.set(cacheKey, client);
  }
  return customProvidersCache.get(cacheKey)!;
};

export const getModelProvider = (modelId: string, customProvider?: CustomProvider): LanguageModel => {
  // Check if using custom provider
  if (customProvider && customProvider.models.includes(modelId)) {
    const provider = getCustomProvider(customProvider);
    return provider(modelId);
  }

  // All specified models should use Bons.ai API
  const bonsAIModels = [
    "anthropic/claude-sonnet-4",
    "anthropic/claude-opus-4.1",
    "anthropic/claude-sonnet-4.5",
    "anthropic/claude-opus-4.5",
    "openai/gpt-5-codex",
    "openai/gpt-5.1-codex-max",
    "gemini-3-pro-preview",
  ];

  // Use Bons.ai for all specified models
  if (bonsAIModels.includes(modelId)) {
    return bonsAI(modelId);
  }

  // Fallback to original providers for other models
  if (modelId.startsWith("anthropic/")) {
    const modelName = modelId.replace("anthropic/", "");
    return anthropic(modelName as any);
  }

  if (modelId.startsWith("openai/")) {
    const modelName = modelId.replace("openai/", "");
    return openai(modelName as any);
  }

  if (modelId.startsWith("gemini-") || modelId.includes("gemini")) {
    return google(modelId as any);
  }

  // Default to Bons.ai for any unrecognized models
  return bonsAI(modelId);
};

export { anthropic, openai, google, bonsAI };

