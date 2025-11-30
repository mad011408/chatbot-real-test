import { ChatMessage } from "@/types/chat-message";

export function buildPrompt(messages: ChatMessage[]): string {
  return messages
    .map((msg) => {
      const role = msg.role === "user" ? "User" : "Assistant";
      return `${role}: ${msg.content}`;
    })
    .join("\n\n");
}

export function buildSystemPrompt(instructions?: string): string {
  return instructions || "You are a helpful AI assistant.";
}


