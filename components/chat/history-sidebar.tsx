"use client";

import { useChatStore } from "@/lib/store/chat-store";
import { Button } from "@/components/ui/button";
import { Trash2, History } from "lucide-react";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

export function HistorySidebar() {
  const { history, loadFromHistory, deleteFromHistory } = useChatStore();

  return (
    <div className="w-64 border-r h-full flex flex-col">
      <div className="p-4 border-b flex items-center gap-2">
        <History className="h-4 w-4" />
        <h2 className="font-semibold">Chat History</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {history.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No chat history yet
            </div>
          ) : (
            history.map((chat) => (
              <div
                key={chat.id}
                className="group flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer"
                onClick={() => loadFromHistory(chat.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{chat.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(chat.updatedAt), "MMM d, HH:mm")}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFromHistory(chat.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}


