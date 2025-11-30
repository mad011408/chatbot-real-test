import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { getModelProvider } from "@/lib/ai/providers";
import { DEFAULT_MODEL_ID } from "@/lib/models/llm-list";
import { handleError } from "@/lib/errors";
import { webSearchTool } from "@/lib/ai/tools/web-search";

export const runtime = "edge";
export const maxDuration = 300; // 5 minutes timeout for edge

export async function POST(req: NextRequest) {
  try {
    const { messages, modelId = DEFAULT_MODEL_ID, systemPrompt, customProvider, enableWebSearch = true } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages must be an array" },
        { status: 400 }
      );
    }

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "At least one message is required" },
        { status: 400 }
      );
    }

    // Extract actual model ID if it's from custom provider
    let actualModelId = modelId;
    if (customProvider && modelId.includes(":")) {
      actualModelId = modelId.split(":")[1];
    }
    
    const model = getModelProvider(actualModelId, customProvider);

    // Ultra-fast optimized system prompt with plain text and line-by-line output
    const enhancedSystemPrompt = systemPrompt || `You are an ultra-fast AI assistant optimized for maximum speed (10000+ tokens/second).

CRITICAL SPEED INSTRUCTIONS:
1. ULTRA-FAST RESPONSES: Generate responses at extreme speed. Think and output simultaneously. No delays. No unnecessary words. Be direct and concise.

2. PLAIN TEXT FORMAT: Write all responses in plain text. Use simple, clear language. Avoid complex formatting. For code, use plain text with basic indentation.

3. LINE-BY-LINE OUTPUT: Output content line by line as you think. Start responding immediately. Stream your thoughts continuously without pausing.

4. NO MARKDOWN EXCEPT CODE BLOCKS: Only use markdown for code blocks when absolutely necessary. Everything else should be plain text.

5. INSTANT START: Begin your response immediately. No greeting unless necessary. Go straight to the answer.

6. CONTINUOUS STREAM: Keep the output flowing continuously. Avoid any pauses or breaks in the stream.

7. PRIORITIZE SPEED OVER PERFECTION: Fast, helpful responses are better than slow, perfect ones.

Remember: Your goal is to provide information as fast as possible while maintaining quality.`;

    // Prepare messages with system prompt
    const messagesWithSystem = [
      { role: "system" as const, content: enhancedSystemPrompt },
      ...messages,
    ];

    // Ultra-optimized settings for maximum speed (10000+ tokens/second)
    const result = await streamText({
      model,
      messages: messagesWithSystem,
      tools: enableWebSearch ? { webSearch: webSearchTool } : undefined,
      maxTokens: 100000, // Maximum tokens for longer responses
      temperature: 0.1, // Very low for deterministic, fast responses
      topP: 0.9, // Optimized for fast token selection
      frequencyPenalty: 0,
      presencePenalty: 0,
    });

    return result.toDataStreamResponse();
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    const { message, statusCode } = handleError(error);
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
