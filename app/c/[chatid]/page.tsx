"use client";

import { use, useState } from "react";
import { ChatUI } from "@/components/chat/chat-ui";
import { useChat } from "ai/react";
import { DEFAULT_MODEL_ID } from "@/lib/models/llm-list";

export default function ChatPage({
  params,
}: {
  params: Promise<{ chatid: string }>;
}) {
  const { chatid } = use(params);
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);

  const { messages, input, handleInputChange, handleSubmit, isLoading, stop } =
    useChat({
      api: "/api/chat",
      body: {
        modelId,
        chatId: chatid,
      },
    });

  return (
    <div className="flex h-screen flex-col">
      <ChatUI
        messages={messages}
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
        stop={stop}
        modelId={modelId}
        setModelId={setModelId}
      />
    </div>
  );
}

