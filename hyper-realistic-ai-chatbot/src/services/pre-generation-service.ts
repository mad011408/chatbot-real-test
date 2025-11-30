import { Message } from '@/types';
import { AIService } from './ai-service';
import { CacheService } from './cache-service';
import { SYSTEM_PROMPTS } from '@/config/prompts';

interface PreGeneratedTask {
  id: string;
  pattern: string;
  messages: Message[];
  modelId: string;
  priority: number;
  createdAt: number;
}

interface PredictivePattern {
  input: string;
  likelyResponses: string[];
  probability: number;
  category: string;
}

export class PreGenerationService {
  private aiService: AIService;
  private cacheService: CacheService;
  private taskQueue: PreGeneratedTask[];
  private isProcessing: boolean;
  private predictivePatterns: Map<string, PredictivePattern[]>;
  private commonQuestions: string[];
  private maxQueueSize: number;

  constructor(aiService: AIService, cacheService: CacheService) {
    this.aiService = aiService;
    this.cacheService = cacheService;
    this.taskQueue = [];
    this.isProcessing = false;
    this.predictivePatterns = new Map();
    this.commonQuestions = [];
    this.maxQueueSize = 100;

    this.initializeCommonPatterns();
    this.startPreGeneration();
  }

  private initializeCommonPatterns(): void {
    // Common conversation starters
    this.commonQuestions = [
      'hello',
      'hi there',
      'how are you',
      'what\'s your name',
      'what can you do',
      'help me',
      'thank you',
      'goodbye',
      'tell me a joke',
      'how does this work',
      'explain this',
      'can you help with',
      'what is the weather',
      'what time is it',
      'where are you from',
      'who made you',
      'are you real',
      'do you have feelings',
      'what\'s your purpose',
      'how old are you',
      'can you learn',
      'are you human',
      'what\'s your favorite',
      'do you sleep',
      'can you dream'
    ];

    // Initialize predictive patterns
    this.initializePredictivePatterns();
  }

  private initializePredictivePatterns(): void {
    // Greeting patterns
    this.addPredictivePattern('hello', [
      { input: 'hello', likelyResponses: ['Hey there!', 'Hi! How can I help?', 'Hello!'], probability: 0.9, category: 'greeting' }
    ]);

    // Question patterns
    this.addPredictivePattern('what is', [
      { input: 'what is', likelyResponses: ['That\'s basically...', 'Simply put...', 'It refers to...'], probability: 0.85, category: 'definition' }
    ]);

    // Help patterns
    this.addPredictivePattern('help', [
      { input: 'help', likelyResponses: ['Absolutely! I\'m here to help.', 'Of course! What do you need?', 'I\'d be happy to assist.'], probability: 0.88, category: 'assistance' }
    ]);

    // Thanks patterns
    this.addPredictivePattern('thank', [
      { input: 'thank', likelyResponses: ['You\'re welcome!', 'No problem!', 'Happy to help!'], probability: 0.92, category: 'gratitude' }
    ]);
  }

  private addPredictivePattern(key: string, patterns: PredictivePattern[]): void {
    this.predictivePatterns.set(key, patterns);
  }

  private startPreGeneration(): void {
    // Pre-generate responses for common patterns
    setTimeout(() => this.preGenerateCommonResponses(), 5000); // Start after 5 seconds

    // Process queue continuously
    setInterval(() => this.processQueue(), 1000); // Process every second

    // Learn from interactions
    setInterval(() => this.learnFromCache(), 60000); // Learn every minute
  }

  private async preGenerateCommonResponses(): Promise<void> {
    console.log('🎯 Starting pre-generation of common responses...');

    for (const question of this.commonQuestions) {
      const task: PreGeneratedTask = {
        id: this.generateTaskId(),
        pattern: question,
        messages: [{ role: 'user', content: question, id: '', timestamp: new Date() }],
        modelId: 'gpt-3.5-turbo',
        priority: this.getPriority(question),
        createdAt: Date.now()
      };

      this.addToQueue(task);
    }

    console.log(`✅ Added ${this.commonQuestions.length} tasks to pre-generation queue`);
  }

  private addToQueue(task: PreGeneratedTask): void {
    // Insert based on priority
    if (this.taskQueue.length >= this.maxQueueSize) {
      // Remove lowest priority task
      this.taskQueue.sort((a, b) => b.priority - a.priority);
      this.taskQueue = this.taskQueue.slice(0, this.maxQueueSize - 1);
    }

    this.taskQueue.push(task);
    this.taskQueue.sort((a, b) => b.priority - a.priority);
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.taskQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Process up to 3 tasks in parallel
      const tasksToProcess = this.taskQueue.splice(0, 3);

      const promises = tasksToProcess.map(task => this.processTask(task));
      await Promise.allSettled(promises);

    } catch (error) {
      console.error('Pre-generation queue error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processTask(task: PreGeneratedTask): Promise<void> {
    try {
      const startTime = Date.now();

      // Generate response
      const responseStream = await this.aiService.generateResponse(
        task.messages,
        task.modelId,
        { speed: 'ultra', tokensPerSecond: 20000, chunkSize: 1, enableLineByLine: true },
        SYSTEM_PROMPTS.HYPER_REALISTIC
      );

      let response = '';
      for await (const chunk of responseStream) {
        response += chunk;
      }

      const latency = Date.now() - startTime;

      // Cache the pre-generated response
      await this.cacheService.set(
        `pre:${task.pattern}`,
        {
          response,
          latency,
          timestamp: Date.now(),
          pattern: task.pattern
        },
        3600000 // 1 hour
      );

      console.log(`✅ Pre-generated: "${task.pattern}" (${latency}ms)`);

    } catch (error) {
      console.error(`❌ Failed to pre-generate "${task.pattern}":`, error);
    }
  }

  private getPriority(question: string): number {
    // Higher priority for more common questions
    const highPriority = ['hello', 'help', 'thank you', 'goodbye'];
    const mediumPriority = ['how are you', 'what is', 'how to'];

    if (highPriority.some(p => question.includes(p))) return 10;
    if (mediumPriority.some(p => question.includes(p))) return 7;
    return 5;
  }

  async getPreGenerated(pattern: string): Promise<string | null> {
    // Check cache first
    const cached = await this.cacheService.get(`pre:${pattern}`);
    if (cached) {
      return cached.response;
    }

    // Check predictive patterns
    for (const [key, patterns] of this.predictivePatterns.entries()) {
      if (pattern.includes(key)) {
        const bestPattern = patterns.sort((a, b) => b.probability - a.probability)[0];
        if (bestPattern && bestPattern.likelyResponses.length > 0) {
          const response = bestPattern.likelyResponses[
            Math.floor(Math.random() * bestPattern.likelyResponses.length)
          ];

          // Cache the prediction
          await this.cacheService.set(
            `pred:${pattern}`,
            { response, timestamp: Date.now() },
            300000 // 5 minutes
          );

          return response;
        }
      }
    }

    return null;
  }

  private async learnFromCache(): Promise<void> {
    // Analyze cache patterns to learn new predictive patterns
    const keys = await this.cacheService.batchGet(
      this.commonQuestions.map(q => `pattern:${q}`)
    );

    // Extract patterns and update predictive models
    for (const [question, cached] of keys.entries()) {
      if (cached) {
        this.updatePredictivePatterns(question, cached.response);
      }
    }
  }

  private updatePredictivePatterns(input: string, response: string): void {
    // Simple learning - in production, use ML models
    const words = input.toLowerCase().split(' ');
    const keyWord = words.find(w => this.predictivePatterns.has(w));

    if (keyWord) {
      const patterns = this.predictivePatterns.get(keyWord);
      if (patterns) {
        // Update probabilities based on usage
        patterns.forEach(p => {
          if (p.likelyResponses.includes(response)) {
            p.probability = Math.min(0.99, p.probability + 0.01);
          } else {
            p.probability = Math.max(0.1, p.probability - 0.005);
          }
        });
      }
    }
  }

  async preGenerateFromHistory(history: Message[]): Promise<void> {
    // Analyze conversation history and pre-generate likely next responses
    const recentMessages = history.slice(-10);
    const userMessages = recentMessages.filter(m => m.role === 'user');

    for (const message of userMessages) {
      const task: PreGeneratedTask = {
        id: this.generateTaskId(),
        pattern: message.content.toLowerCase(),
        messages: [message],
        modelId: 'gpt-3.5-turbo',
        priority: 6, // Medium priority
        createdAt: Date.now()
      };

      this.addToQueue(task);
    }
  }

  async predictResponse(input: string): Promise<string | null> {
    // Try to predict response without AI
    const lowerInput = input.toLowerCase();

    // Direct pattern matching
    for (const [key, patterns] of this.predictivePatterns.entries()) {
      if (lowerInput.includes(key)) {
        const bestPattern = patterns.sort((a, b) => b.probability - a.probability)[0];
        if (bestPattern && Math.random() < bestPattern.probability) {
          return bestPattern.likelyResponses[
            Math.floor(Math.random() * bestPattern.likelyResponses.length)
          ];
        }
      }
    }

    // Fuzzy matching
    const words = lowerInput.split(' ');
    for (const word of words) {
      if (this.predictivePatterns.has(word)) {
        const patterns = this.predictivePatterns.get(word)!;
        const response = patterns[0].likelyResponses[0];
        return response;
      }
    }

    return null;
  }

  private generateTaskId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  getStats(): {
    queueSize: number;
    isProcessing: boolean;
    patternCount: number;
    commonQuestions: number;
  } {
    return {
      queueSize: this.taskQueue.length,
      isProcessing: this.isProcessing,
      patternCount: this.predictivePatterns.size,
      commonQuestions: this.commonQuestions.length
    };
  }

  addCommonQuestion(question: string): void {
    if (!this.commonQuestions.includes(question.toLowerCase())) {
      this.commonQuestions.push(question.toLowerCase());

      // Add to pre-generation queue
      const task: PreGeneratedTask = {
        id: this.generateTaskId(),
        pattern: question.toLowerCase(),
        messages: [{ role: 'user', content: question, id: '', timestamp: new Date() }],
        modelId: 'gpt-3.5-turbo',
        priority: 8,
        createdAt: Date.now()
      };

      this.addToQueue(task);
    }
  }

  clearQueue(): void {
    this.taskQueue = [];
  }
}