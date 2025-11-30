export type LLMProvider = "anthropic" | "openai" | "google" | "bons-ai";

export interface LLMConfig {
  provider: LLMProvider;
  apiKey?: string;
  baseURL?: string;
  modelId: string;
}


