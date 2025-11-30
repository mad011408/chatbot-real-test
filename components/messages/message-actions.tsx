"use client";

import { Button } from "@/components/ui/button";
import { RotateCcw, Trash2, Copy } from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";
import { toast } from "sonner";

interface MessageActionsProps {
  messageId: string;
  content: string;
  onResend?: () => void;
  onDelete?: () => void;
  showResend?: boolean;
  showDelete?: boolean;
}

export function MessageActions({
  messageId,
  content,
  onResend,
  onDelete,
  showResend = false,
  showDelete = false,
}: MessageActionsProps) {
  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <CopyButton text={content} className="h-7 w-7" />
      {showResend && onResend && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onResend}
          title="Resend"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      )}
      {showDelete && onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onDelete}
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}


