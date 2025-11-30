"use client";

import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface MessageCodeBlockProps {
  language?: string;
  code: string;
  className?: string;
}

export function MessageCodeBlock({
  language = "text",
  code,
  className,
}: MessageCodeBlockProps) {
  const [highlightedCode, setHighlightedCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadHighlighting() {
      try {
        setIsLoading(true);
        // Call API route for syntax highlighting (server-side)
        const response = await fetch("/api/highlight", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code, language }),
        });

        if (!response.ok) {
          // If API fails, fallback to plain code
          throw new Error("Highlighting failed");
        }
        
        const data = await response.json();
        if (isMounted) {
          if (data.html) {
            setHighlightedCode(data.html);
          } else {
            // If no HTML returned, use plain code
            setHighlightedCode("");
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to highlight code:", error);
        // On error, show plain code (empty highlightedCode will trigger fallback)
        if (isMounted) {
          setHighlightedCode("");
          setIsLoading(false);
        }
      }
    }

    // Only load highlighting if code exists
    if (code && code.trim()) {
      loadHighlighting();
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [code, language]);

  return (
    <div className={cn("relative group my-4", className)}>
      <div className="flex items-center justify-between bg-muted px-4 py-2 rounded-t-lg border-b">
        <span className="text-xs text-muted-foreground font-mono">
          {language || "code"}
        </span>
        <CopyButton text={code} />
      </div>
      <div className="relative bg-muted rounded-b-lg overflow-hidden">
        {isLoading ? (
          <div className="relative">
            <pre className="bg-muted p-4 overflow-x-auto opacity-60">
              <code className="text-sm font-mono">{code}</code>
            </pre>
            <div className="absolute top-2 right-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-muted-foreground"></div>
            </div>
          </div>
        ) : highlightedCode ? (
          <div
            className="p-4 overflow-x-auto [&_pre]:!bg-transparent [&_pre]:!m-0 [&_pre]:!p-0 [&_pre]:overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        ) : (
          <pre className="bg-muted p-4 rounded-b-lg overflow-x-auto">
            <code className="text-sm font-mono">{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
