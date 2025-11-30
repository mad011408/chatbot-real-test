import { NextRequest, NextResponse } from "next/server";
import { codeToHtml } from "shiki";

export const runtime = "nodejs";
export const maxDuration = 10; // 10 seconds for fast highlighting

// Helper function to escape HTML
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(req: NextRequest) {
  let bodyText = "";
  let code = "";
  let language = "text";

  try {
    // Check if request has body
    const contentType = req.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 }
      );
    }

    // Read body as text first to handle empty/malformed JSON
    bodyText = await req.text();
    
    if (!bodyText || bodyText.trim() === "") {
      return NextResponse.json(
        { error: "Request body is required" },
        { status: 400 }
      );
    }

    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    code = body.code || "";
    language = body.language || "text";

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Code is required and must be a string" },
        { status: 400 }
      );
    }

    // Fast syntax highlighting with Shiki
    try {
      const html = await codeToHtml(code, {
        lang: language,
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
      });

      return NextResponse.json({ html });
    } catch (highlightError) {
      console.error("Shiki highlighting error:", highlightError);
      // Fallback to plain code if highlighting fails
      const escapedCode = escapeHtml(code);
      return NextResponse.json({
        html: `<pre><code>${escapedCode}</code></pre>`,
      });
    }
  } catch (error: unknown) {
    console.error("Syntax highlighting error:", error);
    
    // Fallback: return plain code without highlighting
    if (code) {
      const escapedCode = escapeHtml(code);
      return NextResponse.json({
        html: `<pre><code>${escapedCode}</code></pre>`,
      });
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { 
        error: "Failed to highlight code",
        message: errorMessage,
        html: null
      },
      { status: 500 }
    );
  }
}

