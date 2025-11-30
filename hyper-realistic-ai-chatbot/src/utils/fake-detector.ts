import { FakeDetectionResult, FakePattern } from '@/types';
import { DETECTION_PATTERNS, FAKE_DETECTION_RULES } from '@/config/validation.config';
import natural from 'natural';
import sentiment from 'sentiment';

const tokenizer = new natural.WordTokenizer();
const sentimentAnalyzer = new sentiment();

export class FakeDetector {
  private aiTelltalePatterns: RegExp[];
  private genericPhrases: RegExp[];
  private repetitiveStructures: RegExp[];

  constructor() {
    this.aiTelltalePatterns = DETECTION_PATTERNS.AI_TELLTALES.map(
      pattern => new RegExp(pattern, 'gi')
    );
    this.genericPhrases = DETECTION_PATTERNS.GENERIC_PHRASES.map(
      pattern => new RegExp(pattern, 'gi')
    );
    this.repetitiveStructures = DETECTION_PATTERNS.REPETITIVE_STRUCTURES.map(
      pattern => new RegExp(pattern, 'gi')
    );
  }

  async detectFake(response: string, context?: string): Promise<FakeDetectionResult> {
    const patterns: FakePattern[] = [];
    let totalConfidence = 0;
    let patternCount = 0;

    // Check for AI telltale phrases
    const aiTelltaleResult = this.checkAITelltale(response);
    if (aiTelltaleResult.score > 0) {
      patterns.push(aiTelltaleResult.pattern);
      totalConfidence += aiTelltaleResult.score;
      patternCount++;
    }

    // Check for generic responses
    const genericResult = this.checkGenericResponse(response);
    if (genericResult.score > 0) {
      patterns.push(genericResult.pattern);
      totalConfidence += genericResult.score;
      patternCount++;
    }

    // Check for repetitive patterns
    const repetitiveResult = this.checkRepetitivePatterns(response);
    if (repetitiveResult.score > 0) {
      patterns.push(repetitiveResult.pattern);
      totalConfidence += repetitiveResult.score;
      patternCount++;
    }

    // Check for unnatural language
    const unnaturalResult = this.checkUnnaturalLanguage(response);
    if (unnaturalResult.score > 0) {
      patterns.push(unnaturalResult.pattern);
      totalConfidence += unnaturalResult.score;
      patternCount++;
    }

    // Check for inconsistency with context
    if (context) {
      const inconsistencyResult = this.checkInconsistency(response, context);
      if (inconsistencyResult.score > 0) {
        patterns.push(inconsistencyResult.pattern);
        totalConfidence += inconsistencyResult.score;
        patternCount++;
      }
    }

    // Calculate overall confidence
    const averageConfidence = patternCount > 0 ? totalConfidence / patternCount : 0;
    const isFake = averageConfidence > FAKE_DETECTION_RULES.repetitive_patterns.threshold;

    return {
      isFake,
      confidence: averageConfidence,
      reasons: patterns.map(p => p.description),
      patterns
    };
  }

  private checkAITelltale(response: string): { pattern: FakePattern; score: number } {
    const matches: string[] = [];

    for (const pattern of this.aiTelltalePatterns) {
      const found = response.match(pattern);
      if (found) {
        matches.push(...found);
      }
    }

    const score = matches.length > 0 ? 0.8 : 0;

    return {
      pattern: {
        type: 'templated',
        severity: 'high',
        description: 'Contains typical AI disclaimer phrases',
        evidence: matches
      },
      score
    };
  }

  private checkGenericResponse(response: string): { pattern: FakePattern; score: number } {
    const matches: string[] = [];
    const sentences = response.split(/[.!?]+/);

    for (const pattern of this.genericPhrases) {
      const found = response.match(pattern);
      if (found) {
        matches.push(...found);
      }
    }

    // Check for non-committal language
    const nonComittal = response.match(/\b(might|could|perhaps|possibly|may|suggest|consider)\b/gi);
    if (nonComittal && nonComittal.length > 3) {
      matches.push(...nonComittal);
    }

    // Check for vague statements
    const vaguePhrases = response.match(/\b(generally|typically|usually|often|sometimes|in general)\b/gi);
    if (vaguePhrases && vaguePhrases.length > 2) {
      matches.push(...vaguePhrases);
    }

    const score = Math.min(matches.length / 5, 0.9);

    return {
      pattern: {
        type: 'generic',
        severity: matches.length > 3 ? 'high' : matches.length > 1 ? 'medium' : 'low',
        description: 'Uses generic, non-committal language',
        evidence: matches
      },
      score
    };
  }

  private checkRepetitivePatterns(response: string): { pattern: FakePattern; score: number } {
    const sentences = response.split(/[.!?]+/).filter(s => s.trim());
    const sentenceStarts = sentences.map(s => s.trim().split(' ')[0].toLowerCase());
    const sentenceStructures = sentences.map(s => {
      const words = s.trim().split(' ');
      return words.length;
    });

    // Check for repetitive sentence starts
    const startFrequency: Record<string, number> = {};
    sentenceStarts.forEach(start => {
      startFrequency[start] = (startFrequency[start] || 0) + 1;
    });

    const repetitiveStarts = Object.entries(startFrequency)
      .filter(([_, count]) => count > 2)
      .map(([start, _]) => start);

    // Check for formulaic structures
    const structureVariance = this.calculateVariance(sentenceStructures);
    const formulaicScore = structureVariance < 2 ? 0.5 : 0;

    // Check for repeated phrases
    const phrases = response.match(/\b\w+(?:\s+\w+){2,}\b/g) || [];
    const phraseFrequency: Record<string, number> = {};
    phrases.forEach(phrase => {
      phraseFrequency[phrase] = (phraseFrequency[phrase] || 0) + 1;
    });

    const repeatedPhrases = Object.entries(phraseFrequency)
      .filter(([_, count]) => count > 2)
      .map(([phrase, _]) => phrase);

    const evidence = [...repetitiveStarts, ...repeatedPhrases];
    const score = Math.min((repetitiveStarts.length + repeatedPhrases.length) / 5 + formulaicScore, 0.9);

    return {
      pattern: {
        type: 'repetitive',
        severity: score > 0.6 ? 'high' : score > 0.3 ? 'medium' : 'low',
        description: 'Shows repetitive patterns and formulaic responses',
        evidence
      },
      score
    };
  }

  private checkUnnaturalLanguage(response: string): { pattern: FakePattern; score: number } {
    const words = tokenizer.tokenize(response) || [];
    const sentences = response.split(/[.!?]+/).filter(s => s.trim());

    // Check for perfect grammar (unnatural)
    const hasContractions = /\b(it's|you're|don't|can't|won't|I'm|we're|they're|that's|here's)\b/gi.test(response);
    const contractionScore = hasContractions ? 0 : 0.3;

    // Check sentence length variance
    const sentenceLengths = sentences.map(s => s.trim().split(' ').length);
    const lengthVariance = this.calculateVariance(sentenceLengths);
    const varianceScore = lengthVariance < 1 ? 0.4 : 0;

    // Check for overly complex sentences
    const avgWordsPerSentence = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
    const complexityScore = avgWordsPerSentence > 25 ? 0.3 : 0;

    // Check for formal language
    const formalWords = response.match(/\b(henceforth|therefore|consequently|furthermore|moreover|notwithstanding)\b/gi);
    const formalScore = formalWords && formalWords.length > 2 ? 0.3 : 0;

    // Check for emotional flatness
    const sentimentResult = sentimentAnalyzer.analyze(response);
    const emotionalScore = Math.abs(sentimentResult.score) < 1 ? 0.2 : 0;

    const score = Math.min(contractionScore + varianceScore + complexityScore + formalScore + emotionalScore, 0.9);
    const evidence = [
      !hasContractions ? 'No contractions' : '',
      varianceScore > 0 ? 'Uniform sentence lengths' : '',
      complexityScore > 0 ? 'Overly complex sentences' : '',
      formalScore > 0 ? 'Overly formal language' : '',
      emotionalScore > 0 ? 'Emotionally flat' : ''
    ].filter(Boolean);

    return {
      pattern: {
        type: 'unnatural',
        severity: score > 0.6 ? 'high' : score > 0.3 ? 'medium' : 'low',
        description: 'Language appears unnatural or robotic',
        evidence
      },
      score
    };
  }

  private checkInconsistency(response: string, context: string): { pattern: FakePattern; score: number } {
    const contextWords = new Set(tokenizer.tokenize(context.toLowerCase()) || []);
    const responseWords = tokenizer.tokenize(response.toLowerCase()) || [];

    // Check for contradictions
    const contradictions = this.findContradictions(response, context);

    // Check for topic drift
    const topicOverlap = responseWords.filter(word => contextWords.has(word)).length / responseWords.length;
    const topicDriftScore = topicOverlap < 0.2 ? 0.4 : 0;

    // Check for personality changes
    const personalityMarkers = {
      formal: /\b(however|therefore|furthermore|consequently)\b/gi,
      casual: /\b(yeah|nope|totally|awesome|cool)\b/gi,
      uncertain: /\b(perhaps|maybe|might|could be)\b/gi,
      confident: /\b(definitely|certainly|absolutely|without doubt)\b/gi
    };

    const contextPersonality = this.analyzePersonality(context, personalityMarkers);
    const responsePersonality = this.analyzePersonality(response, personalityMarkers);
    const personalityShift = this.calculatePersonalityShift(contextPersonality, responsePersonality);
    const personalityScore = personalityShift > 0.7 ? 0.5 : 0;

    const score = Math.min((contradictions.length * 0.3) + topicDriftScore + personalityScore, 0.9);
    const evidence = [
      ...contradictions,
      topicDriftScore > 0 ? 'Topic drift detected' : '',
      personalityScore > 0 ? 'Personality shift detected' : ''
    ].filter(Boolean);

    return {
      pattern: {
        type: 'inconsistent',
        severity: score > 0.6 ? 'high' : score > 0.3 ? 'medium' : 'low',
        description: 'Response is inconsistent with context',
        evidence
      },
      score
    };
  }

  private findContradictions(text1: string, text2: string): string[] {
    // Simple contradiction detection - can be enhanced with NLP
    const contradictions: string[] = [];

    const negations1 = text1.match(/\b(no|not|never|none|nothing|nowhere|neither|cannot|can't|won't|don't)\b/gi) || [];
    const negations2 = text2.match(/\b(no|not|never|none|nothing|nowhere|neither|cannot|can't|won't|don't)\b/gi) || [];

    // Check for opposite statements
    if (negations1.length === 0 && negations2.length > 0) {
      contradictions.push('Negation introduced');
    } else if (negations1.length > 0 && negations2.length === 0) {
      contradictions.push('Negation removed');
    }

    return contradictions;
  }

  private analyzePersonality(text: string, markers: Record<string, RegExp>): Record<string, number> {
    const personality: Record<string, number> = {};

    for (const [type, pattern] of Object.entries(markers)) {
      const matches = text.match(pattern) || [];
      personality[type] = matches.length;
    }

    return personality;
  }

  private calculatePersonalityShift(p1: Record<string, number>, p2: Record<string, number>): number {
    const types = Object.keys(p1);
    let totalShift = 0;

    for (const type of types) {
      const v1 = p1[type] || 0;
      const v2 = p2[type] || 0;
      const max = Math.max(v1, v2, 1);
      totalShift += Math.abs(v2 - v1) / max;
    }

    return totalShift / types.length;
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;

    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
  }
}