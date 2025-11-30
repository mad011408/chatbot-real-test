import { MonitoringMetrics, ProviderMetrics, ChatSession, Message } from '@/types';
import { MONITORING_CONFIG } from '@/config/validation.config';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

export class MonitoringService {
  private redis: Redis;
  private metrics: MonitoringMetrics;
  private sessionMetrics: Map<string, any>;
  private alertThresholds: any;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });

    this.metrics = {
      requestCount: 0,
      averageLatency: 0,
      errorRate: 0,
      authenticityDistribution: {
        authentic: 0,
        suspicious: 0,
        fake: 0
      },
      providerPerformance: {}
    };

    this.sessionMetrics = new Map();
    this.alertThresholds = MONITORING_CONFIG.alerts;
  }

  async initializeMetrics(): Promise<void> {
    try {
      // Load existing metrics from Redis
      const savedMetrics = await this.redis.get('monitoring:metrics');
      if (savedMetrics) {
        this.metrics = JSON.parse(savedMetrics);
      }

      // Set up periodic saving
      setInterval(() => this.saveMetrics(), 60000); // Save every minute

      // Set up alert checking
      setInterval(() => this.checkAlerts(), 30000); // Check every 30 seconds

      console.log('Monitoring service initialized');
    } catch (error) {
      console.error('Failed to initialize monitoring:', error);
    }
  }

  async trackRequest(
    sessionId: string,
    provider: string,
    model: string,
    latency: number,
    tokens: number,
    authenticityScore: number,
    fakeScore: number,
    isError: boolean = false
  ): Promise<void> {
    // Update global metrics
    this.metrics.requestCount++;

    // Update average latency
    const totalLatency = this.metrics.averageLatency * (this.metrics.requestCount - 1) + latency;
    this.metrics.averageLatency = totalLatency / this.metrics.requestCount;

    // Update error rate
    if (isError) {
      const errorCount = this.metrics.errorRate * (this.metrics.requestCount - 1) + 1;
      this.metrics.errorRate = errorCount / this.metrics.requestCount;
    } else {
      const errorCount = this.metrics.errorRate * (this.metrics.requestCount - 1);
      this.metrics.errorRate = errorCount / this.metrics.requestCount;
    }

    // Update authenticity distribution
    if (authenticityScore >= 0.8) {
      this.metrics.authenticityDistribution.authentic++;
    } else if (authenticityScore >= 0.5) {
      this.metrics.authenticityDistribution.suspicious++;
    } else {
      this.metrics.authenticityDistribution.fake++;
    }

    // Update provider performance
    const providerKey = `${provider}:${model}`;
    if (!this.metrics.providerPerformance[providerKey]) {
      this.metrics.providerPerformance[providerKey] = {
        latency: 0,
        successRate: 0,
        averageTokensPerSecond: 0,
        authenticityScore: 0,
        costPerRequest: 0,
        requestCount: 0
      };
    }

    const providerMetrics = this.metrics.providerPerformance[providerKey];
    providerMetrics.requestCount++;

    // Update provider latency
    const totalProviderLatency = providerMetrics.latency * (providerMetrics.requestCount - 1) + latency;
    providerMetrics.latency = totalProviderLatency / providerMetrics.requestCount;

    // Update success rate
    const successCount = providerMetrics.successRate * (providerMetrics.requestCount - 1) + (isError ? 0 : 1);
    providerMetrics.successRate = successCount / providerMetrics.requestCount;

    // Update tokens per second
    const tokensPerSecond = tokens / (latency / 1000);
    const totalTokensPerSecond = providerMetrics.averageTokensPerSecond * (providerMetrics.requestCount - 1) + tokensPerSecond;
    providerMetrics.averageTokensPerSecond = totalTokensPerSecond / providerMetrics.requestCount;

    // Update authenticity score
    const totalAuthenticity = providerMetrics.authenticityScore * (providerMetrics.requestCount - 1) + authenticityScore;
    providerMetrics.authenticityScore = totalAuthenticity / providerMetrics.requestCount;

    // Track session metrics
    await this.trackSessionMetrics(sessionId, latency, tokens, authenticityScore, fakeScore);

    // Log to Redis for analytics
    await this.logRequest({
      timestamp: new Date(),
      sessionId,
      provider,
      model,
      latency,
      tokens,
      authenticityScore,
      fakeScore,
      isError
    });
  }

  private async trackSessionMetrics(
    sessionId: string,
    latency: number,
    tokens: number,
    authenticityScore: number,
    fakeScore: number
  ): Promise<void> {
    if (!this.sessionMetrics.has(sessionId)) {
      this.sessionMetrics.set(sessionId, {
        startTime: Date.now(),
        totalLatency: 0,
        totalTokens: 0,
        averageAuthenticity: 0,
        averageFakeScore: 0,
        messageCount: 0,
        providerLatencies: {}
      });
    }

    const sessionData = this.sessionMetrics.get(sessionId);
    sessionData.messageCount++;
    sessionData.totalLatency += latency;
    sessionData.totalTokens += tokens;
    sessionData.averageAuthenticity =
      (sessionData.averageAuthenticity * (sessionData.messageCount - 1) + authenticityScore) / sessionData.messageCount;
    sessionData.averageFakeScore =
      (sessionData.averageFakeScore * (sessionData.messageCount - 1) + fakeScore) / sessionData.messageCount;
  }

  private async logRequest(requestData: any): Promise<void> {
    try {
      const key = `requests:${new Date().toISOString().split('T')[0]}`;
      await this.redis.lpush(key, JSON.stringify(requestData));
      await this.redis.expire(key, MONITORING_CONFIG.retention.metricsDays * 24 * 60 * 60);
    } catch (error) {
      console.error('Failed to log request:', error);
    }
  }

  async getMetrics(timeRange?: 'hour' | 'day' | 'week' | 'month'): Promise<MonitoringMetrics> {
    if (!timeRange) {
      return this.metrics;
    }

    // Calculate time-filtered metrics from Redis
    const now = new Date();
    let startTime: Date;

    switch (timeRange) {
      case 'hour':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    return await this.calculateTimeRangeMetrics(startTime, now);
  }

  private async calculateTimeRangeMetrics(startTime: Date, endTime: Date): Promise<MonitoringMetrics> {
    const keys = [];
    const current = new Date(startTime);

    while (current <= endTime) {
      keys.push(`requests:${current.toISOString().split('T')[0]}`);
      current.setDate(current.getDate() + 1);
    }

    const requests: any[] = [];
    for (const key of keys) {
      const dayRequests = await this.redis.lrange(key, 0, -1);
      requests.push(...dayRequests.map(r => JSON.parse(r)));
    }

    // Calculate metrics from requests
    const filteredRequests = requests.filter(r => {
      const requestTime = new Date(r.timestamp);
      return requestTime >= startTime && requestTime <= endTime;
    });

    if (filteredRequests.length === 0) {
      return {
        requestCount: 0,
        averageLatency: 0,
        errorRate: 0,
        authenticityDistribution: { authentic: 0, suspicious: 0, fake: 0 },
        providerPerformance: {}
      };
    }

    const metrics: MonitoringMetrics = {
      requestCount: filteredRequests.length,
      averageLatency: filteredRequests.reduce((sum, r) => sum + r.latency, 0) / filteredRequests.length,
      errorRate: filteredRequests.filter(r => r.isError).length / filteredRequests.length,
      authenticityDistribution: { authentic: 0, suspicious: 0, fake: 0 },
      providerPerformance: {}
    };

    // Calculate authenticity distribution
    filteredRequests.forEach(r => {
      if (r.authenticityScore >= 0.8) {
        metrics.authenticityDistribution.authentic++;
      } else if (r.authenticityScore >= 0.5) {
        metrics.authenticityDistribution.suspicious++;
      } else {
        metrics.authenticityDistribution.fake++;
      }
    });

    // Calculate provider performance
    const providerGroups: Record<string, any[]> = {};
    filteredRequests.forEach(r => {
      const key = `${r.provider}:${r.model}`;
      if (!providerGroups[key]) providerGroups[key] = [];
      providerGroups[key].push(r);
    });

    Object.entries(providerGroups).forEach(([key, requests]) => {
      const [provider, model] = key.split(':');
      metrics.providerPerformance[key] = {
        latency: requests.reduce((sum, r) => sum + r.latency, 0) / requests.length,
        successRate: requests.filter(r => !r.isError).length / requests.length,
        averageTokensPerSecond: requests.reduce((sum, r) => sum + (r.tokens / (r.latency / 1000)), 0) / requests.length,
        authenticityScore: requests.reduce((sum, r) => sum + r.authenticityScore, 0) / requests.length,
        costPerRequest: 0, // Would need to calculate based on actual pricing
        requestCount: requests.length
      };
    });

    return metrics;
  }

  async getSessionMetrics(sessionId: string): Promise<any> {
    return this.sessionMetrics.get(sessionId) || null;
  }

  async getTopProviders(limit: number = 10): Promise<Array<{ provider: string; score: number }>> {
    const providers = Object.entries(this.metrics.providerPerformance).map(([key, metrics]) => ({
      provider: key,
      score: this.calculateProviderScore(metrics)
    }));

    return providers
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private calculateProviderScore(metrics: ProviderMetrics): number {
    // Weighted score for provider ranking
    const weights = {
      latency: 0.3,
      successRate: 0.3,
      speed: 0.2,
      authenticity: 0.2
    };

    const latencyScore = Math.max(0, 1 - (metrics.latency / 1000)); // Normalize to 0-1
    const speedScore = Math.min(1, metrics.averageTokensPerSecond / 1000); // Normalize to 0-1
    const authenticityScore = metrics.authenticityScore;

    return (
      latencyScore * weights.latency +
      metrics.successRate * weights.successRate +
      speedScore * weights.speed +
      authenticityScore * weights.authenticity
    );
  }

  private async saveMetrics(): Promise<void> {
    try {
      await this.redis.setex(
        'monitoring:metrics',
        MONITORING_CONFIG.retention.metricsDays * 24 * 60 * 60,
        JSON.stringify(this.metrics)
      );
    } catch (error) {
      console.error('Failed to save metrics:', error);
    }
  }

  private async checkAlerts(): Promise<void> {
    const alerts: string[] = [];

    // Check latency alert
    if (this.metrics.averageLatency > this.alertThresholds.highLatency) {
      alerts.push(`High average latency: ${this.metrics.averageLatency}ms`);
    }

    // Check authenticity alert
    const authenticRate = this.metrics.authenticityDistribution.authentic / this.metrics.requestCount;
    if (authenticRate < this.alertThresholds.lowAuthenticity) {
      alerts.push(`Low authenticity rate: ${(authenticRate * 100).toFixed(1)}%`);
    }

    // Check error rate alert
    if (this.metrics.errorRate > this.alertThresholds.errorRate) {
      alerts.push(`High error rate: ${(this.metrics.errorRate * 100).toFixed(1)}%`);
    }

    // Send alerts if any
    if (alerts.length > 0) {
      await this.sendAlerts(alerts);
    }
  }

  private async sendAlerts(alerts: string[]): Promise<void> {
    console.warn('MONITORING ALERTS:', alerts);

    // Here you could integrate with alerting systems like:
    // - Email notifications
    // - Slack webhooks
    // - PagerDuty
    // - Discord webhooks
    // etc.

    // Store alerts in Redis
    await this.redis.lpush(
      'monitoring:alerts',
      JSON.stringify({
        timestamp: new Date(),
        alerts
      })
    );
  }

  async generateReport(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<{
    summary: any;
    insights: string[];
    recommendations: string[];
  }> {
    const metrics = await this.getMetrics(timeRange);
    const topProviders = await this.getTopProviders(5);

    // Generate insights
    const insights = this.generateInsights(metrics, topProviders);

    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics, insights);

    return {
      summary: {
        totalRequests: metrics.requestCount,
        averageLatency: metrics.averageLatency,
        errorRate: metrics.errorRate,
        authenticityRate: (metrics.authenticityDistribution.authentic / metrics.requestCount) * 100,
        topProviders
      },
      insights,
      recommendations
    };
  }

  private generateInsights(metrics: MonitoringMetrics, topProviders: any[]): string[] {
    const insights: string[] = [];

    // Latency insights
    if (metrics.averageLatency < 100) {
      insights.push('Excellent response times - system is performing well');
    } else if (metrics.averageLatency > 500) {
      insights.push('Response times are slow - consider optimization');
    }

    // Authenticity insights
    const authenticRate = metrics.authenticityDistribution.authentic / metrics.requestCount;
    if (authenticRate > 0.8) {
      insights.push('High authenticity scores - responses are very human-like');
    } else if (authenticRate < 0.5) {
      insights.push('Low authenticity scores - review system prompts and configuration');
    }

    // Provider insights
    if (topProviders.length > 0) {
      const bestProvider = topProviders[0];
      insights.push(`${bestProvider.provider} is performing best with score ${bestProvider.score.toFixed(2)}`);
    }

    return insights;
  }

  private generateRecommendations(metrics: MonitoringMetrics, insights: string[]): string[] {
    const recommendations: string[] = [];

    // Latency recommendations
    if (metrics.averageLatency > 300) {
      recommendations.push('Consider switching to faster providers or models');
      recommendations.push('Optimize API calls and reduce unnecessary processing');
    }

    // Error rate recommendations
    if (metrics.errorRate > 0.02) {
      recommendations.push('Investigate and fix common error patterns');
      recommendations.push('Implement better error handling and retry logic');
    }

    // Authenticity recommendations
    const authenticRate = metrics.authenticityDistribution.authentic / metrics.requestCount;
    if (authenticRate < 0.7) {
      recommendations.push('Update system prompts to be more human-like');
      recommendations.push('Adjust authenticity thresholds and validation rules');
    }

    return recommendations;
  }

  async cleanup(): Promise<void> {
    // Clean up old data based on retention settings
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - MONITORING_CONFIG.retention.metricsDays);

    const keys = await this.redis.keys('requests:*');
    for (const key of keys) {
      const dateStr = key.split(':')[1];
      const date = new Date(dateStr);
      if (date < cutoffDate) {
        await this.redis.del(key);
      }
    }
  }
}