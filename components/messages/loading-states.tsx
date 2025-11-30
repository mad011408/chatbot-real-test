"use client";

export function LoadingStates() {
  return (
    <div className="flex gap-4">
      <div className="flex-1 rounded-lg bg-muted p-4">
        <div className="text-sm font-semibold mb-2">Assistant</div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-current rounded-full animate-bounce" />
          <div className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:0.2s]" />
          <div className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:0.4s]" />
        </div>
      </div>
    </div>
  );
}


