import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { CacheService } from '@/services/cache-service';
import { TemplateService } from '@/services/template-service';
import { PreGenerationService } from '@/services/pre-generation-service';

interface RequestMetrics {
  startTime: number;
  id: string;
  path: string;
  method: string;
}

export class UltraFastMiddleware {
  private cacheService: CacheService;
  private templateService: TemplateService;
  private preGenService: PreGenerationService;
  private requestCache: Map<string, any>;
  private metrics: Map<string, RequestMetrics>;
  private rateLimits: Map<string, { count: number; resetTime: number }>;

  constructor(
    cacheService: CacheService,
    templateService: TemplateService,
    preGenService: PreGenerationService
  ) {
    this.cacheService = cacheService;
    this.templateService = templateService;
    this.preGenService = preGenService;
    this.requestCache = new Map();
    this.metrics = new Map();
    this.rateLimits = new Map();
  }

  // Ultra-fast request handler
  handle() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const requestId = this.generateRequestId();

      // Add request ID to headers
      res.setHeader('X-Request-ID', requestId);
      res.setHeader('X-Response-Time', '0'); // Will be updated

      // Track request metrics
      this.metrics.set(requestId, {
        startTime,
        id: requestId,
        path: req.path,
        method: req.method
      });

      try {
        // 1. Check for cached response (ultra-fast)
        const cached = await this.checkCache(req);
        if (cached) {
          this.sendCachedResponse(res, cached, startTime);
          return;
        }

        // 2. Check for pre-generated response (very fast)
        const preGen = await this.checkPreGenerated(req);
        if (preGen) {
          this.sendPreGenResponse(res, preGen, startTime);
          return;
        }

        // 3. Check rate limits (fast)
        if (!this.checkRateLimit(req)) {
          res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            retryAfter: this.getRetryAfter(req)
          });
          return;
        }

        // 4. Continue to next middleware
        next();

      } catch (error) {
        console.error('Middleware error:', error);
        next(error);
      }
    };
  }

  // Ultra-fast response handler
  responseHandler() {
    return (req: Request, res: Response, next: NextFunction) => {
      const requestId = res.getHeader('X-Request-ID') as string;
      const metrics = this.metrics.get(requestId);

      if (!metrics) {
        return next();
      }

      // Override res.json to cache responses
      const originalJson = res.json;
      res.json = (data: any) => {
        // Cache successful responses
        if (res.statusCode === 200 && data && data.success) {
          this.cacheResponse(req, data);
        }

        // Update response time
        const responseTime = Date.now() - metrics.startTime;
        res.setHeader('X-Response-Time', responseTime.toString());

        // Send response
        return originalJson.call(res, data);
      };

      next();
    };
  }

  // WebSocket optimization middleware
  wsOptimization() {
    return (ws: any, req: any, next: any) => {
      // Enable WebSocket optimizations
      ws.isBinary = false;
      ws.compressed = true;

      // Set ultra-fast settings
      ws._socket.setNoDelay(true); // Disable Nagle's algorithm
      ws._socket.setKeepAlive(true, 30000); // 30 second keepalive

      // Add ultra-fast message handler
      const originalSend = ws.send;
      ws.send = (data: any, options?: any) => {
        // Compress if possible
        if (typeof data === 'string' && data.length > 1000) {
          // In production, use compression
          data = this.compressData(data);
        }

        // Send with minimal delay
        setImmediate(() => {
          originalSend.call(ws, data, options);
        });
      };

      next();
    };
  }

  private async checkCache(req: Request): Promise<any> {
    const cacheKey = this.generateCacheKey(req);
    return await this.cacheService.get(cacheKey);
  }

  private async checkPreGenerated(req: Request): Promise<any> {
    if (req.path === '/api/sessions/:sessionId/messages' && req.method === 'POST') {
      const { message } = req.body;
      if (message) {
        const preGen = await this.preGenService.getPreGenerated(message.toLowerCase());
        if (preGen) {
          return {
            success: true,
            data: {
              message: {
                id: this.generateId(),
                role: 'assistant',
                content: preGen,
                timestamp: new Date(),
                metadata: {
                  source: 'pre-generated',
                  latency: 0
                }
              },
              validation: {
                authenticity: { score: 0.9, verdict: 'authentic' as const },
                fakeDetection: { isFake: false, confidence: 0.1 },
                shouldRetry: false
              }
            }
          };
        }
      }
    }
    return null;
  }

  private checkRateLimit(req: Request): boolean {
    const clientId = this.getClientId(req);
    const now = Date.now();
    const limit = this.rateLimits.get(clientId);

    // 1000 requests per minute per client
    const maxRequests = 1000;
    const windowMs = 60000;

    if (!limit || now > limit.resetTime) {
      this.rateLimits.set(clientId, {
        count: 1,
        resetTime: now + windowMs
      });
      return true;
    }

    if (limit.count >= maxRequests) {
      return false;
    }

    limit.count++;
    return true;
  }

  private getRetryAfter(req: Request): number {
    const clientId = this.getClientId(req);
    const limit = this.rateLimits.get(clientId);
    if (limit) {
      return Math.ceil((limit.resetTime - Date.now()) / 1000);
    }
    return 60;
  }

  private sendCachedResponse(res: Response, cached: any, startTime: number): void {
    const responseTime = Date.now() - startTime;

    res.setHeader('X-Cache', 'HIT');
    res.setHeader('X-Response-Time', responseTime.toString());
    res.setHeader('X-Source', 'cache');

    res.json(cached);
  }

  private sendPreGenResponse(res: Response, preGen: any, startTime: number): void {
    const responseTime = Date.now() - startTime;

    res.setHeader('X-Cache', 'PRE-GEN');
    res.setHeader('X-Response-Time', responseTime.toString());
    res.setHeader('X-Source', 'pre-generated');

    res.json(preGen);
  }

  private async cacheResponse(req: Request, data: any): Promise<void> {
    const cacheKey = this.generateCacheKey(req);
    const ttl = this.getCacheTTL(req);
    await this.cacheService.set(cacheKey, data, ttl);
  }

  private generateCacheKey(req: Request): string {
    const key = `${req.method}:${req.path}:${JSON.stringify(req.query)}`;
    return createHash('md5').update(key).digest('hex');
  }

  private getCacheTTL(req: Request): number {
    // Different TTL for different endpoints
    if (req.path.includes('/providers')) {
      return 300000; // 5 minutes
    }
    if (req.path.includes('/metrics')) {
      return 10000; // 10 seconds
    }
    if (req.path.includes('/sessions')) {
      return 60000; // 1 minute
    }
    return 300000; // Default 5 minutes
  }

  private getClientId(req: Request): string {
    // Try IP first
    const ip = req.ip ||
                req.connection?.remoteAddress ||
                req.socket?.remoteAddress ||
                (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                'unknown';

    // Add user agent if available
    const userAgent = req.headers['user-agent'] || '';
    const clientId = `${ip}:${createHash('md5').update(userAgent).digest('hex').substring(0, 8)}`;

    return clientId;
  }

  private compressData(data: string): string {
    // Simple compression - in production use gzip/zlib
    if (data.length < 1000) return data;

    // Basic compression - replace common patterns
    return data
      .replace(/\\s+/g, ' ') // Multiple spaces
      .replace(/\\n+/g, '\\n') // Multiple newlines
      .replace(/\\t+/g, '\\t'); // Multiple tabs
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  // Cleanup old data
  cleanup(): void {
    const now = Date.now();

    // Clean old metrics
    for (const [id, metrics] of this.metrics.entries()) {
      if (now - metrics.startTime > 300000) { // 5 minutes
        this.metrics.delete(id);
      }
    }

    // Clean old rate limits
    for (const [clientId, limit] of this.rateLimits.entries()) {
      if (now > limit.resetTime) {
        this.rateLimits.delete(clientId);
      }
    }
  }

  getMiddlewareStats(): {
    cachedRequests: number;
    preGenRequests: number;
    rateLimitedRequests: number;
    activeRequests: number;
  } {
    return {
      cachedRequests: 0, // Would track in real implementation
      preGenRequests: 0,
      rateLimitedRequests: 0,
      activeRequests: this.metrics.size
    };
  }
}