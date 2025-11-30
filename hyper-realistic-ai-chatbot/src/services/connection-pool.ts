import WebSocket from 'ws';
import { EventEmitter } from 'events';

interface PooledConnection {
  id: string;
  connection: any;
  provider: string;
  model: string;
  inUse: boolean;
  lastUsed: number;
  created: number;
  requestCount: number;
  maxRequests: number;
}

interface ConnectionConfig {
  provider: string;
  model: string;
  maxConnections: number;
  maxRequestsPerConnection: number;
  timeout: number;
  keepAlive: boolean;
}

export class ConnectionPool extends EventEmitter {
  private pools: Map<string, PooledConnection[]>;
  private configs: Map<string, ConnectionConfig>;
  private cleanupInterval: any;
  private metrics: Map<string, { created: number; reused: number; errors: number }>;

  constructor() {
    super();
    this.pools = new Map();
    this.configs = new Map();
    this.metrics = new Map();

    this.initializeConfigs();
    this.startCleanup();
  }

  private initializeConfigs(): void {
    // OpenAI configuration
    this.configs.set('openai:gpt-3.5-turbo', {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      maxConnections: 10,
      maxRequestsPerConnection: 100,
      timeout: 30000,
      keepAlive: true
    });

    this.configs.set('openai:gpt-4-turbo', {
      provider: 'openai',
      model: 'gpt-4-turbo',
      maxConnections: 5,
      maxRequestsPerConnection: 50,
      timeout: 30000,
      keepAlive: true
    });

    // Anthropic configuration
    this.configs.set('anthropic:claude-3-sonnet', {
      provider: 'anthropic',
      model: 'claude-3-sonnet',
      maxConnections: 8,
      maxRequestsPerConnection: 75,
      timeout: 30000,
      keepAlive: true
    });

    this.configs.set('anthropic:claude-3-opus', {
      provider: 'anthropic',
      model: 'claude-3-opus',
      maxConnections: 3,
      maxRequestsPerConnection: 25,
      timeout: 30000,
      keepAlive: true
    });

    // Google configuration
    this.configs.set('google:gemini-pro', {
      provider: 'google',
      model: 'gemini-pro',
      maxConnections: 12,
      maxRequestsPerConnection: 150,
      timeout: 30000,
      keepAlive: true
    });
  }

  async getConnection(provider: string, model: string): Promise<PooledConnection> {
    const key = `${provider}:${model}`;
    const config = this.configs.get(key);

    if (!config) {
      throw new Error(`No configuration found for ${key}`);
    }

    // Get or create pool
    if (!this.pools.has(key)) {
      this.pools.set(key, []);
      this.metrics.set(key, { created: 0, reused: 0, errors: 0 });
    }

    const pool = this.pools.get(key)!;
    const metrics = this.metrics.get(key)!;

    // Try to reuse existing connection
    for (const conn of pool) {
      if (!conn.inUse && conn.requestCount < conn.maxRequests) {
        conn.inUse = true;
        conn.lastUsed = Date.now();
        metrics.reused++;
        this.emit('connection_reused', conn);
        return conn;
      }
    }

    // Create new connection if under limit
    if (pool.length < config.maxConnections) {
      const newConn = await this.createConnection(config);
      pool.push(newConn);
      metrics.created++;
      this.emit('connection_created', newConn);
      return newConn;
    }

    // Wait for available connection
    return this.waitForAvailableConnection(key);
  }

  private async createConnection(config: ConnectionConfig): Promise<PooledConnection> {
    const connection: PooledConnection = {
      id: this.generateConnectionId(),
      connection: null, // Will be set based on provider
      provider: config.provider,
      model: config.model,
      inUse: true,
      lastUsed: Date.now(),
      created: Date.now(),
      requestCount: 0,
      maxRequests: config.maxRequestsPerConnection
    };

    // Create actual connection based on provider
    switch (config.provider) {
      case 'openai':
        connection.connection = await this.createOpenAIConnection(config);
        break;
      case 'anthropic':
        connection.connection = await this.createAnthropicConnection(config);
        break;
      case 'google':
        connection.connection = await this.createGoogleConnection(config);
        break;
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }

    return connection;
  }

  private async createOpenAIConnection(config: ConnectionConfig): Promise<any> {
    // For OpenAI, we'd use their SDK or HTTP client
    // This is a placeholder for the actual connection
    return {
      type: 'openai',
      model: config.model,
      timeout: config.timeout,
      keepAlive: config.keepAlive
    };
  }

  private async createAnthropicConnection(config: ConnectionConfig): Promise<any> {
    // For Anthropic, we'd use their SDK or HTTP client
    return {
      type: 'anthropic',
      model: config.model,
      timeout: config.timeout,
      keepAlive: config.keepAlive
    };
  }

  private async createGoogleConnection(config: ConnectionConfig): Promise<any> {
    // For Google, we'd use their SDK or HTTP client
    return {
      type: 'google',
      model: config.model,
      timeout: config.timeout,
      keepAlive: config.keepAlive
    };
  }

  private async waitForAvailableConnection(key: string): Promise<PooledConnection> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);

      const checkInterval = setInterval(() => {
        const pool = this.pools.get(key);
        if (pool) {
          const available = pool.find(conn => !conn.inUse);
          if (available) {
            clearTimeout(timeout);
            clearInterval(checkInterval);
            available.inUse = true;
            available.lastUsed = Date.now();
            resolve(available);
          }
        }
      }, 10);
    });
  }

  releaseConnection(connection: PooledConnection): void {
    connection.inUse = false;
    connection.lastUsed = Date.now();
    this.emit('connection_released', connection);
  }

  async executeRequest<T>(
    provider: string,
    model: string,
    request: () => Promise<T>
  ): Promise<T> {
    const connection = await this.getConnection(provider, model);
    const key = `${provider}:${model}`;
    const metrics = this.metrics.get(key)!;

    try {
      connection.requestCount++;
      const startTime = Date.now();

      const result = await request();

      const duration = Date.now() - startTime;
      this.emit('request_completed', { connection, duration });

      return result;

    } catch (error) {
      metrics.errors++;
      this.emit('request_error', { connection, error });

      // Mark connection for removal if too many errors
      if (connection.requestCount > 10 && metrics.errors > connection.requestCount * 0.3) {
        this.removeConnection(connection);
      }

      throw error;

    } finally {
      this.releaseConnection(connection);
    }
  }

  private removeConnection(connection: PooledConnection): void {
    const key = `${connection.provider}:${connection.model}`;
    const pool = this.pools.get(key);

    if (pool) {
      const index = pool.findIndex(c => c.id === connection.id);
      if (index !== -1) {
        pool.splice(index, 1);
        this.emit('connection_removed', connection);
      }
    }
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  private cleanup(): void {
    const now = Date.now();

    for (const [key, pool] of this.pools.entries()) {
      const config = this.configs.get(key);
      if (!config) continue;

      // Remove old connections
      const toRemove: PooledConnection[] = [];

      for (const conn of pool) {
        // Remove if:
        // 1. Too old and not in use
        // 2. Reached max requests
        // 3. Been idle too long
        if (
          (!conn.inUse && now - conn.lastUsed > 300000) || // 5 minutes idle
          conn.requestCount >= conn.maxRequests ||
          (!conn.inUse && now - conn.created > 600000) // 10 minutes old
        ) {
          toRemove.push(conn);
        }
      }

      // Remove connections
      toRemove.forEach(conn => {
        this.removeConnection(conn);
      });

      // Maintain minimum connections
      if (pool.length < 2 && config.keepAlive) {
        // Create a new connection to maintain pool
        this.createConnection(config).then(newConn => {
          pool.push(newConn);
          newConn.inUse = false;
        }).catch(error => {
          console.error('Failed to create maintenance connection:', error);
        });
      }
    }
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  getStats(): {
    totalConnections: number;
    inUseConnections: number;
    byProvider: Record<string, { total: number; inUse: number; created: number; reused: number; errors: number }>;
  } {
    let total = 0;
    let inUse = 0;
    const byProvider: any = {};

    for (const [key, pool] of this.pools.entries()) {
      const poolInUse = pool.filter(c => c.inUse).length;
      const metrics = this.metrics.get(key);

      total += pool.length;
      inUse += poolInUse;

      byProvider[key] = {
        total: pool.length,
        inUse: poolInUse,
        created: metrics?.created || 0,
        reused: metrics?.reused || 0,
        errors: metrics?.errors || 0
      };
    }

    return {
      totalConnections: total,
      inUseConnections: inUse,
      byProvider
    };
  }

  async clearPool(provider?: string, model?: string): Promise<void> {
    if (provider && model) {
      const key = `${provider}:${model}`;
      const pool = this.pools.get(key);
      if (pool) {
        // Close all connections
        for (const conn of pool) {
          this.removeConnection(conn);
        }
      }
    } else {
      // Clear all pools
      for (const pool of this.pools.values()) {
        for (const conn of pool) {
          this.removeConnection(conn);
        }
      }
      this.pools.clear();
    }
  }

  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all connections
    await this.clearPool();
  }
}