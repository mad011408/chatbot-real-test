import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleAuth } from 'google-auth-library';
import { Message, LLMProvider, LLMModel, StreamingOptions } from '@/types';
import { LLM_PROVIDERS, ULTRA_FAST_CONFIG, PROVIDER_CONFIGS } from '@/config/llm.config';
import { SYSTEM_PROMPTS } from '@/config/prompts';

export class AIService {
  private openai: OpenAI;
  private anthropic: Anthropic;
  private googleAuth: GoogleAuth;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: PROVIDER_CONFIGS.OpenAI.baseURL
    });

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseURL: PROVIDER_CONFIGS.Anthropic.baseURL
    });

    this.googleAuth = new GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
  }

  async generateResponse(
    messages: Message[],
    modelId: string,
    options: StreamingOptions = { speed: 'ultra', tokensPerSecond: 10000, chunkSize: 1, enableLineByLine: true },
    systemPrompt?: string
  ): Promise<AsyncIterable<string>> {
    const provider = LLM_PROVIDERS.find(p => p.models.some(m => m.id === modelId));
    const model = provider?.models.find(m => m.id === modelId);

    if (!provider || !model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const enhancedSystemPrompt = systemPrompt || SYSTEM_PROMPTS.HYPER_REALISTIC;
    const speedConfig = this.getSpeedConfig(options.speed);

    switch (provider.name) {
      case 'OpenAI':
        return this.streamOpenAI(messages, model, enhancedSystemPrompt, { ...options, ...speedConfig });
      case 'Anthropic':
        return this.streamAnthropic(messages, model, enhancedSystemPrompt, { ...options, ...speedConfig });
      case 'Google':
        return this.streamGoogle(messages, model, enhancedSystemPrompt, { ...options, ...speedConfig });
      default:
        throw new Error(`Provider ${provider.name} not supported`);
    }
  }

  private async* streamOpenAI(
    messages: Message[],
    model: LLMModel,
    systemPrompt: string,
    options: StreamingOptions
  ): AsyncIterable<string> {
    const startTime = Date.now();
    const targetTokensPerSecond = options.tokensPerSecond;
    const chunkDelay = 1000 / targetTokensPerSecond;

    const stream = await this.openai.chat.completions.create({
      model: model.id,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      max_tokens: model.maxTokens,
      temperature: ULTRA_FAST_CONFIG.temperature,
      top_p: ULTRA_FAST_CONFIG.topP,
      stream: true,
      stream_options: { include_usage: true }
    });

    let buffer = '';
    let lineBuffer = '';

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';

      if (content) {
        buffer += content;
        lineBuffer += content;

        if (options.enableLineByLine && content.includes('\n')) {
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop() || '';

          for (const line of lines) {
            yield line + '\n';
            await this.delay(chunkDelay);
          }
        } else {
          for (let i = 0; i < content.length; i += options.chunkSize) {
            const chunkSize = Math.min(options.chunkSize, content.length - i);
            yield content.slice(i, i + chunkSize);
            await this.delay(chunkDelay);
          }
        }
      }
    }

    if (lineBuffer) {
      yield lineBuffer;
    }
  }

  private async* streamAnthropic(
    messages: Message[],
    model: LLMModel,
    systemPrompt: string,
    options: StreamingOptions
  ): AsyncIterable<string> {
    const startTime = Date.now();
    const targetTokensPerSecond = options.tokensPerSecond;
    const chunkDelay = 1000 / targetTokensPerSecond;

    const stream = await this.anthropic.messages.create({
      model: model.id,
      max_tokens: model.maxTokens,
      temperature: ULTRA_FAST_CONFIG.temperature,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: true
    });

    let buffer = '';
    let lineBuffer = '';

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        const content = chunk.delta.text;
        buffer += content;
        lineBuffer += content;

        if (options.enableLineByLine && content.includes('\n')) {
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop() || '';

          for (const line of lines) {
            yield line + '\n';
            await this.delay(chunkDelay);
          }
        } else {
          for (let i = 0; i < content.length; i += options.chunkSize) {
            const chunkSize = Math.min(options.chunkSize, content.length - i);
            yield content.slice(i, i + chunkSize);
            await this.delay(chunkDelay);
          }
        }
      }
    }

    if (lineBuffer) {
      yield lineBuffer;
    }
  }

  private async* streamGoogle(
    messages: Message[],
    model: LLMModel,
    systemPrompt: string,
    options: StreamingOptions
  ): AsyncIterable<string> {
    const client = await this.googleAuth.getClient();
    const targetTokensPerSecond = options.tokensPerSecond;
    const chunkDelay = 1000 / targetTokensPerSecond;

    const response = await client.request({
      url: `${PROVIDER_CONFIGS.Google.baseURL}/models/${model.id}:streamGenerateContent`,
      method: 'POST',
      data: {
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          ...messages.map(m => ({ role: m.role, parts: [{ text: m.content }] }))
        ],
        generationConfig: {
          temperature: ULTRA_FAST_CONFIG.temperature,
          topP: ULTRA_FAST_CONFIG.topP,
          maxOutputTokens: model.maxTokens
        }
      }
    });

    let buffer = '';
    let lineBuffer = '';

    for await (const chunk of response.data) {
      const content = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (content) {
        buffer += content;
        lineBuffer += content;

        if (options.enableLineByLine && content.includes('\n')) {
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop() || '';

          for (const line of lines) {
            yield line + '\n';
            await this.delay(chunkDelay);
          }
        } else {
          for (let i = 0; i < content.length; i += options.chunkSize) {
            const chunkSize = Math.min(options.chunkSize, content.length - i);
            yield content.slice(i, i + chunkSize);
            await this.delay(chunkDelay);
          }
        }
      }
    }

    if (lineBuffer) {
      yield lineBuffer;
    }
  }

  private getSpeedConfig(speed: StreamingOptions['speed']) {
    switch (speed) {
      case 'ultra':
        return { tokensPerSecond: 10000, chunkSize: 1 };
      case 'fast':
        return { tokensPerSecond: 5000, chunkSize: 2 };
      case 'normal':
        return { tokensPerSecond: 1000, chunkSize: 5 };
      case 'slow':
        return { tokensPerSecond: 500, chunkSize: 10 };
      default:
        return { tokensPerSecond: 10000, chunkSize: 1 };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getAvailableProviders(): Promise<LLMProvider[]> {
    return LLM_PROVIDERS;
  }

  async getModelsByProvider(providerName: string): Promise<LLMModel[]> {
    const provider = LLM_PROVIDERS.find(p => p.name === providerName);
    return provider?.models || [];
  }

  async estimateTokens(text: string): Promise<number> {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}