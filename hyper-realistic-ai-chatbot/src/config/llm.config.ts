import { LLMProvider, LLMModel } from '@/types';

export const LLM_PROVIDERS: LLMProvider[] = [
  {
    name: 'OpenAI',
    models: [
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'OpenAI',
        maxTokens: 4096,
        contextWindow: 128000,
        costPer1KTokens: 0.01,
        capabilities: {
          textGeneration: true,
          codeGeneration: true,
          reasoning: true,
          creativity: 0.9,
          accuracy: 0.95,
          speed: 0.7
        }
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'OpenAI',
        maxTokens: 4096,
        contextWindow: 16385,
        costPer1KTokens: 0.0015,
        capabilities: {
          textGeneration: true,
          codeGeneration: true,
          reasoning: true,
          creativity: 0.8,
          accuracy: 0.85,
          speed: 0.9
        }
      }
    ],
    maxTokens: 4096,
    supportsStreaming: true,
    latency: 150,
    reliability: 0.99
  },
  {
    name: 'Anthropic',
    models: [
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        provider: 'Anthropic',
        maxTokens: 4096,
        contextWindow: 200000,
        costPer1KTokens: 0.015,
        capabilities: {
          textGeneration: true,
          codeGeneration: true,
          reasoning: true,
          creativity: 0.95,
          accuracy: 0.97,
          speed: 0.6
        }
      },
      {
        id: 'claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        provider: 'Anthropic',
        maxTokens: 4096,
        contextWindow: 200000,
        costPer1KTokens: 0.003,
        capabilities: {
          textGeneration: true,
          codeGeneration: true,
          reasoning: true,
          creativity: 0.85,
          accuracy: 0.92,
          speed: 0.8
        }
      }
    ],
    maxTokens: 4096,
    supportsStreaming: true,
    latency: 120,
    reliability: 0.98
  },
  {
    name: 'Google',
    models: [
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        provider: 'Google',
        maxTokens: 8192,
        contextWindow: 32768,
        costPer1KTokens: 0.0005,
        capabilities: {
          textGeneration: true,
          codeGeneration: true,
          reasoning: true,
          creativity: 0.82,
          accuracy: 0.88,
          speed: 0.95
        }
      }
    ],
    maxTokens: 8192,
    supportsStreaming: true,
    latency: 100,
    reliability: 0.97
  }
];

export const DEFAULT_PROVIDER = 'OpenAI';
export const DEFAULT_MODEL = 'gpt-3.5-turbo';

export const ULTRA_FAST_CONFIG = {
  temperature: 0.1,
  topP: 0.9,
  topK: 40,
  maxTokens: 100000,
  presencePenalty: 0,
  frequencyPenalty: 0,
  stopSequences: [],
  stream: true,
  tokensPerSecond: 10000,
  chunkSize: 1,
  enableLineByLine: true
};

export const PROVIDER_CONFIGS = {
  OpenAI: {
    baseURL: 'https://api.openai.com/v1',
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000
  },
  Anthropic: {
    baseURL: 'https://api.anthropic.com',
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000
  },
  Google: {
    baseURL: 'https://generativelanguage.googleapis.com/v1',
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000
  }
};