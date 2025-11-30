"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Scissors } from "lucide-react";
import { toast } from "sonner";

interface CopyButtonProps {
  text: string;
  className?: string;
  mode?: "copy" | "cut";
}

export function CopyButton({ text, className, mode = "copy" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (mode === "cut") {
        await navigator.clipboard.writeText(text);
        toast.success("Cut to clipboard!");
      } else {
        await navigator.clipboard.writeText(text);
        // Removed toast success message for copy
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error(`Failed to ${mode}`);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={`h-8 w-8 ${className}`}
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : mode === "cut" ? (
        <Scissors className="h-4 w-4" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
}


