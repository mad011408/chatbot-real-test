import { Message, ValidationConfig, AuthenticityResult, FakeDetectionResult } from '@/types';
import { AUTHENTICITY_CONFIG } from '@/config/validation.config';
import { AuthenticityScorer } from '@/utils/authenticity-scorer';
import { FakeDetector } from '@/utils/fake-detector';

export class ValidationService {
  private authenticityScorer: AuthenticityScorer;
  private fakeDetector: FakeDetector;
  private config: ValidationConfig;

  constructor() {
    this.authenticityScorer = new AuthenticityScorer();
    this.fakeDetector = new FakeDetector();
    this.config = AUTHENTICITY_CONFIG;
  }

  async validateResponse(
    response: string,
    conversationHistory: Message[],
    userMessage?: string
  ): Promise<{
    isValid: boolean;
    authenticityResult: AuthenticityResult;
    fakeDetectionResult: FakeDetectionResult;
    shouldRetry: boolean;
    reasons: string[];
  }> {
    // Run authenticity scoring
    const authenticityResult = await this.authenticityScorer.scoreAuthenticity(
      response,
      conversationHistory,
      userMessage
    );

    // Run fake detection
    const context = conversationHistory.map(m => m.content).join(' ');
    const fakeDetectionResult = await this.fakeDetector.detectFake(response, context);

    // Check if response meets minimum requirements
    const meetsAuthenticityThreshold = authenticityResult.score >= this.config.minAuthenticityScore;
    const passesFakeDetection = fakeDetectionResult.confidence <= this.config.maxFakeScore;
    const hasRequiredFactors = this.checkRequiredFactors(authenticityResult);
    const avoidsBannedPatterns = this.checkBannedPatterns(response);

    const isValid = meetsAuthenticityThreshold && passesFakeDetection && hasRequiredFactors && avoidsBannedPatterns;
    const shouldRetry = !isValid && (
      authenticityResult.verdict === 'fake' ||
      fakeDetectionResult.isFake ||
      !hasRequiredFactors
    );

    const reasons = [
      !meetsAuthenticityThreshold ? `Authenticity score too low (${authenticityResult.score} < ${this.config.minAuthenticityScore})` : '',
      !passesFakeDetection ? `Fake detection confidence too high (${fakeDetectionResult.confidence} > ${this.config.maxFakeScore})` : '',
      !hasRequiredFactors ? 'Missing required authenticity factors' : '',
      !avoidsBannedPatterns ? 'Contains banned patterns' : '',
      authenticityResult.verdict === 'fake' ? 'Response classified as fake' : '',
      fakeDetectionResult.isFake ? 'Response detected as fake' : ''
    ].filter(Boolean);

    return {
      isValid,
      authenticityResult,
      fakeDetectionResult,
      shouldRetry,
      reasons
    };
  }

  async validateStreamingChunk(
    chunk: string,
    partialResponse: string,
    conversationHistory: Message[],
    userMessage?: string
  ): Promise<{
    continueStreaming: boolean;
    warning?: string;
    authenticityScore?: number;
    fakeScore?: number;
  }> {
    // For streaming, we do lighter validation to avoid interrupting flow
    const partialValidation = await this.validatePartialResponse(
      partialResponse + chunk,
      conversationHistory,
      userMessage
    );

    // Only stop streaming for severe issues
    const severeIssues = partialValidation.reasons.filter(reason =>
      reason.includes('fake') ||
      reason.includes('banned patterns') ||
      reason.includes('templated')
    );

    return {
      continueStreaming: severeIssues.length === 0,
      warning: severeIssues.length > 0 ? severeIssues[0] : undefined,
      authenticityScore: partialValidation.authenticityResult.score,
      fakeScore: partialValidation.fakeDetectionResult.confidence
    };
  }

  private async validatePartialResponse(
    response: string,
    conversationHistory: Message[],
    userMessage?: string
  ) {
    // For partial responses, we're more lenient
    const tempConfig = { ...this.config };
    tempConfig.minAuthenticityScore *= 0.7; // Lower threshold for partial
    tempConfig.maxFakeScore *= 1.3; // Higher tolerance for fake detection

    const authenticityResult = await this.authenticityScorer.scoreAuthenticity(
      response,
      conversationHistory,
      userMessage
    );

    const context = conversationHistory.map(m => m.content).join(' ');
    const fakeDetectionResult = await this.fakeDetector.detectFake(response, context);

    return {
      authenticityResult,
      fakeDetectionResult,
      reasons: [] // We don't generate detailed reasons for partial validation
    };
  }

  private checkRequiredFactors(authenticityResult: AuthenticityResult): boolean {
    const factorNames = authenticityResult.factors.map(f => f.name);
    return this.config.requiredFactors.every(factor => factorNames.includes(factor));
  }

  private checkBannedPatterns(response: string): boolean {
    const lowerResponse = response.toLowerCase();
    return !this.config.bannedPatterns.some(pattern =>
      lowerResponse.includes(pattern.toLowerCase())
    );
  }

  async getValidationReport(
    response: string,
    conversationHistory: Message[],
    userMessage?: string
  ): Promise<{
    summary: {
      overallScore: number;
      authenticityScore: number;
      fakeScore: number;
      grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
    };
    details: {
      authenticityFactors: AuthenticityResult['factors'];
      fakePatterns: FakeDetectionResult['patterns'];
      recommendations: string[];
    };
  }> {
    const validation = await this.validateResponse(response, conversationHistory, userMessage);

    // Calculate overall score
    const authenticityScore = validation.authenticityResult.score;
    const fakeScore = 1 - validation.fakeDetectionResult.confidence; // Invert fake score
    const overallScore = (authenticityScore + fakeScore) / 2;

    // Determine grade
    const grade = this.calculateGrade(overallScore);

    // Generate recommendations
    const recommendations = this.generateRecommendations(validation);

    return {
      summary: {
        overallScore,
        authenticityScore,
        fakeScore,
        grade
      },
      details: {
        authenticityFactors: validation.authenticityResult.factors,
        fakePatterns: validation.fakeDetectionResult.patterns,
        recommendations
      }
    };
  }

  private calculateGrade(score: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 0.95) return 'A+';
    if (score >= 0.9) return 'A';
    if (score >= 0.8) return 'B';
    if (score >= 0.7) return 'C';
    if (score >= 0.6) return 'D';
    return 'F';
  }

  private generateRecommendations(validation: {
    authenticityResult: AuthenticityResult;
    fakeDetectionResult: FakeDetectionResult;
    reasons: string[];
  }): string[] {
    const recommendations: string[] = [];

    // Authenticity recommendations
    const lowFactors = validation.authenticityResult.factors.filter(f => f.score < 0.6);
    for (const factor of lowFactors) {
      switch (factor.name) {
        case 'natural_language':
          recommendations.push('Use more natural language patterns like contractions and colloquialisms');
          break;
        case 'context_coherence':
          recommendations.push('Better reference the conversation context and previous points');
          break;
        case 'response_relevance':
          recommendations.push('Ensure the response directly addresses the user\'s query');
          break;
        case 'personality_consistency':
          recommendations.push('Maintain a consistent personality and tone throughout the conversation');
          break;
        case 'human_likeness':
          recommendations.push('Add more human-like traits such as opinions and uncertainty');
          break;
      }
    }

    // Fake detection recommendations
    for (const pattern of validation.fakeDetectionResult.patterns) {
      switch (pattern.type) {
        case 'repetitive':
          recommendations.push('Vary sentence structure and avoid repetitive phrases');
          break;
        case 'generic':
          recommendations.push('Be more specific and avoid generic, non-committal language');
          break;
        case 'unnatural':
          recommendations.push('Use more natural language with appropriate contractions and emotion');
          break;
        case 'inconsistent':
          recommendations.push('Ensure consistency with previous messages and maintain context');
          break;
        case 'templated':
          recommendations.push('Avoid AI disclaimer phrases and be more direct');
          break;
      }
    }

    return recommendations;
  }

  updateConfig(newConfig: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): ValidationConfig {
    return { ...this.config };
  }
}