// Ultra-Fast AI Chatbot Client Example
// Demonstrates maximum speed optimizations

const WebSocket = require('ws');

class UltraFastClient {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.sessionId = null;
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.ws.on('open', () => {
      console.log('🚀 Connected to Ultra-Fast AI Chatbot');

      // Configure for maximum speed
      this.ws.send(JSON.stringify({
        type: 'configure',
        optimizations: {
          compression: true,
          batching: true,
          prediction: true,
          ultraFast: true
        }
      }));
    });

    this.ws.on('message', (data) => {
      const message = JSON.parse(data);
      this.handleMessage(message);
    });

    this.ws.on('close', () => {
      console.log('❌ Disconnected');
    });

    this.ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });
  }

  handleMessage(message) {
    switch (message.type) {
      case 'chunk':
        // Display chunk immediately for ultra-fast feel
        process.stdout.write(message.content);
        break;

      case 'complete':
        console.log('\n✅ Response complete');
        console.log(`⚡ Source: ${message.metadata.source}`);
        console.log(`📊 Latency: ${message.metadata.latency}ms`);
        console.log(`🎯 Authenticity: ${(message.metadata.authenticityScore * 100).toFixed(1)}%`);
        break;

      case 'batch-complete':
        console.log('\n📦 Batch processing complete');
        message.data.results.forEach((result, i) => {
          console.log(`\nMessage ${i + 1}:`);
          console.log(`Q: ${message.data.performance.sources[i]}`);
          console.log(`A: ${result.assistant.content.substring(0, 100)}...`);
        });
        console.log(`\n⚡ Average latency: ${message.data.performance.averageLatency}ms`);
        break;

      case 'prediction':
        console.log(`🔮 Prediction: ${message.prediction} (${(message.confidence * 100).toFixed(1)}% confidence)`);
        break;

      case 'warning':
        console.log(`⚠️ Warning: ${message.message}`);
        break;

      case 'error':
        console.error(`❌ Error: ${message.message}`);
        break;
    }
  }

  // Ultra-fast message sending
  sendMessage(message, options = {}) {
    const payload = {
      type: 'chat',
      content: message,
      ...options
    };

    this.ws.send(JSON.stringify(payload));
  }

  // Batch messages for maximum throughput
  sendBatch(messages) {
    this.ws.send(JSON.stringify({
      type: 'batch',
      messages: messages
    }));
  }

  // Request prediction
  requestPrediction(input) {
    this.ws.send(JSON.stringify({
      type: 'predict',
      input: input
    }));
  }

  // Enable ultra-fast mode
  enableUltraFastMode() {
    this.ws.send(JSON.stringify({
      type: 'configure',
      speed: 'ultra',
      tokensPerSecond: 20000,
      chunkSize: 1,
      enableLineByLine: true,
      enablePrediction: true,
      enableCaching: true,
      enableParallel: true
    }));
  }
}

// Usage examples
async function demonstrateSpeed() {
  const client = new UltraFastClient('ws://localhost:8080/ws/test-session');

  // Wait for connection
  await new Promise(resolve => {
    client.ws.on('open', resolve);
  });

  console.log('🚀 Demonstrating ultra-fast features...\n');

  // 1. Simple message
  client.sendMessage('Hello! How are you today?');
  await sleep(1000);

  // 2. Ultra-fast mode
  client.enableUltraFastMode();
  client.sendMessage('Explain quantum computing in simple terms');
  await sleep(1000);

  // 3. Batch processing
  client.sendBatch([
    'What is photosynthesis?',
    'How does encryption work?',
    'What is machine learning?',
    'Explain blockchain',
    'What is AI?'
  ]);
  await sleep(2000);

  // 4. Prediction request
  client.requestPrediction('Thank you for your help');

  // Keep alive
  setInterval(() => {
    client.ws.send(JSON.stringify({ type: 'ping' }));
  }, 30000);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run demonstration
if (require.main === module) {
  demonstrateSpeed().catch(console.error);
}

// REST API Example
async function restExample() {
  const fetch = require('node-fetch');

  console.log('🚀 Testing REST API...\n');

  // Ultra-fast message
  const response1 = await fetch('http://localhost:8080/api/sessions/test/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Write a hello world program',
      speed: 'ultra'
    })
  });

  const result1 = await response1.json();
  console.log('Response:', result1.data.message.content);
  console.log('Source:', result1.data.performance.source);
  console.log('Latency:', result1.data.performance.latency, 'ms\n');

  // Batch processing
  const response2 = await fetch('http://localhost:8080/api/sessions/test/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        'What is 2+2?',
        'What is the capital of France?',
        'Explain gravity',
        'Who wrote Romeo and Juliet?'
      ]
    })
  });

  const result2 = await response2.json();
  console.log('\nBatch Results:');
  result2.data.results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.assistant.metadata.source}: ${r.assistant.metadata.latency}ms`);
  });

  // Prediction
  const response3 = await fetch('http://localhost:8080/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: 'good morning',
      context: []
    })
  });

  const result3 = await response3.json();
  console.log('\nPrediction:', result3.data.prediction);
  console.log('Confidence:', (result3.data.confidence * 100).toFixed(1) + '%\n');

  // Performance stats
  const response4 = await fetch('http://localhost:8080/api/optimization/stats');
  const stats = await response4.json();
  console.log('\n📊 Optimization Stats:');
  console.log('Cache Hit Rate:', stats.data.cache.hitRate.toFixed(1) + '%');
  console.log('Pre-generated Patterns:', stats.data.preGen.patternCount);
  console.log('Parallel Pool:', stats.data.parallel.queueSize);
}

module.exports = { UltraFastClient, demonstrateSpeed, restExample };