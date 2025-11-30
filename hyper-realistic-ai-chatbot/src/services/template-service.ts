import { Message } from '@/types';

interface ResponseTemplate {
  id: string;
  pattern: RegExp;
  template: string;
  variables: string[];
  priority: number;
  category: 'greeting' | 'question' | 'help' | 'casual' | 'technical' | 'creative';
}

interface FastResponse {
  text: string;
  authenticity: number;
  tokens: number;
  latency: 0;
}

export class TemplateService {
  private templates: Map<string, ResponseTemplate[]>;
  private fastResponses: Map<string, FastResponse[]>;
  private initialized: boolean = false;

  constructor() {
    this.templates = new Map();
    this.fastResponses = new Map();
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    // Greeting Templates
    this.addTemplate('greeting', {
      id: 'greeting_1',
      pattern: /^(hi|hello|hey|yo|what's up|sup|good morning|good evening|good afternoon)/i,
      template: 'Hey there! {greeting_back} How can I help you today?',
      variables: ['greeting_back'],
      priority: 1,
      category: 'greeting'
    });

    this.addTemplate('greeting', {
      id: 'greeting_2',
      pattern: /^(how are you|how do you do|how\'s it going|what\'s new)/i,
      template: 'I\'m doing {mood}, thanks for asking! {question_back}',
      variables: ['mood', 'question_back'],
      priority: 1,
      category: 'greeting'
    });

    // Question Templates
    this.addTemplate('question', {
      id: 'question_1',
      pattern: /^(what is|what\'s|define|explain)/i,
      template: '{explanation} {example}',
      variables: ['explanation', 'example'],
      priority: 2,
      category: 'question'
    });

    this.addTemplate('question', {
      id: 'question_2',
      pattern: /^(how do|how can|how to)/i,
      template: 'Here\'s how you can {action}: {steps}',
      variables: ['action', 'steps'],
      priority: 2,
      category: 'question'
    });

    this.addTemplate('question', {
      id: 'question_3',
      pattern: /^(why does|why is|why do)/i,
      template: '{reason} {consequence}',
      variables: ['reason', 'consequence'],
      priority: 2,
      category: 'question'
    });

    // Help Templates
    this.addTemplate('help', {
      id: 'help_1',
      pattern: /^(help|assist|support|can you)/i,
      template: 'Absolutely! I\'d be happy to {assist_type}. {offer}',
      variables: ['assist_type', 'offer'],
      priority: 3,
      category: 'help'
    });

    // Casual Templates
    this.addTemplate('casual', {
      id: 'casual_1',
      pattern: /(cool|awesome|great|amazing|wow)/i,
      template: '{agreement}! {follow_up}',
      variables: ['agreement', 'follow_up'],
      priority: 4,
      category: 'casual'
    });

    this.addTemplate('casual', {
      id: 'casual_2',
      pattern: /(thanks|thank you|appreciate it)/i,
      template: '{response}! {offer_more}',
      variables: ['response', 'offer_more'],
      priority: 4,
      category: 'casual'
    });

    // Technical Templates
    this.addTemplate('technical', {
      id: 'technical_1',
      pattern: /(code|programming|develop|debug)/i,
      template: '{solution} {best_practice}',
      variables: ['solution', 'best_practice'],
      priority: 5,
      category: 'technical'
    });

    // Creative Templates
    this.addTemplate('creative', {
      id: 'creative_1',
      pattern: /(story|write|create|imagine)/i,
      template: '{creative_response} {engagement}',
      variables: ['creative_response', 'engagement'],
      priority: 6,
      category: 'creative'
    });

    // Pre-generate fast responses
    this.generateFastResponses();
    this.initialized = true;
  }

  private addTemplate(category: string, template: ResponseTemplate): void {
    if (!this.templates.has(category)) {
      this.templates.set(category, []);
    }
    this.templates.get(category)!.push(template);
  }

  private generateFastResponses(): void {
    // Generate ultra-fast responses for common patterns

    // Greetings
    this.addFastResponse('hello', [
      { text: 'Hey there! How\'s it going?', authenticity: 0.95, tokens: 6, latency: 0 },
      { text: 'Hi! What can I help you with today?', authenticity: 0.92, tokens: 8, latency: 0 },
      { text: 'Hello! Great to see you. What\'s on your mind?', authenticity: 0.94, tokens: 9, latency: 0 }
    ]);

    // Questions
    this.addFastResponse('what is', [
      { text: 'That\'s basically...', authenticity: 0.91, tokens: 4, latency: 0 },
      { text: 'Simply put, it\'s...', authenticity: 0.89, tokens: 5, latency: 0 },
      { text: 'Let me break this down for you...', authenticity: 0.93, tokens: 7, latency: 0 }
    ]);

    // Help requests
    this.addFastResponse('help', [
      { text: 'Absolutely! I\'m here to help.', authenticity: 0.94, tokens: 7, latency: 0 },
      { text: 'Of course! What do you need?', authenticity: 0.92, tokens: 6, latency: 0 },
      { text: 'I\'d be happy to assist you.', authenticity: 0.90, tokens: 6, latency: 0 }
    ]);

    // Acknowledgments
    this.addFastResponse('okay', [
      { text: 'Got it!', authenticity: 0.88, tokens: 2, latency: 0 },
      { text: 'Perfect!', authenticity: 0.86, tokens: 1, latency: 0 },
      { text: 'Understood.', authenticity: 0.87, tokens: 1, latency: 0 }
    ]);

    // Goodbyes
    this.addFastResponse('bye', [
      { text: 'Take care! See you soon.', authenticity: 0.91, tokens: 5, latency: 0 },
      { text: 'It was great chatting with you!', authenticity: 0.93, tokens: 6, latency: 0 },
      { text: 'Have a great day! Bye for now.', authenticity: 0.90, tokens: 6, latency: 0 }
    ]);
  }

  private addFastResponse(key: string, responses: FastResponse[]): void {
    this.fastResponses.set(key, responses);
  }

  async getFastResponse(input: string, context?: Message[]): Promise<FastResponse | null> {
    if (!this.initialized) {
      this.initializeTemplates();
    }

    const lowerInput = input.toLowerCase().trim();

    // Check exact matches first (fastest)
    for (const [key, responses] of this.fastResponses.entries()) {
      if (lowerInput.includes(key)) {
        // Return best response based on authenticity
        return responses.sort((a, b) => b.authenticity - a.authenticity)[0];
      }
    }

    // Check template patterns
    for (const [category, templates] of this.templates.entries()) {
      const sortedTemplates = templates.sort((a, b) => a.priority - b.priority);

      for (const template of sortedTemplates) {
        if (template.pattern.test(input)) {
          const response = this.fillTemplate(template, input, context);
          return {
            text: response,
            authenticity: 0.85 + Math.random() * 0.1, // 85-95% authenticity
            tokens: Math.ceil(response.length / 4),
            latency: 0
          };
        }
      }
    }

    // No fast response found
    return null;
  }

  private fillTemplate(template: ResponseTemplate, input: string, context?: Message[]): string {
    let response = template.template;

    // Fill variables based on context and input
    const variables: Record<string, string> = {};

    // Extract variables from input
    if (template.id.includes('greeting')) {
      variables.greeting_back = this.getGreetingBack(input);
      if (template.id.includes('greeting_2')) {
        variables.mood = ['pretty good', 'great', 'doing well', 'fantastic'][Math.floor(Math.random() * 4)];
        variables.question_back = 'What about you?';
      }
    }

    if (template.id.includes('question')) {
      variables.explanation = this.extractExplanation(input);
      variables.example = 'For example...';
      variables.action = this.extractAction(input);
      variables.steps = 'First, then, finally...';
      variables.reason = 'The main reason is...';
      variables.consequence = 'This means that...';
    }

    if (template.id.includes('help')) {
      variables.assist_type = 'help with that';
      variables.offer = 'What specifically do you need?';
    }

    if (template.id.includes('casual')) {
      variables.agreement = ['Totally', 'Absolutely', 'For sure', 'Definitely'][Math.floor(Math.random() * 4)];
      variables.follow_up = 'Tell me more!';
      variables.response = ['You\'re welcome', 'No problem', 'My pleasure', 'Happy to help'][Math.floor(Math.random() * 4)];
      variables.offer_more = 'Anything else?';
    }

    if (template.id.includes('technical')) {
      variables.solution = 'Here\'s the solution...';
      variables.best_practice = 'Best practice is to...';
    }

    if (template.id.includes('creative')) {
      variables.creative_response = 'Once upon a time...';
      variables.engagement = 'What happens next?';
    }

    // Replace variables in template
    for (const [key, value] of Object.entries(variables)) {
      response = response.replace(new RegExp(`{${key}}`, 'g'), value);
    }

    return response;
  }

  private getGreetingBack(input: string): string {
    const greetings: Record<string, string> = {
      'hi': 'Hi back!',
      'hello': 'Hello there!',
      'hey': 'Hey!',
      'yo': 'Yo!',
      'good morning': 'Good morning to you too!',
      'good evening': 'Good evening!',
      'good afternoon': 'Good afternoon!'
    };

    for (const [greeting, response] of Object.entries(greetings)) {
      if (input.toLowerCase().includes(greeting)) {
        return response;
      }
    }

    return 'Hey there!';
  }

  private extractExplanation(input: string): string {
    // Simple extraction - in real implementation, use NLP
    return 'This refers to...';
  }

  private extractAction(input: string): string {
    // Simple extraction - in real implementation, use NLP
    return 'accomplish this task';
  }

  async getBatchResponses(inputs: string[]): Promise<Map<string, FastResponse | null>> {
    const results = new Map<string, FastResponse | null>();

    // Process in parallel for maximum speed
    const promises = inputs.map(async (input) => {
      const response = await this.getFastResponse(input);
      return [input, response] as [string, FastResponse | null];
    });

    const batchResults = await Promise.all(promises);
    batchResults.forEach(([input, response]) => {
      results.set(input, response);
    });

    return results;
  }

  updateTemplate(category: string, templateId: string, updates: Partial<ResponseTemplate>): void {
    const templates = this.templates.get(category);
    if (!templates) return;

    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    Object.assign(template, updates);
  }

  addCustomTemplate(category: string, template: ResponseTemplate): void {
    this.addTemplate(category, template);
  }

  getTemplateStats(): { total: number; byCategory: Record<string, number> } {
    let total = 0;
    const byCategory: Record<string, number> = {};

    for (const [category, templates] of this.templates.entries()) {
      byCategory[category] = templates.length;
      total += templates.length;
    }

    return { total, byCategory };
  }
}