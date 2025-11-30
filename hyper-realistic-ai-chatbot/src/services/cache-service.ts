import Redis from 'ioredis';
import { createHash } from 'crypto';
import { Message } from '@/types';

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  hits: number;
}

interface PreGeneratedResponse {
  id: string;
  pattern: string;
  response: string;
  authenticityScore: number;
  tokens: number;
  timestamp: number;
}

export class CacheService {
  private redis: Redis;
  private memoryCache: Map<string, CacheEntry>;
  private preGenerated: Map<string, PreGeneratedResponse[]>;
  private maxMemorySize: number;
  private hitCount: number;
  private missCount: number;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 10,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.memoryCache = new Map();
    this.preGenerated = new Map();
    this.maxMemorySize = 10000; // Max entries in memory cache
    this.hitCount = 0;
    this.missCount = 0;

    this.initializeCache();
  }

  private async initializeCache(): Promise<void> {
    try {
      await this.redis.connect();

      // Load pre-generated responses
      await this.loadPreGeneratedResponses();

      // Start cleanup interval
      setInterval(() => this.cleanup(), 60000); // Cleanup every minute

      console.log('🚀 Ultra-fast cache initialized');
    } catch (error) {
      console.error('Cache initialization failed:', error);
    }
  }

  async get(key: string): Promise<any> {
    const startTime = Date.now();

    // Check memory first (fastest)
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && memoryEntry.timestamp + memoryEntry.ttl > Date.now()) {
      memoryEntry.hits++;
      this.hitCount++;
      return memoryEntry.data;
    }

    // Check Redis (fast)
    try {
      const redisData = await this.redis.getex(`cache:${key}`, 1);
      if (redisData) {
        const parsed = JSON.parse(redisData);

        // Store in memory for next time
        this.memoryCache.set(key, {
          data: parsed,
          timestamp: Date.now(),
          ttl: 300000, // 5 minutes
          hits: 1
        });

        this.hitCount++;
        return parsed;
      }
    } catch (error) {
      console.error('Redis get error:', error);
    }

    this.missCount++;
    return null;
  }

  async set(key: string, data: any, ttl: number = 300000): Promise<void> {
    // Set in memory (immediate)
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0
    });

    // Cleanup if memory cache is full
    if (this.memoryCache.size > this.maxMemorySize) {
      this.cleanupMemoryCache();
    }

    // Set in Redis (persistent)
    try {
      await this.redis.setex(`cache:${key}`, Math.ceil(ttl / 1000), JSON.stringify(data));
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  async getResponsePattern(messages: Message[]): Promise<string | null> {
    // Generate pattern key from message sequence
    const pattern = this.generatePattern(messages);

    // Check pre-generated responses
    const preGenResponses = this.preGenerated.get(pattern);
    if (preGenResponses && preGenResponses.length > 0) {
      // Return best matching response
      return preGenResponses[0].response;
    }

    // Check cache
    const cacheKey = `pattern:${this.hashPattern(pattern)}`;
    const cached = await this.get(cacheKey);
    if (cached) {
      return cached.response;
    }

    return null;
  }

  async cacheResponsePattern(messages: Message[], response: string, authenticityScore: number): Promise<void> {
    const pattern = this.generatePattern(messages);
    const cacheKey = `pattern:${this.hashPattern(pattern)}`;

    // Cache the response
    await this.set(cacheKey, {
      response,
      authenticityScore,
      timestamp: Date.now()
    }, 3600000); // 1 hour

    // Add to pre-generated if high authenticity
    if (authenticityScore > 0.85) {
      this.addToPreGenerated(pattern, response, authenticityScore);
    }
  }

  private generatePattern(messages: Message[]): string {
    // Generate semantic pattern from last 3 messages
    const recentMessages = messages.slice(-3);
    const pattern = recentMessages
      .map(m => {
        const words = m.content.toLowerCase().split(' ').slice(0, 5); // First 5 words
        return `${m.role}:${words.join(' ')}`;
      })
      .join('|');

    return pattern;
  }

  private hashPattern(pattern: string): string {
    return createHash('md5').update(pattern).digest('hex');
  }

  private addToPreGenerated(pattern: string, response: string, authenticityScore: number): void {
    if (!this.preGenerated.has(pattern)) {
      this.preGenerated.set(pattern, []);
    }

    const responses = this.preGenerated.get(pattern)!;
    responses.push({
      id: createHash('md5').update(response).digest('hex').slice(0, 8),
      pattern,
      response,
      authenticityScore,
      tokens: Math.ceil(response.length / 4),
      timestamp: Date.now()
    });

    // Keep only top 5 responses per pattern
    responses.sort((a, b) => b.authenticityScore - a.authenticityScore);
    if (responses.length > 5) {
      responses.splice(5);
    }
  }

  private async loadPreGeneratedResponses(): Promise<void> {
    try {
      const data = await this.redis.get('pre_generated');
      if (data) {
        const parsed = JSON.parse(data);
        this.preGenerated = new Map(Object.entries(parsed));
        console.log(`Loaded ${this.preGenerated.size} pre-generated response patterns`);
      }
    } catch (error) {
      console.error('Failed to load pre-generated responses:', error);
    }
  }

  private async savePreGeneratedResponses(): Promise<void> {
    try {
      const data = Object.fromEntries(this.preGenerated);
      await this.redis.setex('pre_generated', 86400, JSON.stringify(data)); // 24 hours
    } catch (error) {
      console.error('Failed to save pre-generated responses:', error);
    }
  }

  private cleanupMemoryCache(): void {
    // Remove least recently used items
    const entries = Array.from(this.memoryCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = entries.slice(0, Math.floor(this.maxMemorySize * 0.2));
    toRemove.forEach(([key]) => this.memoryCache.delete(key));
  }

  private async cleanup(): Promise<void> {
    // Clean expired memory entries
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.timestamp + entry.ttl < now) {
        this.memoryCache.delete(key);
      }
    }

    // Clean old pre-generated responses
    for (const [pattern, responses] of this.preGenerated.entries()) {
      const filtered = responses.filter(r => now - r.timestamp < 86400000); // 24 hours
      if (filtered.length === 0) {
        this.preGenerated.delete(pattern);
      } else {
        this.preGenerated.set(pattern, filtered);
      }
    }

    // Save pre-generated to Redis
    await this.savePreGeneratedResponses();

    // Log stats
    const hitRate = this.hitCount / (this.hitCount + this.missCount) * 100;
    console.log(`📊 Cache stats - Hit rate: ${hitRate.toFixed(1)}%, Memory: ${this.memoryCache.size}, Patterns: ${this.preGenerated.size}`);
  }

  async getPrediction(userInput: string): Promise<string | null> {
    // Predict response based on common patterns
    const input = userInput.toLowerCase().trim();

    // Common question patterns
    const patterns = {
      'how are': 'I\'m doing great, thanks for asking! How about yourself?',
      'what is your': 'I\'m a conversational AI designed to help with various tasks.',
      'can you help': 'Absolutely! I\'d be happy to help. What do you need?',
      'tell me about': 'Sure! I\'d be glad to share information about that topic.',
      'how do i': 'Here\'s how you can do that step by step.',
      'why is': 'That\'s an interesting question. Let me explain the reasoning behind it.',
      'what do you think': 'Based on my understanding, I believe...',
      'thank you': 'You\'re welcome! Is there anything else I can help with?',
      'goodbye': 'It was great chatting with you! Feel free to come back anytime.',
      'hello': 'Hey there! How can I assist you today?'
    };

    for (const [pattern, response] of Object.entries(patterns)) {
      if (input.includes(pattern)) {
        // Cache the prediction
        await this.set(`pred:${this.hashPattern(input)}`, response, 60000);
        return response;
      }
    }

    return null;
  }

  async batchGet(keys: string[]): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    // Check memory first
    const memoryKeys: string[] = [];
    const redisKeys: string[] = [];

    for (const key of keys) {
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && memoryEntry.timestamp + memoryEntry.ttl > Date.now()) {
        results.set(key, memoryEntry.data);
        memoryEntry.hits++;
        this.hitCount++;
      } else {
        redisKeys.push(key);
      }
    }

    // Batch get from Redis
    if (redisKeys.length > 0) {
      try {
        const redisKeysMapped = redisKeys.map(k => `cache:${k}`);
        const redisValues = await this.redis.mget(...redisKeysMapped);

        for (let i = 0; i < redisKeys.length; i++) {
          const key = redisKeys[i];
          const value = redisValues[i];

          if (value) {
            const parsed = JSON.parse(value);
            results.set(key, parsed);

            // Store in memory
            this.memoryCache.set(key, {
              data: parsed,
              timestamp: Date.now(),
              ttl: 300000,
              hits: 1
            });

            this.hitCount++;
          }
        }
      } catch (error) {
        console.error('Batch Redis get error:', error);
      }
    }

    this.missCount += (keys.length - results.size);
    return results;
  }

  getStats(): { hitRate: number; memorySize: number; patternCount: number } {
    const total = this.hitCount + this.missCount;
    return {
      hitRate: total > 0 ? (this.hitCount / total) * 100 : 0,
      memorySize: this.memoryCache.size,
      patternCount: this.preGenerated.size
    };
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.preGenerated.clear();

    try {
      await this.redis.flushdb();
      console.log('Cache cleared');
    } catch (error) {
      console.error('Failed to clear Redis cache:', error);
    }
  }

  async disconnect(): Promise<void> {
    await this.savePreGeneratedResponses();
    await this.redis.disconnect();
  }
}