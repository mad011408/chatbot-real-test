"use client";

import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/lib/store/chat-store";
import { DEFAULT_MODEL_ID } from "@/lib/models/llm-list";

export function ChatTabs() {
  const { tabs, activeTabId, setActiveTab, closeTab, addTab } = useChatStore();

  const handleNewTab = () => {
    addTab(DEFAULT_MODEL_ID);
  };

  return (
    <div className="flex items-center gap-1 border-b overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`
            flex items-center gap-2 px-4 py-2 border-b-2 transition-colors cursor-pointer
            ${
              activeTabId === tab.id
                ? "border-primary bg-background"
                : "border-transparent hover:bg-muted"
            }
          `}
          onClick={() => setActiveTab(tab.id)}
        >
          <span className="text-sm whitespace-nowrap">{tab.title}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4"
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleNewTab}
        className="ml-2"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}


