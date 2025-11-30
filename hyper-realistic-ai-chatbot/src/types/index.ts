export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  model?: string;
  provider?: string;
  tokens?: number;
  latency?: number;
  authenticityScore?: number;
  fakeScore?: number;
  confidence?: number;
  sentiment?: number;
  complexity?: number;
}

export interface ChatSession {
  id: string;
  userId?: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  metadata: SessionMetadata;
}

export interface SessionMetadata {
  totalTokens: number;
  averageLatency: number;
  averageAuthenticity: number;
  messageCount: number;
  provider: string;
  model: string;
}

export interface LLMProvider {
  name: string;
  models: LLMModel[];
  apiKey?: string;
  baseURL?: string;
  maxTokens: number;
  supportsStreaming: boolean;
  latency: number;
  reliability: number;
}

export interface LLMModel {
  id: string;
  name: string;
  provider: string;
  maxTokens: number;
  contextWindow: number;
  costPer1KTokens: number;
  capabilities: ModelCapabilities;
}

export interface ModelCapabilities {
  textGeneration: boolean;
  codeGeneration: boolean;
  reasoning: boolean;
  creativity: number;
  accuracy: number;
  speed: number;
}

export interface AuthenticityResult {
  score: number;
  confidence: number;
  factors: AuthenticityFactor[];
  verdict: 'authentic' | 'suspicious' | 'fake';
}

export interface AuthenticityFactor {
  name: string;
  weight: number;
  score: number;
  description: string;
}

export interface FakeDetectionResult {
  isFake: boolean;
  confidence: number;
  reasons: string[];
  patterns: FakePattern[];
}

export interface FakePattern {
  type: 'repetitive' | 'generic' | 'inconsistent' | 'unnatural' | 'templated';
  severity: 'low' | 'medium' | 'high';
  description: string;
  evidence: string[];
}

export interface ValidationConfig {
  minAuthenticityScore: number;
  maxFakeScore: number;
  requiredFactors: string[];
  bannedPatterns: string[];
}

export interface StreamingOptions {
  speed: 'slow' | 'normal' | 'fast' | 'ultra';
  tokensPerSecond: number;
  chunkSize: number;
  enableLineByLine: boolean;
}

export interface MonitoringMetrics {
  requestCount: number;
  averageLatency: number;
  errorRate: number;
  authenticityDistribution: Record<string, number>;
  providerPerformance: Record<string, ProviderMetrics>;
}

export interface ProviderMetrics {
  latency: number;
  successRate: number;
  averageTokensPerSecond: number;
  authenticityScore: number;
  costPerRequest: number;
}

export interface UserPreferences {
  preferredProvider: string;
  preferredModel: string;
  speed: StreamingOptions['speed'];
  authenticityThreshold: number;
  enableFakeDetection: boolean;
  enableMonitoring: boolean;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    requestId: string;
    timestamp: Date;
    processingTime: number;
  };
}