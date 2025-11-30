import { AuthenticityResult, AuthenticityFactor, Message } from '@/types';
import { AUTHENTICITY_CONFIG, AUTHENTICITY_FACTORS } from '@/config/validation.config';
import natural from 'natural';
import sentiment from 'sentiment';
import compromise from 'compromise';

const tokenizer = new natural.WordTokenizer();
const sentimentAnalyzer = new sentiment();
const nlp = compromise;

export class AuthenticityScorer {
  private factorWeights: Record<string, number>;

  constructor() {
    this.factorWeights = {};
    for (const [factor, config] of Object.entries(AUTHENTICITY_FACTORS)) {
      this.factorWeights[factor] = config.weight;
    }
  }

  async scoreAuthenticity(
    response: string,
    conversationHistory: Message[],
    userMessage?: string
  ): Promise<AuthenticityResult> {
    const factors: AuthenticityFactor[] = [];

    // Score each factor
    factors.push(this.scoreNaturalLanguage(response));
    factors.push(this.scoreContextCoherence(response, conversationHistory));
    factors.push(this.scoreResponseRelevance(response, userMessage));
    factors.push(this.scorePersonalityConsistency(response, conversationHistory));
    factors.push(this.scoreHumanLikeness(response));

    // Calculate weighted average
    const weightedScore = this.calculateWeightedScore(factors);
    const confidence = this.calculateConfidence(factors);
    const verdict = this.determineVerdict(weightedScore);

    return {
      score: weightedScore,
      confidence,
      factors,
      verdict
    };
  }

  private scoreNaturalLanguage(response: string): AuthenticityFactor {
    const checks = AUTHENTICITY_FACTORS.natural_language.checks;
    let score = 0;
    const results: string[] = [];

    // Check contractions usage
    const hasContractions = /\b(it's|you're|don't|can't|won't|I'm|we're|they're|that's|here's|I've|you've)\b/gi.test(response);
    if (hasContractions) {
      score += 0.25;
      results.push('Uses natural contractions');
    }

    // Check sentence variety
    const sentences = response.split(/[.!?]+/).filter(s => s.trim());
    const sentenceLengths = sentences.map(s => s.trim().split(' ').length);
    const lengthVariance = this.calculateVariance(sentenceLengths);
    if (lengthVariance > 3) {
      score += 0.25;
      results.push('Good sentence length variety');
    }

    // Check colloquialisms
    const colloquialisms = response.match(/\b(yeah|nope|totally|awesome|cool|gotta|wanna|kinda|sorta|y'know)\b/gi);
    if (colloquialisms && colloquialisms.length > 0) {
      score += 0.25;
      results.push('Uses colloquial expressions');
    }

    // Check natural flow
    const transitions = response.match(/\b(so|but|and|well|anyway|actually|basically|literally)\b/gi);
    if (transitions && transitions.length > 0) {
      score += 0.25;
      results.push('Natural transitions');
    }

    return {
      name: 'natural_language',
      weight: this.factorWeights.natural_language,
      score,
      description: results.join(', ') || 'Could use more natural language patterns'
    };
  }

  private scoreContextCoherence(response: string, history: Message[]): AuthenticityFactor {
    let score = 0;
    const results: string[] = [];

    if (history.length === 0) {
      return {
        name: 'context_coherence',
        weight: this.factorWeights.context_coherence,
        score: 0.5,
        description: 'No conversation history to evaluate'
      };
    }

    const recentMessages = history.slice(-3);
    const contextWords = new Set(
      recentMessages.flatMap(m => tokenizer.tokenize(m.content.toLowerCase()) || [])
    );
    const responseWords = tokenizer.tokenize(response.toLowerCase()) || [];

    // Check conversation memory
    const overlap = responseWords.filter(word => contextWords.has(word)).length / responseWords.length;
    if (overlap > 0.1) {
      score += 0.25;
      results.push('References conversation context');
    }

    // Check logical progression
    const lastMessage = recentMessages[recentMessages.length - 1];
    const lastSentiment = sentimentAnalyzer.analyze(lastMessage.content).score;
    const responseSentiment = sentimentAnalyzer.analyze(response).score;
    const sentimentShift = Math.abs(responseSentiment - lastSentiment);

    if (sentimentShift < 2) {
      score += 0.25;
      results.push('Emotionally consistent with conversation');
    }

    // Check topic consistency
    const lastTopics = this.extractTopics(lastMessage.content);
    const responseTopics = this.extractTopics(response);
    const topicOverlap = lastTopics.filter(topic => responseTopics.includes(topic)).length;

    if (topicOverlap > 0) {
      score += 0.25;
      results.push('Stays on topic');
    }

    // Check for appropriate reference to previous points
    const references = response.match(/\b(you mentioned|you said|earlier|before|as we discussed)\b/gi);
    if (references && references.length > 0) {
      score += 0.25;
      results.push('References previous discussion points');
    }

    return {
      name: 'context_coherence',
      weight: this.factorWeights.context_coherence,
      score,
      description: results.join(', ') || 'Could better connect to conversation'
    };
  }

  private scoreResponseRelevance(response: string, userMessage?: string): AuthenticityFactor {
    let score = 0;
    const results: string[] = [];

    if (!userMessage) {
      return {
        name: 'response_relevance',
        weight: this.factorWeights.response_relevance,
        score: 0.5,
        description: 'No user message to compare against'
      };
    }

    const userWords = new Set(tokenizer.tokenize(userMessage.toLowerCase()) || []);
    const responseWords = tokenizer.tokenize(response.toLowerCase()) || [];

    // Check if directly answers question
    const isQuestion = userMessage.match(/\b(what|how|why|when|where|who|which|can|could|would|should|is|are|do|does)\b/gi);
    if (isQuestion) {
      const hasAnswer = response.match(/\b(because|since|due to|the reason is|it's|they are|it is)\b/gi);
      if (hasAnswer) {
        score += 0.25;
        results.push('Directly answers question');
      }
    }

    // Check topic relevance
    const wordOverlap = responseWords.filter(word => userWords.has(word)).length / responseWords.length;
    if (wordOverlap > 0.15) {
      score += 0.25;
      results.push('Addresses user\'s topic');
    }

    // Check appropriate depth
    const responseLength = responseWords.length;
    const userLength = userMessage.split(' ').length;

    if (responseLength >= userLength * 0.5 && responseLength <= userLength * 5) {
      score += 0.25;
      results.push('Appropriate response length');
    }

    // Check if on topic
    const userTopics = this.extractTopics(userMessage);
    const responseTopics = this.extractTopics(response);
    const topicRelevance = userTopics.filter(topic => responseTopics.includes(topic)).length / Math.max(userTopics.length, 1);

    if (topicRelevance > 0.3) {
      score += 0.25;
      results.push('Stays on topic');
    }

    return {
      name: 'response_relevance',
      weight: this.factorWeights.response_relevance,
      score,
      description: results.join(', ') || 'Could be more relevant to user query'
    };
  }

  private scorePersonalityConsistency(response: string, history: Message[]): AuthenticityFactor {
    let score = 0;
    const results: string[] = [];

    if (history.length < 2) {
      return {
        name: 'personality_consistency',
        weight: this.factorWeights.personality_consistency,
        score: 0.7,
        description: 'Insufficient history to evaluate consistency'
      };
    }

    const pastResponses = history.filter(m => m.role === 'assistant').slice(-3);

    // Analyze personality traits
    const traits = {
      formality: this.analyzeFormality(response),
      sentiment: this.analyzeSentiment(response),
      complexity: this.analyzeComplexity(response),
      verbosity: this.analyzeVerbosity(response)
    };

    const pastTraits = pastResponses.map(msg => ({
      formality: this.analyzeFormality(msg.content),
      sentiment: this.analyzeSentiment(msg.content),
      complexity: this.analyzeComplexity(msg.content),
      verbosity: this.analyzeVerbosity(msg.content)
    }));

    // Check voice stability
    const formalityVariance = this.calculateTraitVariance('formality', traits.formality, pastTraits);
    if (formalityVariance < 0.3) {
      score += 0.25;
      results.push('Consistent formality level');
    }

    // Check tone consistency
    const sentimentVariance = this.calculateTraitVariance('sentiment', traits.sentiment, pastTraits);
    if (sentimentVariance < 0.4) {
      score += 0.25;
      results.push('Consistent emotional tone');
    }

    // Check style maintenance
    const complexityVariance = this.calculateTraitVariance('complexity', traits.complexity, pastTraits);
    if (complexityVariance < 0.3) {
      score += 0.25;
      results.push('Consistent complexity level');
    }

    // Check verbosity consistency
    const verbosityVariance = this.calculateTraitVariance('verbosity', traits.verbosity, pastTraits);
    if (verbosityVariance < 0.4) {
      score += 0.25;
      results.push('Consistent verbosity');
    }

    return {
      name: 'personality_consistency',
      weight: this.factorWeights.personality_consistency,
      score,
      description: results.join(', ') || 'Personality seems inconsistent'
    };
  }

  private scoreHumanLikeness(response: string): AuthenticityFactor {
    let score = 0;
    const results: string[] = [];

    // Check opinion expression
    const opinions = response.match(/\b(I think|I believe|in my opinion|personally|I feel|seems to me)\b/gi);
    if (opinions && opinions.length > 0) {
      score += 0.25;
      results.push('Expresses personal opinions');
    }

    // Check uncertainty admission
    const uncertainty = response.match(/\b(I'm not sure|I might be wrong|correct me if|not certain|probably|maybe)\b/gi);
    if (uncertainty && uncertainty.length > 0) {
      score += 0.25;
      results.push('Admits uncertainty appropriately');
    }

    // Check personal touch
    const personal = response.match(/\b(you know|to be honest|actually|in fact|really|honestly)\b/gi);
    if (personal && personal.length > 0) {
      score += 0.25;
      results.push('Adds personal touches');
    }

    // Check emotional appropriateness
    const doc = nlp(response);
    const emotions = doc.match('#Emotion').found;
    const exclamations = (response.match(/!/g) || []).length;

    if (emotions || exclamations > 0) {
      score += 0.25;
      results.push('Shows appropriate emotion');
    }

    // Check for imperfection
    const selfCorrections = response.match(/\b(actually|wait|no|scratch that|let me rephrase)\b/gi);
    if (selfCorrections && selfCorrections.length > 0) {
      score += 0.1; // Bonus for human-like self-correction
      results.push('Self-corrects naturally');
    }

    return {
      name: 'human_likeness',
      weight: this.factorWeights.human_likeness,
      score,
      description: results.join(', ') || 'Could show more human-like traits'
    };
  }

  private calculateWeightedScore(factors: AuthenticityFactor[]): number {
    let totalScore = 0;
    let totalWeight = 0;

    for (const factor of factors) {
      totalScore += factor.score * factor.weight;
      totalWeight += factor.weight;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  private calculateConfidence(factors: AuthenticityFactor[]): number {
    const scores = factors.map(f => f.score);
    const variance = this.calculateVariance(scores);
    // Lower variance = higher confidence
    return Math.max(0, 1 - variance);
  }

  private determineVerdict(score: number): 'authentic' | 'suspicious' | 'fake' {
    if (score >= AUTHENTICITY_CONFIG.minAuthenticityScore) {
      return 'authentic';
    } else if (score >= 0.5) {
      return 'suspicious';
    } else {
      return 'fake';
    }
  }

  private extractTopics(text: string): string[] {
    const doc = nlp(text);
    return doc.nouns().out('array').slice(0, 5);
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;

    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private analyzeFormality(text: string): number {
    const formal = text.match(/\b(however|therefore|furthermore|consequently|moreover)\b/gi) || [];
    const informal = text.match(/\b(yeah|nope|totally|awesome|cool|gotta|wanna)\b/gi) || [];
    return formal.length / (formal.length + informal.length + 1);
  }

  private analyzeSentiment(text: string): number {
    const result = sentimentAnalyzer.analyze(text);
    return result.score;
  }

  private analyzeComplexity(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const avgWordsPerSentence = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length;
    const avgSyllablesPerWord = text.split(' ').reduce((sum, word) => sum + this.countSyllables(word), 0) / text.split(' ').length;
    return (avgWordsPerSentence + avgSyllablesPerWord) / 2;
  }

  private analyzeVerbosity(text: string): number {
    return text.split(' ').length;
  }

  private calculateTraitVariance(trait: string, current: number, past: Array<{ [key: string]: number }>): number {
    if (past.length === 0) return 0;

    const values = past.map(p => p[trait] || 0);
    values.push(current);
    return this.calculateVariance(values);
  }

  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }
}