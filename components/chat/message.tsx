"use client";

import { MessageContentRenderer } from "@/components/messages/message-content-renderer";
import { MessageActions } from "@/components/messages/message-actions";
import { useChatStore } from "@/lib/store/chat-store";

interface MessageProps {
  message: {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
  };
  tabId?: string;
}

export function Message({ message, tabId }: MessageProps) {
  const isUser = message.role === "user";
  const { deleteMessage, resendMessage } = useChatStore();

  const handleDelete = () => {
    if (tabId) {
      deleteMessage(tabId, message.id);
    }
  };

  const handleResend = () => {
    if (tabId && isUser) {
      resendMessage(tabId, message.id);
    }
  };

  return (
    <div
      className={`flex gap-4 group ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      <div
        className={`flex-1 rounded-lg p-4 relative ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">
            {isUser ? "You" : "Assistant"}
          </div>
          <MessageActions
            messageId={message.id}
            content={message.content}
            onResend={isUser ? handleResend : undefined}
            onDelete={handleDelete}
            showResend={isUser}
            showDelete={true}
          />
        </div>
        <MessageContentRenderer content={message.content} />
      </div>
    </div>
  );
}

