import { ChatMessage } from "./chat-message";

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  modelId?: string;
}


