export interface LLMModel {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  supportsImages?: boolean;
  supportsTools?: boolean;
  maxTokens?: number;
}

export const LLM_MODELS: LLMModel[] = [
  // Anthropic Models
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    provider: "anthropic",
    contextWindow: 200000,
    supportsImages: true,
    supportsTools: true,
    maxTokens: 8192,
  },
  {
    id: "anthropic/claude-opus-4.1",
    name: "Claude Opus 4.1",
    provider: "anthropic",
    contextWindow: 200000,
    supportsImages: true,
    supportsTools: true,
    maxTokens: 8192,
  },
  {
    id: "anthropic/claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    provider: "anthropic",
    contextWindow: 200000,
    supportsImages: true,
    supportsTools: true,
    maxTokens: 8192,
  },
  {
    id: "anthropic/claude-opus-4.5",
    name: "Claude Opus 4.5",
    provider: "anthropic",
    contextWindow: 200000,
    supportsImages: true,
    supportsTools: true,
    maxTokens: 8192,
  },
  // OpenAI Models
  {
    id: "openai/gpt-5-codex",
    name: "GPT-5 Codex",
    provider: "openai",
    contextWindow: 128000,
    supportsImages: false,
    supportsTools: true,
    maxTokens: 16384,
  },
  {
    id: "openai/gpt-5.1-codex-max",
    name: "GPT-5.1 Codex Max",
    provider: "openai",
    contextWindow: 128000,
    supportsImages: false,
    supportsTools: true,
    maxTokens: 16384,
  },
  // Google Models
  {
    id: "gemini-3-pro-preview",
    name: "Gemini 3 Pro Preview",
    provider: "google",
    contextWindow: 1000000,
    supportsImages: true,
    supportsTools: true,
    maxTokens: 8192,
  },
];

export const getModelById = (id: string): LLMModel | undefined => {
  return LLM_MODELS.find((model) => model.id === id);
};

export const getModelsByProvider = (provider: string): LLMModel[] => {
  return LLM_MODELS.filter((model) => model.provider === provider);
};

export const DEFAULT_MODEL_ID = "anthropic/claude-sonnet-4";


