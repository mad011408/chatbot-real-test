export type ModelProvider = "anthropic" | "openai" | "google" | "bons-ai";

export interface Model {
  id: string;
  name: string;
  provider: ModelProvider;
  contextWindow: number;
  maxTokens: number;
  supportsImages: boolean;
  supportsTools: boolean;
}


