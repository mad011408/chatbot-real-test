"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { MessageCodeBlock } from "./message-codeblock";
import { CopyButton } from "@/components/ui/copy-button";

interface MessageContentRendererProps {
  content: string;
}

export function MessageContentRenderer({
  content,
}: MessageContentRendererProps) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none relative">
      <div className="absolute top-0 right-0">
        <CopyButton text={content} />
      </div>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const code = String(children).replace(/\n$/, "");

            return !inline && match ? (
              <MessageCodeBlock language={match[1]} code={code} />
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

