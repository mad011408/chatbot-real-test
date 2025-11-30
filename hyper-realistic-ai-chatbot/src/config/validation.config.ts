import { ValidationConfig } from '@/types';

export const AUTHENTICITY_CONFIG: ValidationConfig = {
  minAuthenticityScore: 0.7,
  maxFakeScore: 0.3,
  requiredFactors: [
    'natural_language',
    'context_coherence',
    'response_relevance',
    'personality_consistency'
  ],
  bannedPatterns: [
    'as an ai',
    'language model',
    'here to assist',
    'i don\'t have',
    'as a large',
    'ai assistant'
  ]
};

export const AUTHENTICITY_FACTORS = {
  natural_language: {
    weight: 0.3,
    checks: [
      'contractions_usage',
      'sentence_variety',
      'colloquialisms',
      'natural_flow'
    ]
  },
  context_coherence: {
    weight: 0.25,
    checks: [
      'conversation_memory',
      'logical_progression',
      'consistency',
      'relevance'
    ]
  },
  response_relevance: {
    weight: 0.2,
    checks: [
      'direct_answer',
      'question_addressed',
      'appropriate_depth',
      'on_topic'
    ]
  },
  personality_consistency: {
    weight: 0.15,
    checks: [
      'voice_stability',
      'tone_consistency',
      'style_maintenance',
      'character_integrity'
    ]
  },
  human_likeness: {
    weight: 0.1,
    checks: [
      'opinion_expression',
      'uncertainty_admission',
      'personal_touch',
      'emotion_appropriateness'
    ]
  }
};

export const FAKE_DETECTION_RULES = {
  repetitive_patterns: {
    threshold: 0.4,
    penalties: [
      'same_sentence_structure',
      'repeated_phrases',
      'template_responses',
      'formulaic_answers'
    ]
  },
  generic_responses: {
    threshold: 0.5,
    indicators: [
      'vague_statements',
      'non_committed_answers',
      'canned_responses',
      'overly_formal'
    ]
  },
  unnatural_language: {
    threshold: 0.3,
    markers: [
      'perfect_grammar',
      'no_contractions',
      'overly_complex',
      'robotic_tone'
    ]
  },
  inconsistency: {
    threshold: 0.35,
    checks: [
      'contradictory_statements',
      'shifting_personality',
      'context_forgetting',
      'inconsistent_knowledge'
    ]
  }
};

export const SPEED_THRESHOLDS = {
  ultra_fast: {
    tokensPerSecond: 10000,
    maxLatency: 50,
    chunkSize: 1
  },
  fast: {
    tokensPerSecond: 5000,
    maxLatency: 100,
    chunkSize: 2
  },
  normal: {
    tokensPerSecond: 1000,
    maxLatency: 200,
    chunkSize: 5
  },
  slow: {
    tokensPerSecond: 500,
    maxLatency: 500,
    chunkSize: 10
  }
};

export const MONITORING_CONFIG = {
  metrics: {
    trackLatency: true,
    trackAuthenticity: true,
    trackFakeDetection: true,
    trackUserSatisfaction: true,
    trackProviderPerformance: true
  },
  alerts: {
    highLatency: 500,
    lowAuthenticity: 0.5,
    highFakeRate: 0.4,
    errorRate: 0.05
  },
  retention: {
    metricsDays: 30,
    sessionDays: 7,
    logDays: 1
  }
};