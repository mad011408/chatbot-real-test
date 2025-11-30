export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: Date;
  modelId?: string;
  images?: string[];
  citations?: Citation[];
}

export interface Citation {
  id: string;
  source: string;
  text: string;
  url?: string;
}


