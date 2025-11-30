import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface ChatTab {
  id: string;
  title: string;
  messages: ChatMessage[];
  modelId: string;
  createdAt: number;
  updatedAt: number;
}

interface ChatStore {
  tabs: ChatTab[];
  activeTabId: string | null;
  history: ChatTab[];
  addTab: (modelId: string) => string;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  addMessage: (tabId: string, message: ChatMessage) => void;
  updateMessage: (tabId: string, messageId: string, content: string) => void;
  deleteMessage: (tabId: string, messageId: string) => void;
  resendMessage: (tabId: string, messageId: string) => void;
  updateTabTitle: (tabId: string, title: string) => void;
  saveToHistory: (tabId: string) => void;
  loadFromHistory: (tabId: string) => void;
  deleteFromHistory: (tabId: string) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      tabs: [],
      activeTabId: null,
      history: [],

      addTab: (modelId: string) => {
        const newTab: ChatTab = {
          id: `tab-${Date.now()}`,
          title: "New Chat",
          messages: [],
          modelId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: newTab.id,
        }));
        return newTab.id;
      },

      closeTab: (tabId: string) => {
        set((state) => {
          const newTabs = state.tabs.filter((tab) => tab.id !== tabId);
          const newActiveTabId =
            state.activeTabId === tabId
              ? newTabs.length > 0
                ? newTabs[newTabs.length - 1].id
                : null
              : state.activeTabId;
          return {
            tabs: newTabs,
            activeTabId: newActiveTabId,
          };
        });
      },

      setActiveTab: (tabId: string) => {
        set({ activeTabId: tabId });
      },

      addMessage: (tabId: string, message: ChatMessage) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId
              ? {
                  ...tab,
                  messages: [...tab.messages, message],
                  updatedAt: Date.now(),
                }
              : tab
          ),
        }));
      },

      updateMessage: (tabId: string, messageId: string, content: string) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId
              ? {
                  ...tab,
                  messages: tab.messages.map((msg) =>
                    msg.id === messageId ? { ...msg, content } : msg
                  ),
                  updatedAt: Date.now(),
                }
              : tab
          ),
        }));
      },

      deleteMessage: (tabId: string, messageId: string) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId
              ? {
                  ...tab,
                  messages: tab.messages.filter((msg) => msg.id !== messageId),
                  updatedAt: Date.now(),
                }
              : tab
          ),
        }));
      },

      resendMessage: (tabId: string, messageId: string) => {
        // This will be handled by the chat component
      },

      updateTabTitle: (tabId: string, title: string) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId ? { ...tab, title, updatedAt: Date.now() } : tab
          ),
        }));
      },

      saveToHistory: (tabId: string) => {
        set((state) => {
          const tab = state.tabs.find((t) => t.id === tabId);
          if (!tab) return state;

          const existingIndex = state.history.findIndex((h) => h.id === tabId);
          const updatedHistory = existingIndex >= 0
            ? state.history.map((h, i) => (i === existingIndex ? tab : h))
            : [...state.history, tab];

          return {
            history: updatedHistory.slice(0, 100), // Keep last 100 chats
          };
        });
      },

      loadFromHistory: (tabId: string) => {
        set((state) => {
          const historyItem = state.history.find((h) => h.id === tabId);
          if (!historyItem) return state;

          const exists = state.tabs.some((t) => t.id === tabId);
          if (exists) {
            return { activeTabId: tabId };
          }

          return {
            tabs: [...state.tabs, { ...historyItem }],
            activeTabId: tabId,
          };
        });
      },

      deleteFromHistory: (tabId: string) => {
        set((state) => ({
          history: state.history.filter((h) => h.id !== tabId),
        }));
      },
    }),
    {
      name: "chat-storage",
    }
  )
);


