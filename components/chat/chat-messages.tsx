"use client";

import { Message } from "./message";
import { LoadingStates } from "@/components/messages/loading-states";
import { useChatStore } from "@/lib/store/chat-store";

interface ChatMessagesProps {
  messages: any[];
  isLoading: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const { activeTabId } = useChatStore();

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      {messages.map((message) => (
        <Message key={message.id} message={message} tabId={activeTabId || undefined} />
      ))}
      {isLoading && <LoadingStates />}
    </div>
  );
}

