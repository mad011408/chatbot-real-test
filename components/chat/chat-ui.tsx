"use client";

import Link from "next/link";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { ModelSelect } from "@/components/models/model-select";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { LLM_MODELS } from "@/lib/models/llm-list";
import { useCustomProvidersStore } from "@/lib/store/custom-providers-store";

interface ChatUIProps {
  messages: any[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  stop?: () => void;
  modelId: string;
  setModelId: (modelId: string) => void;
}

export function ChatUI({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  stop,
  modelId,
  setModelId,
}: ChatUIProps) {
  const { providers } = useCustomProvidersStore();

  // Combine default models with custom provider models
  const allModels = [
    ...LLM_MODELS,
    ...providers.flatMap((provider) =>
      provider.models.map((modelName) => ({
        id: `${provider.id}:${modelName}`,
        name: `${modelName} (${provider.name})`,
        provider: provider.id,
        contextWindow: 128000,
        supportsImages: false,
        supportsTools: true,
        maxTokens: 16384,
      }))
    ),
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <h1 className="text-2xl font-bold">Chat</h1>
          <div className="flex items-center gap-2">
            <ModelSelect
              models={allModels}
              value={modelId}
              onValueChange={setModelId}
            />
            <Link href="/settings">
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ChatMessages messages={messages} isLoading={isLoading} />
      </div>
      <div className="border-t p-4">
        <ChatInput
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
          stop={stop}
        />
      </div>
    </div>
  );
}

