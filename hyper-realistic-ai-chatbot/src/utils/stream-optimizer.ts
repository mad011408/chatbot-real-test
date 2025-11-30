import { Transform } from 'stream';
import { gzipSync, gunzipSync } from 'zlib';

interface StreamConfig {
  bufferSize: number;
  chunkSize: number;
  compressionLevel: number;
  enableBatching: boolean;
  batchSize: number;
  batchTimeout: number;
}

export class StreamOptimizer {
  private config: StreamConfig;
  private buffer: string[];
  private batchTimer: any;
  private totalChunks: number;
  private totalBytes: number;
  private startTime: number;

  constructor(config: Partial<StreamConfig> = {}) {
    this.config = {
      bufferSize: 1000, // 1KB buffer
      chunkSize: 64, // 64 byte chunks
      compressionLevel: 6,
      enableBatching: true,
      batchSize: 10,
      batchTimeout: 5, // 5ms
      ...config
    };

    this.buffer = [];
    this.totalChunks = 0;
    this.totalBytes = 0;
    this.startTime = Date.now();
  }

  // Ultra-fast streaming transform
  createTransform(): Transform {
    return new Transform({
      objectMode: true,
      transform: (chunk: any, encoding, callback) => {
        this.processChunk(chunk, callback);
      },
      flush: (callback) => {
        this.flushBatch(callback);
      }
    });
  }

  private processChunk(chunk: any, callback: Function): void {
    const startTime = process.hrtime.bigint();

    // Optimize chunk
    const optimized = this.optimizeChunk(chunk);

    if (this.config.enableBatching) {
      // Add to batch buffer
      this.buffer.push(optimized);
      this.totalChunks++;
      this.totalBytes += Buffer.byteLength(optimized, 'utf8');

      // Check if we should flush
      if (this.buffer.length >= this.config.batchSize) {
        this.flushBatch(callback);
      } else if (!this.batchTimer) {
        // Set timer for batch timeout
        this.batchTimer = setTimeout(() => {
          this.flushBatch(callback);
        }, this.config.batchTimeout);
      }
    } else {
      // Send immediately
      callback(null, optimized);
      this.totalChunks++;
      this.totalBytes += Buffer.byteLength(optimized, 'utf8');
    }

    // Log performance
    const endTime = process.hrtime.bigint();
    const processingTime = Number(endTime - startTime) / 1000000; // Convert to microseconds

    if (processingTime > 100) { // Log if processing takes more than 100 microseconds
      console.warn(`Slow chunk processing: ${processingTime}μs`);
    }
  }

  private optimizeChunk(chunk: any): string {
    let optimized = chunk;

    // Minimize the chunk
    if (typeof chunk === 'string') {
      // Remove unnecessary whitespace
      optimized = chunk.replace(/\\s+/g, ' ').trim();

      // Common response optimizations
      optimized = this.applyCommonOptimizations(optimized);

      // Compress if large enough
      if (Buffer.byteLength(optimized, 'utf8') > this.config.bufferSize) {
        optimized = this.compressChunk(optimized);
      }
    }

    return optimized;
  }

  private applyCommonOptimizations(text: string): string {
    // Common AI response patterns to optimize
    const optimizations = [
      { pattern: /As an AI language model/gi, replacement: '' },
      { pattern: /I'm here to assist/gi, replacement: 'Here to help' },
      { pattern: /I don't have personal/gi, replacement: '' },
      { pattern: /based on my training/gi, replacement: '' },
      { pattern: /it's worth noting/gi, replacement: 'Note:' },
      { pattern: /please keep in mind/gi, replacement: 'Remember:' },
      { pattern: /it would be helpful to/gi, replacement: 'Try:' }
    ];

    let optimized = text;

    for (const { pattern, replacement } of optimizations) {
      optimized = optimized.replace(pattern, replacement);
    }

    return optimized;
  }

  private compressChunk(chunk: string): string {
    if (this.config.compressionLevel > 0) {
      try {
        const compressed = gzipSync(chunk, { level: this.config.compressionLevel });
        return `COMPRESSED:${compressed.toString('base64')}`;
      } catch (error) {
        console.error('Compression failed:', error);
      }
    }
    return chunk;
  }

  private flushBatch(callback: Function): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.buffer.length > 0) {
      // Combine batch
      const batch = this.buffer.join('');
      this.buffer = [];

      // Send batch as single chunk
      callback(null, batch);
    }
  }

  // Ultra-fast WebSocket stream handler
  createWSHandler(ws: any): (data: any) => void {
    const sendQueue: any[] = [];
    let isSending = false;

    // Optimized send function
    const optimizedSend = (data: any) => {
      if (isSending) {
        sendQueue.push(data);
        return;
      }

      isSending = true;

      try {
        // Optimize data
        const optimized = this.optimizeForWS(data);

        // Send with minimal overhead
        if (ws.readyState === ws.OPEN) {
          ws.send(optimized, { binary: false, compress: false });
          this.totalChunks++;
        }
      } catch (error) {
        console.error('WebSocket send error:', error);
      } finally {
        isSending = false;

        // Process queue
        if (sendQueue.length > 0) {
          const next = sendQueue.shift();
          optimizedSend(next);
        }
      }
    };

    return optimizedSend;
  }

  private optimizeForWS(data: any): any {
    // WebSocket-specific optimizations
    if (typeof data === 'object') {
      // Minimize JSON size
      const minimized = this.minimizeJSON(data);

      // Convert to binary if smaller
      const jsonStr = JSON.stringify(minimized);
      const buffer = Buffer.from(jsonStr, 'utf8');

      if (buffer.length < 1024) { // Only compress small messages
        return buffer;
      }

      return jsonStr;
    }

    return data;
  }

  private minimizeJSON(obj: any): any {
    // Remove unnecessary fields
    if (obj && typeof obj === 'object') {
      const minimized: any = {};

      // Keep only essential fields
      const essentialFields = ['type', 'content', 'id', 'data'];
      for (const field of essentialFields) {
        if (obj.hasOwnProperty(field)) {
          minimized[field] = obj[field];
        }
      }

      // Minimize nested objects
      for (const [key, value] of Object.entries(minimized)) {
        if (typeof value === 'object') {
          minimized[key] = this.minimizeJSON(value);
        }
      }

      return minimized;
    }

    return obj;
  }

  // Predictive streaming
  createPredictiveStream(predictor: (chunk: string) => string[]): Transform {
    let predictionBuffer: string[] = [];

    return new Transform({
      objectMode: true,
      transform: (chunk: any, encoding, callback) => {
        if (typeof chunk === 'string') {
          // Get predictions
          const predictions = predictor(chunk);
          predictionBuffer.push(...predictions);

          // Send original chunk
          callback(null, chunk);

          // Send predictions if confident
          if (predictions.length > 0 && Math.random() > 0.3) { // 70% confidence
            setTimeout(() => {
              const prediction = predictions[Math.floor(Math.random() * predictions.length)];
              callback(null, ` [Prediction: ${prediction}]`);
            }, 10); // 10ms delay
          }
        } else {
          callback(null, chunk);
        }
      }
    });
  }

  // Performance monitoring
  getStats(): {
    totalChunks: number;
    totalBytes: number;
    averageChunkSize: number;
    chunksPerSecond: number;
    bytesPerSecond: number;
    duration: number;
  } {
    const duration = Date.now() - this.startTime;
    const chunksPerSecond = this.totalChunks / (duration / 1000);
    const bytesPerSecond = this.totalBytes / (duration / 1000);
    const averageChunkSize = this.totalChunks > 0 ? this.totalBytes / this.totalChunks : 0;

    return {
      totalChunks: this.totalChunks,
      totalBytes: this.totalBytes,
      averageChunkSize,
      chunksPerSecond,
      bytesPerSecond,
      duration
    };
  }

  // Reset stats
  reset(): void {
    this.totalChunks = 0;
    this.totalBytes = 0;
    this.startTime = Date.now();
  }

  // Adaptive optimization based on performance
  adaptConfig(performance: { latency: number; throughput: number }): void {
    if (performance.latency > 100) { // Latency too high
      // Increase batch size
      this.config.batchSize = Math.min(50, this.config.batchSize + 5);
      // Increase buffer size
      this.config.bufferSize = Math.min(2000, this.config.bufferSize + 100);
    }

    if (performance.throughput < 1000) { // Throughput too low
      // Reduce batching for faster delivery
      this.config.batchSize = Math.max(1, this.config.batchSize - 2);
      // Reduce timeout
      this.config.batchTimeout = Math.max(1, this.config.batchTimeout - 1);
    }

    console.log('Adapted streaming config:', this.config);
  }

  // Pre-compute common responses
  precomputeResponses(responses: string[]): Map<string, any> {
    const precomputed = new Map();

    for (const response of responses) {
      // Optimize and cache
      const optimized = this.optimizeChunk(response);
      const compressed = this.compressChunk(optimized);
      const buffer = Buffer.from(compressed, 'utf8');

      precomputed.set(response, {
        optimized,
        compressed,
        buffer,
        size: buffer.length
      });
    }

    return precomputed;
  }

  // Zero-copy streaming
  createZeroCopyStream(): Transform {
    let buffer: Buffer | null = null;
    let offset = 0;

    return new Transform({
      transform: (chunk: Buffer, encoding, callback) => {
        if (!buffer) {
          buffer = Buffer.allocUnsafe(this.config.bufferSize);
        }

        // Copy without allocation
        chunk.copy(buffer, offset);
        offset += chunk.length;

        // Flush if buffer is full
        if (offset >= this.config.bufferSize) {
          callback(null, buffer.slice(0, offset));
          buffer = null;
          offset = 0;
        }
      },

      flush: (callback) => {
        if (buffer && offset > 0) {
          callback(null, buffer.slice(0, offset));
        }
        callback();
      }
    });
  }
}