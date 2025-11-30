import { Message, LLMProvider } from '@/types';
import { AIService } from './ai-service';
import { CacheService } from './cache-service';
import { TemplateService } from './template-service';

interface ProcessingRequest {
  id: string;
  messages: Message[];
  modelId: string;
  priority: 'ultra' | 'high' | 'normal' | 'low';
  timestamp: number;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

interface ParallelResult {
  id: string;
  response: string;
  latency: number;
  authenticityScore?: number;
  source: 'cache' | 'template' | 'ai' | 'parallel';
  provider?: string;
}

interface WorkerPool {
  workers: Map<string, Worker>;
  queue: ProcessingRequest[];
  processing: Set<string>;
  maxConcurrent: number;
}

export class ParallelProcessor {
  private aiService: AIService;
  private cacheService: CacheService;
  private templateService: TemplateService;
  private pools: Map<string, WorkerPool>;
  private batchQueue: ProcessingRequest[];
  private isProcessingBatch: boolean;
  private maxBatchSize: number;

  constructor(aiService: AIService, cacheService: CacheService, templateService: TemplateService) {
    this.aiService = aiService;
    this.cacheService = cacheService;
    this.templateService = templateService;
    this.pools = new Map();
    this.batchQueue = [];
    this.isProcessingBatch = false;
    this.maxBatchSize = 10;

    this.initializePools();
  }

  private initializePools(): void {
    // Create pools for different providers/models
    this.pools.set('openai', {
      workers: new Map(),
      queue: [],
      processing: new Set(),
      maxConcurrent: 5 // 5 concurrent requests
    });

    this.pools.set('anthropic', {
      workers: new Map(),
      queue: [],
      processing: new Set(),
      maxConcurrent: 3 // 3 concurrent requests
    });

    this.pools.set('google', {
      workers: new Map(),
      queue: [],
      processing: new Set(),
      maxConcurrent: 4 // 4 concurrent requests
    });

    // Start batch processing
    setInterval(() => this.processBatch(), 10); // Process every 10ms
  }

  async processRequest(
    messages: Message[],
    modelId: string,
    priority: ProcessingRequest['priority'] = 'normal'
  ): Promise<ParallelResult> {
    const requestId = this.generateRequestId();

    // Try ultra-fast paths first
    const fastResult = await this.tryFastPaths(messages, modelId);
    if (fastResult) {
      return fastResult;
    }

    // Create processing request
    return new Promise((resolve, reject) => {
      const request: ProcessingRequest = {
        id: requestId,
        messages,
        modelId,
        priority,
        timestamp: Date.now(),
        resolve,
        reject
      };

      // Add to appropriate pool
      const poolName = this.getPoolName(modelId);
      const pool = this.pools.get(poolName);

      if (pool) {
        if (priority === 'ultra' || pool.processing.size < pool.maxConcurrent) {
          // Process immediately
          this.processRequestImmediately(request, pool);
        } else {
          // Add to queue
          this.addToQueue(request, pool);
        }
      } else {
        // Add to batch queue
        this.batchQueue.push(request);
      }
    });
  }

  private async tryFastPaths(messages: Message[], modelId: string): Promise<ParallelResult | null> {
    const startTime = Date.now();

    // 1. Check cache (fastest)
    const cachedResponse = await this.cacheService.getResponsePattern(messages);
    if (cachedResponse) {
      return {
        id: this.generateRequestId(),
        response: cachedResponse,
        latency: Date.now() - startTime,
        source: 'cache'
      };
    }

    // 2. Check templates (very fast)
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'user') {
      const templateResponse = await this.templateService.getFastResponse(lastMessage.content, messages);
      if (templateResponse) {
        return {
          id: this.generateRequestId(),
          response: templateResponse.text,
          latency: Date.now() - startTime,
          authenticityScore: templateResponse.authenticity,
          source: 'template'
        };
      }
    }

    // 3. Check prediction (fast)
    if (lastMessage && lastMessage.role === 'user') {
      const prediction = await this.cacheService.getPrediction(lastMessage.content);
      if (prediction) {
        return {
          id: this.generateRequestId(),
          response: prediction,
          latency: Date.now() - startTime,
          source: 'cache'
        };
      }
    }

    return null;
  }

  private async processRequestImmediately(request: ProcessingRequest, pool: WorkerPool): Promise<void> {
    pool.processing.add(request.id);

    try {
      // Try parallel processing for ultra speed
      if (request.priority === 'ultra') {
        const result = await this.processParallel(request);
        request.resolve(result);
      } else {
        // Normal single processing
        const result = await this.processSingle(request);
        request.resolve(result);
      }
    } catch (error) {
      request.reject(error);
    } finally {
      pool.processing.delete(request.id);
      this.processQueue(pool);
    }
  }

  private async processParallel(request: ProcessingRequest): Promise<ParallelResult> {
    const startTime = Date.now();

    // Start multiple AI providers in parallel
    const promises = [
      this.processWithProvider(request, 'openai', 'gpt-3.5-turbo'),
      this.processWithProvider(request, 'anthropic', 'claude-3-sonnet'),
      this.processWithProvider(request, 'google', 'gemini-pro')
    ];

    // Wait for first response (race condition)
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<ParallelResult>[];

    if (successful.length > 0) {
      // Return fastest successful response
      const fastest = successful.reduce((prev, curr) =>
        curr.value.latency < prev.value.latency ? curr : prev
      );

      // Cache the fastest response
      await this.cacheService.cacheResponsePattern(
        request.messages,
        fastest.value.response,
        fastest.value.authenticityScore || 0.8
      );

      return {
        ...fastest.value,
        source: 'parallel'
      };
    }

    throw new Error('All parallel requests failed');
  }

  private async processSingle(request: ProcessingRequest): Promise<ParallelResult> {
    const startTime = Date.now();

    // Generate response with AI
    const responseStream = await this.aiService.generateResponse(
      request.messages,
      request.modelId,
      { speed: 'ultra', tokensPerSecond: 15000, chunkSize: 1, enableLineByLine: true }
    );

    let response = '';
    for await (const chunk of responseStream) {
      response += chunk;
    }

    return {
      id: request.id,
      response,
      latency: Date.now() - startTime,
      source: 'ai'
    };
  }

  private async processWithProvider(
    request: ProcessingRequest,
    provider: string,
    model: string
  ): Promise<ParallelResult> {
    try {
      const startTime = Date.now();
      const responseStream = await this.aiService.generateResponse(
        request.messages,
        model,
        { speed: 'ultra', tokensPerSecond: 15000, chunkSize: 1, enableLineByLine: true }
      );

      let response = '';
      for await (const chunk of responseStream) {
        response += chunk;
      }

      return {
        id: request.id,
        response,
        latency: Date.now() - startTime,
        source: 'ai',
        provider
      };
    } catch (error) {
      throw error;
    }
  }

  private addToQueue(request: ProcessingRequest, pool: WorkerPool): void {
    // Insert based on priority
    let insertIndex = pool.queue.length;

    for (let i = 0; i < pool.queue.length; i++) {
      if (this.comparePriority(request.priority, pool.queue[i].priority) > 0) {
        insertIndex = i;
        break;
      }
    }

    pool.queue.splice(insertIndex, 0, request);
  }

  private processQueue(pool: WorkerPool): void {
    while (pool.processing.size < pool.maxConcurrent && pool.queue.length > 0) {
      const request = pool.queue.shift();
      if (request) {
        this.processRequestImmediately(request, pool);
      }
    }
  }

  private async processBatch(): Promise<void> {
    if (this.isProcessingBatch || this.batchQueue.length === 0) {
      return;
    }

    this.isProcessingBatch = true;

    try {
      // Process batch in parallel
      const batch = this.batchQueue.splice(0, this.maxBatchSize);
      const promises = batch.map(request =>
        this.processRequest(request.messages, request.modelId, request.priority)
      );

      const results = await Promise.allSettled(promises);

      // Resolve/reject original requests
      results.forEach((result, index) => {
        const request = batch[index];
        if (result.status === 'fulfilled') {
          request.resolve(result.value);
        } else {
          request.reject(result.reason);
        }
      });

    } catch (error) {
      console.error('Batch processing error:', error);
    } finally {
      this.isProcessingBatch = false;
    }
  }

  private getPoolName(modelId: string): string {
    if (modelId.includes('gpt')) return 'openai';
    if (modelId.includes('claude')) return 'anthropic';
    if (modelId.includes('gemini')) return 'google';
    return 'openai'; // default
  }

  private comparePriority(p1: ProcessingRequest['priority'], p2: ProcessingRequest['priority']): number {
    const priorityOrder = { 'ultra': 4, 'high': 3, 'normal': 2, 'low': 1 };
    return (priorityOrder[p1] || 0) - (priorityOrder[p2] || 0);
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  // Pre-generate common responses
  async preGenerateResponses(): Promise<void> {
    const commonPatterns = [
      { messages: [{ role: 'user', content: 'hello' }], modelId: 'gpt-3.5-turbo' },
      { messages: [{ role: 'user', content: 'how are you' }], modelId: 'gpt-3.5-turbo' },
      { messages: [{ role: 'user', content: 'thank you' }], modelId: 'gpt-3.5-turbo' },
      { messages: [{ role: 'user', content: 'goodbye' }], modelId: 'gpt-3.5-turbo' },
      { messages: [{ role: 'user', content: 'help me' }], modelId: 'gpt-3.5-turbo' }
    ];

    console.log('🚀 Pre-generating responses for ultra-fast access...');

    // Process in parallel
    const promises = commonPatterns.map(async (pattern, index) => {
      try {
        const result = await this.processRequest(
          pattern.messages,
          pattern.modelId,
          'normal'
        );

        // Cache the pre-generated response
        await this.cacheService.set(
          `pre:${index}`,
          result,
          3600000 // 1 hour
        );

        console.log(`✅ Pre-generated response ${index + 1}/${commonPatterns.length}`);
      } catch (error) {
        console.error(`❌ Failed to pre-generate response ${index + 1}:`, error);
      }
    });

    await Promise.all(promises);
    console.log('🎯 Pre-generation complete!');
  }

  getStats(): {
    pools: Record<string, { queue: number; processing: number }>;
    batchQueue: number;
  } {
    const stats: any = {
      pools: {},
      batchQueue: this.batchQueue.length
    };

    for (const [name, pool] of this.pools.entries()) {
      stats.pools[name] = {
        queue: pool.queue.length,
        processing: pool.processing.size
      };
    }

    return stats;
  }

  async clearQueues(): Promise<void> {
    // Clear all queues
    for (const pool of this.pools.values()) {
      pool.queue = [];
    }
    this.batchQueue = [];
  }
}