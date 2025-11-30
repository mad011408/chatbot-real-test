"use client";

import { useState, useEffect } from "react";
import { useChat } from "ai/react";
import { ChatUI } from "@/components/chat/chat-ui";
import { ChatTabs } from "@/components/chat/chat-tabs";
import { HistorySidebar } from "@/components/chat/history-sidebar";
import { useChatStore } from "@/lib/store/chat-store";
import { DEFAULT_MODEL_ID } from "@/lib/models/llm-list";
import { useLocalStorage } from "@/lib/hooks/use-local-storage-state";
import { useCustomProvidersStore } from "@/lib/store/custom-providers-store";
import { Button } from "@/components/ui/button";
import { SidebarOpen } from "lucide-react";

export default function ChatPage() {
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [showHistory, setShowHistory] = useState(false);
  const [systemPrompt] = useLocalStorage(
    "systemPrompt",
    "You are a helpful AI assistant. Provide fast, accurate, and concise responses."
  );

  const {
    tabs,
    activeTabId,
    addTab,
    addMessage,
    updateTabTitle,
    saveToHistory,
  } = useChatStore();

  const { providers } = useCustomProvidersStore();

  // Initialize first tab if none exists
  useEffect(() => {
    if (tabs.length === 0) {
      addTab(DEFAULT_MODEL_ID);
    }
  }, [tabs.length, addTab]);

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  // Check if model belongs to a custom provider
  let customProvider;
  if (modelId.includes(":")) {
    const [providerId, modelName] = modelId.split(":");
    customProvider = providers.find((p) => p.id === providerId && p.models.includes(modelName));
  } else {
    customProvider = providers.find((p) => p.models.includes(modelId));
  }

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, stop } =
    useChat({
      api: "/api/chat",
      body: {
        modelId,
        systemPrompt,
        customProvider: customProvider || undefined,
      },
      onFinish: (message) => {
        if (activeTabId) {
          addMessage(activeTabId, {
            id: message.id,
            role: message.role as "user" | "assistant" | "system",
            content: message.content,
            timestamp: Date.now(),
          });

          // Update tab title from first user message
          if (activeTab?.messages.length === 0) {
            const firstUserMessage = activeTab.messages.find(
              (m) => m.role === "user"
            );
            if (firstUserMessage) {
              updateTabTitle(
                activeTabId,
                firstUserMessage.content.slice(0, 50) + "..."
              );
            }
          }

          // Save to history
          saveToHistory(activeTabId);
        }
      },
    });

  // Sync messages with active tab
  useEffect(() => {
    if (activeTab) {
      setMessages(activeTab.messages);
    }
  }, [activeTab, activeTabId, setMessages]);

  if (!activeTab) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-screen">
      {showHistory && <HistorySidebar />}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-2 p-2 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowHistory(!showHistory)}
          >
            <SidebarOpen className="h-4 w-4" />
          </Button>
          <ChatTabs />
        </div>
        <div className="flex-1 overflow-hidden">
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
      </div>
    </div>
  );
}
