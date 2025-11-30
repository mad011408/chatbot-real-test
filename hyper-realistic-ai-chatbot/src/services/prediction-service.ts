import { Message } from '@/types';
import { CacheService } from './cache-service';
import { createHash } from 'crypto';

interface PredictionModel {
  id: string;
  pattern: string;
  responses: ResponsePrediction[];
  accuracy: number;
  usage: number;
  lastUpdated: number;
}

interface ResponsePrediction {
  text: string;
  probability: number;
  context: string[];
  sentiment: number;
}

interface ContextPattern {
  previousMessages: string[];
  likelyNextInputs: string[];
  confidence: number;
}

export class PredictionService {
  private cacheService: CacheService;
  private models: Map<string, PredictionModel>;
  private contextPatterns: Map<string, ContextPattern>;
  private learningRate: number;
  private minAccuracy: number;

  constructor(cacheService: CacheService) {
    this.cacheService = cacheService;
    this.models = new Map();
    this.contextPatterns = new Map();
    this.learningRate = 0.1;
    this.minAccuracy = 0.7;

    this.initializeModels();
    this.loadLearnedPatterns();
  }

  private initializeModels(): void {
    // Initialize prediction models for common patterns

    // Greeting model
    this.addModel({
      id: 'greeting',
      pattern: 'greeting',
      responses: [
        { text: 'Hey there! How can I help you today?', probability: 0.4, context: [], sentiment: 0.8 },
        { text: 'Hi! What\'s on your mind?', probability: 0.3, context: [], sentiment: 0.7 },
        { text: 'Hello! Great to see you!', probability: 0.2, context: [], sentiment: 0.9 },
        { text: 'Hey! How\'s it going?', probability: 0.1, context: [], sentiment: 0.6 }
      ],
      accuracy: 0.85,
      usage: 0,
      lastUpdated: Date.now()
    });

    // Question model
    this.addModel({
      id: 'question',
      pattern: 'question',
      responses: [
        { text: 'Let me help you with that.', probability: 0.35, context: [], sentiment: 0.5 },
        { text: 'Here\'s what you need to know...', probability: 0.25, context: [], sentiment: 0.3 },
        { text: 'I can definitely assist with this.', probability: 0.2, context: [], sentiment: 0.7 },
        { text: 'Based on what I understand...', probability: 0.2, context: [], sentiment: 0.4 }
      ],
      accuracy: 0.8,
      usage: 0,
      lastUpdated: Date.now()
    });

    // Help model
    this.addModel({
      id: 'help',
      pattern: 'help',
      responses: [
        { text: 'Absolutely! I\'m here to help.', probability: 0.45, context: [], sentiment: 0.8 },
        { text: 'Of course! What do you need?', probability: 0.3, context: [], sentiment: 0.7 },
        { text: 'I\'d be happy to assist.', probability: 0.25, context: [], sentiment: 0.6 }
      ],
      accuracy: 0.9,
      usage: 0,
      lastUpdated: Date.now()
    });

    // Casual model
    this.addModel({
      id: 'casual',
      pattern: 'casual',
      responses: [
        { text: 'Totally get what you mean.', probability: 0.3, context: [], sentiment: 0.5 },
        { text: 'For sure, that makes sense.', probability: 0.25, context: [], sentiment: 0.4 },
        { text: 'I feel you on that one.', probability: 0.25, context: [], sentiment: 0.3 },
        { text: 'No doubt about it.', probability: 0.2, context: [], sentiment: 0.6 }
      ],
      accuracy: 0.75,
      usage: 0,
      lastUpdated: Date.now()
    });
  }

  private addModel(model: PredictionModel): void {
    this.models.set(model.id, model);
  }

  async predictResponse(
    input: string,
    context?: Message[],
    conversationHistory?: Message[]
  ): Promise<{
    text: string;
    confidence: number;
    source: 'prediction' | 'cache' | 'context';
  } | null> {
    // 1. Check cache first
    const cacheKey = `pred:${this.hashInput(input)}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return {
        text: cached.response,
        confidence: cached.confidence,
        source: 'cache'
      };
    }

    // 2. Try pattern matching
    const patternMatch = this.matchPattern(input);
    if (patternMatch) {
      return {
        text: patternMatch.text,
        confidence: patternMatch.probability,
        source: 'prediction'
      };
    }

    // 3. Try context prediction
    if (conversationHistory && conversationHistory.length > 0) {
      const contextPrediction = this.predictFromContext(input, conversationHistory);
      if (contextPrediction) {
        return {
          text: contextPrediction.text,
          confidence: contextPrediction.confidence,
          source: 'context'
        };
      }
    }

    return null;
  }

  private matchPattern(input: string): ResponsePrediction | null {
    const lowerInput = input.toLowerCase().trim();

    // Check for keywords in each model
    for (const model of this.models.values()) {
      if (this.matchesPattern(lowerInput, model.pattern)) {
        // Select response based on probability
        const random = Math.random();
        let cumulative = 0;

        for (const response of model.responses) {
          cumulative += response.probability;
          if (random <= cumulative) {
            // Update usage
            model.usage++;
            return response;
          }
        }
      }
    }

    return null;
  }

  private matchesPattern(input: string, pattern: string): boolean {
    const keywords: Record<string, string[]> = {
      greeting: ['hello', 'hi', 'hey', 'yo', 'what\'s up', 'good morning', 'good evening'],
      question: ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'could', 'would', 'should'],
      help: ['help', 'assist', 'support', 'can you', 'need', 'stuck'],
      casual: ['cool', 'awesome', 'great', 'nice', 'wow', 'amazing', 'totally', 'for sure']
    };

    const patternKeywords = keywords[pattern];
    if (!patternKeywords) return false;

    return patternKeywords.some(keyword => input.includes(keyword));
  }

  private predictFromContext(input: string, history: Message[]): ResponsePrediction | null {
    // Analyze conversation context
    const recentMessages = history.slice(-5);
    const contextKey = this.generateContextKey(recentMessages);

    // Check if we have seen this context
    const pattern = this.contextPatterns.get(contextKey);
    if (pattern && pattern.confidence > 0.7) {
      // Find best matching likely input
      const match = pattern.likelyNextInputs.find(next =>
        next.toLowerCase().includes(input.toLowerCase()) ||
        input.toLowerCase().includes(next.toLowerCase())
      );

      if (match) {
        // Generate response based on context
        return this.generateContextualResponse(input, recentMessages);
      }
    }

    return null;
  }

  private generateContextKey(messages: Message[]): string {
    // Generate a simplified context key
    const simplified = messages
      .slice(-3) // Last 3 messages
      .map(m => `${m.role}:${m.content.split(' ').slice(0, 3).join(' ')}`) // Role + first 3 words
      .join('|');

    return createHash('md5').update(simplified).digest('hex');
  }

  private generateContextualResponse(input: string, context: Message[]): ResponsePrediction {
    // Generate response based on conversation flow
    const lastMessage = context[context.length - 1];

    if (lastMessage.role === 'user') {
      // If user is asking something, provide helpful response
      if (input.includes('?') || input.includes('how') || input.includes('what')) {
        return {
          text: 'Based on our conversation, I think...',
          probability: 0.7,
          context: context.map(m => m.content),
          sentiment: 0.5
        };
      }
    }

    // Default contextual response
    return {
      text: 'Continuing from where we left off...',
      probability: 0.6,
      context: context.map(m => m.content),
      sentiment: 0.4
    };
  }

  async learnFromInteraction(
    input: string,
    actualResponse: string,
    predictedResponse?: string
  ): Promise<void> {
    // Update models based on actual usage

    if (predictedResponse) {
      // Compare prediction with actual
      const similarity = this.calculateSimilarity(predictedResponse, actualResponse);

      // Update model accuracy
      for (const model of this.models.values()) {
        if (this.matchesPattern(input.toLowerCase(), model.pattern)) {
          const accuracyDiff = (similarity - model.accuracy) * this.learningRate;
          model.accuracy = Math.max(0, Math.min(1, model.accuracy + accuracyDiff));
          model.lastUpdated = Date.now();

          // Update response probabilities
          this.updateResponseProbabilities(model, predictedResponse, actualResponse, similarity);
          break;
        }
      }
    }

    // Learn context patterns
    await this.learnContextPattern(input, actualResponse);

    // Cache the learning
    const learningKey = `learn:${this.hashInput(input)}`;
    await this.cacheService.set(learningKey, {
      input,
      response: actualResponse,
      timestamp: Date.now()
    }, 86400000); // 24 hours
  }

  private updateResponseProbabilities(
    model: PredictionModel,
    predicted: string,
    actual: string,
    similarity: number
  ): void {
    // Find the predicted response
    const predictedIndex = model.responses.findIndex(r => r.text === predicted);
    if (predictedIndex !== -1) {
      const response = model.responses[predictedIndex];

      // Adjust probability based on accuracy
      if (similarity > 0.8) {
        // Good prediction - increase probability slightly
        response.probability = Math.min(0.5, response.probability + 0.01);
      } else {
        // Poor prediction - decrease probability
        response.probability = Math.max(0.05, response.probability - 0.02);
      }
    }

    // Normalize probabilities
    const total = model.responses.reduce((sum, r) => sum + r.probability, 0);
    model.responses.forEach(r => {
      r.probability = r.probability / total;
    });
  }

  private async learnContextPattern(input: string, response: string): Promise<void> {
    // This would analyze conversation patterns
    // For now, just store the pattern
    const patternKey = `ctx:${this.hashInput(input)}`;
    await this.cacheService.set(patternKey, {
      input,
      response,
      timestamp: Date.now()
    }, 3600000); // 1 hour
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // Simple similarity calculation
    const words1 = new Set(text1.toLowerCase().split(' '));
    const words2 = new Set(text2.toLowerCase().split(' '));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size; // Jaccard similarity
  }

  private hashInput(input: string): string {
    return createHash('md5').update(input.toLowerCase().trim()).digest('hex');
  }

  private async loadLearnedPatterns(): Promise<void> {
    // Load learned patterns from cache
    try {
      const learned = await this.cacheService.get('learned_patterns');
      if (learned) {
        // Apply learned patterns to models
        console.log('Loaded learned patterns from cache');
      }
    } catch (error) {
      console.error('Failed to load learned patterns:', error);
    }
  }

  async saveLearnedPatterns(): Promise<void> {
    // Save current models and patterns
    const data = {
      models: Object.fromEntries(this.models),
      contextPatterns: Object.fromEntries(this.contextPatterns),
      timestamp: Date.now()
    };

    await this.cacheService.set('learned_patterns', data, 86400000); // 24 hours
  }

  getPredictionStats(): {
    totalModels: number;
    averageAccuracy: number;
    totalUsage: number;
    contextPatterns: number;
  } {
    const models = Array.from(this.models.values());
    const totalAccuracy = models.reduce((sum, m) => sum + m.accuracy, 0);
    const totalUsage = models.reduce((sum, m) => sum + m.usage, 0);

    return {
      totalModels: models.length,
      averageAccuracy: models.length > 0 ? totalAccuracy / models.length : 0,
      totalUsage,
      contextPatterns: this.contextPatterns.size
    };
  }

  resetLearning(): void {
    // Reset all models to initial state
    for (const model of this.models.values()) {
      model.accuracy = 0.5;
      model.usage = 0;
      model.lastUpdated = Date.now();
    }

    this.contextPatterns.clear();
  }
}